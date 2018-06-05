'use strict';

const path = require('path');
const fs = require('fs');
const ms = require('ms');

const EggCore = require('egg-core').EggCore;

const cluster = require('cluster-client');
const extend = require('extend2');
const ContextLogger = require('egg-logger').EggContextLogger;
const ContextCookies = require('egg-cookies');
const CircularJSON = require('circular-json');
const ContextHttpClient = require('./core/context_httpclient');
const Messenger = require('./core/messenger');
const DNSCacheHttpClient = require('./core/dnscache_httpclient');
const HttpClient = require('./core/httpclient');
const createLoggers = require('./core/logger');
const Singleton = require('./core/singleton');
const utils = require('./core/utils');
const BaseContextClass = require('./core/base_context_class');

const HTTPCLIENT = Symbol('EggApplication#httpclient');
const LOGGERS = Symbol('EggApplication#loggers');
const EGG_PATH = Symbol.for('egg#eggPath');
const CLUSTER_CLIENTS = Symbol.for('egg#clusterClients');

/**
 * 基础的蛋
 */
class EggApplication extends EggCore {

  /**
   * @constructor
   * @param {Object} options
   *  - {Object} [type] - type of instance, Agent and Application both extend koa, type can determine what it is.
   *  - {String} [baseDir] - app root dir, default is `process.cwd()`
   *  - {Object} [plugins] - custom plugin config, use it in unittest
   */
  constructor(options) {
    super(options);

    // export context base classes, let framework can impl sub class and over context extend easily.
    this.ContextCookies = ContextCookies;
    this.ContextLogger = ContextLogger;

    //最最最关键基类，主要Controller Service的基类？？？
    this.ContextHttpClient = ContextHttpClient;

    // 这个很有用
    this.HttpClient = HttpClient;

    this.loader.loadConfig();

    this.messenger = new Messenger();

    // 我的启动完成，就是配置的落地完成
    this.ready(() => process.nextTick(() => {
      const dumpStartTime = Date.now();
      this.dumpConfig();
      this.dumpTiming();
      this.coreLogger.info('[egg:core] dump config after ready, %s', ms(Date.now() - dumpStartTime));
    }));


    this._setupTimeoutTimer();

    this.console.info('[egg:core] App root: %s', this.baseDir);
    this.console.info('[egg:core] All *.log files save on %j', this.config.logger.dir);
    this.console.info('[egg:core] Loaded enabled plugin %j', this.loader.orderPlugins);

    // 未自己增加异常处理
    this._unhandledRejectionHandler = this._unhandledRejectionHandler.bind(this);
    process.on('unhandledRejection', this._unhandledRejectionHandler);

    this[CLUSTER_CLIENTS] = [];

    /**
     * Wrap the Client with Leader/Follower Pattern
     *
     * @description almost the same as Agent.cluster API, the only different is that this method create Follower.
     *
     * @see https://github.com/node-modules/cluster-client
     * @param {Function} clientClass - client class function
     * @param {Object} [options]
     *   - {Boolean} [autoGenerate] - whether generate delegate rule automatically, default is true
     *   - {Function} [formatKey] - a method to tranform the subscription info into a string，default is JSON.stringify
     *   - {Object} [transcode|JSON.stringify/parse]
     *     - {Function} encode - custom serialize method
     *     - {Function} decode - custom deserialize method
     *   - {Boolean} [isBroadcast] - whether broadcast subscrption result to all followers or just one, default is true
     *   - {Number} [responseTimeout] - response timeout, default is 3 seconds
     *   - {Number} [maxWaitTime|30000] - leader startup max time, default is 30 seconds
     * @return {ClientWrapper} wrapper
     */
    this.cluster = (clientClass, options) => {
      options = Object.assign({}, this.config.clusterClient, options, {
        // cluster need a port that can't conflict on the environment
        port: this.options.clusterPort,
        // agent worker is leader, app workers are follower
        isLeader: this.type === 'agent',
        logger: this.coreLogger,
      });

      //建立子进程对象，还没有创建进程
      const client = cluster(clientClass, options);

      //内部 在 子进程对象想要创建子进程实例的时候，添加一些跟我的关联记录和 我close关闭进程的操作
      this._patchClusterClient(client);

      return client;
    };

    // register close function
    this.beforeClose(() => {
      for (const logger of this.loggers.values()) {
        logger.close(); //日志流关闭
      }
      this.messenger.close();  //消息通道关闭
      process.removeListener('unhandledRejection', this._unhandledRejectionHandler);
    });

    this.BaseContextClass = BaseContextClass;
    this.Controller = BaseContextClass;
    this.Service = BaseContextClass;
  }

  /**
   * print the infomation when console.log(app)
   * @return {Object} inspected app.
   * @since 1.0.0
   * @example
   * ```js
   * console.log(app);
   * =>
   * {
   *   name: 'mockapp',
   *   env: 'test',
   *   subdomainOffset: 2,
   *   config: '<egg config>',
   *   controller: '<egg controller>',
   *   service: '<egg service>',
   *   middlewares: '<egg middlewares>',
   *   urllib: '<egg urllib>',
   *   loggers: '<egg loggers>'
   * }
   * ```
   */
  inspect() {
    const res = {
      env: this.config.env,
    };

    function delegate(res, app, keys) {
      for (const key of keys) {
        /* istanbul ignore else */
        if (app[key]) {
          res[key] = app[key];
        }
      }
    }

    function abbr(res, app, keys) {
      for (const key of keys) {
        /* istanbul ignore else */
        if (app[key]) {
          res[key] = `<egg ${key}>`;
        }
      }
    }

    delegate(res, this, [
      'name',
      'baseDir',
      'subdomainOffset',
    ]);

    abbr(res, this, [
      'config',
      'controller',
      'httpclient',
      'loggers',
      'middlewares',
      'router',
      'serviceClasses',
    ]);

    return res;
  }

  toJSON() {
    return this.inspect();
  }

  /**
   *  app.curl('http://example.com/foo.json')
   */
  curl(url, opts) {
    return this.httpclient.request(url, opts);
  }

  get httpclient() {
    if (!this[HTTPCLIENT]) {
      if (this.config.httpclient.enableDNSCache) {
        this[HTTPCLIENT] = new DNSCacheHttpClient(this);
      } else {
        this[HTTPCLIENT] = new this.HttpClient(this);
      }
    }
    return this[HTTPCLIENT];
  }

  /**
   *  All loggers contain logger, coreLogger and customLogger
   */
  get loggers() {
    if (!this[LOGGERS]) {
      this[LOGGERS] = createLoggers(this);
    }
    return this[LOGGERS];
  }

  getLogger(name) {
    return this.loggers[name] || null;
  }

  get logger() {
    return this.getLogger('logger');
  }

  /**
   * core logger for framework and plugins, log file is `$HOME/logs/{appname}/egg-web`
   * @member {Logger}
   * @since 1.0.0
   */
  get coreLogger() {
    return this.getLogger('coreLogger');
  }

  _unhandledRejectionHandler(err) {
    if (!(err instanceof Error)) {
      const newError = new Error(String(err));
      // err maybe an object, try to copy the name, message and stack to the new error instance
      /* istanbul ignore else */
      if (err) {
        if (err.name) newError.name = err.name;
        if (err.message) newError.message = err.message;
        if (err.stack) newError.stack = err.stack;
      }
      err = newError;
    }
    /* istanbul ignore else */
    if (err.name === 'Error') {
      err.name = 'unhandledRejectionError';
    }
    this.coreLogger.error(err);
  }

  /**
   * 存储配置到运行时目录
   * save app.config to `run/${type}_config.json`
   */
  dumpConfig() {
    const rundir = this.config.rundir;
    let ignoreList;
    try {
      // support array and set
      ignoreList = Array.from(this.config.dump.ignore); //可以重复元素的数组
    } catch (_) {
      ignoreList = [];
    }

    try {
      /* istanbul ignore if */
      if (!fs.existsSync(rundir)) fs.mkdirSync(rundir);

      // dump config
      const json = extend(true, {}, {
        config: this.config,
        plugins: this.plugins
      });

      //清除对象里的某些key的元素
      utils.convertObject(json, ignoreList);

      const dumpFile = path.join(rundir, `${this.type}_config.json`);
      fs.writeFileSync(dumpFile, CircularJSON.stringify(json, null, 2));

      // dump config meta
      const dumpMetaFile = path.join(rundir, `${this.type}_config_meta.json`);
      fs.writeFileSync(dumpMetaFile, CircularJSON.stringify(this.loader.configMeta, null, 2));
    } catch (err) {
      this.coreLogger.warn(`dumpConfig error: ${err.message}`);
    }
  }

  dumpTiming() {
    try {
      const json = this.timing.toJSON();
      const rundir = this.config.rundir;
      const dumpFile = path.join(rundir, `${this.type}_timing_${process.pid}.json`);
      fs.writeFileSync(dumpFile, CircularJSON.stringify(json, null, 2));
    } catch (err) {
      this.coreLogger.warn(`dumpTiming error: ${err.message}`);
    }
  }

  get [EGG_PATH]() {
    return path.join(__dirname, '..');
  }

  //子进程的启动超时判断定时器
  _setupTimeoutTimer() {
    const startTimeoutTimer = setTimeout(() => {
      this.coreLogger.error(`${this.type} still doesn't ready after ${this.config.workerStartTimeout} ms.`);
      this.emit('startTimeout');
    }, this.config.workerStartTimeout);
    this.ready(() => clearTimeout(startTimeoutTimer));
  }

  /**
   * 不要用 app.env, 用 app.config.env
   */
  get env() {
    this.deprecate('please use app.config.env instead');
    return this.config.env;
  }
  /* eslint要求get set一对*/
  set env(_) {}

  get proxy() {
    this.deprecate('please use app.config.proxy instead');
    return this.config.proxy;
  }
  /* eslint no-empty-function: off */
  set proxy(_) {}

  /**
   * create a singleton instance
   * @param {String} name - unique name for singleton
   * @param {Function|AsyncFunction} create - method will be invoked when singleton instance create
   */
  addSingleton(name, create) {
    const options = {};
    options.name = name;
    options.create = create;
    options.app = this;
    const singleton = new Singleton(options);
    const initPromise = singleton.init();
    if (initPromise) {
      this.beforeStart(async () => {
        await initPromise;
      });
    }
  }

  _patchClusterClient(client) {
    const create = client.create;
    client.create = (...args) => {
      const realClient = create.apply(client, args);

      //如果我退出，关闭子进程
      this[CLUSTER_CLIENTS].push(realClient);
      this.beforeClose(() => cluster.close(realClient));
      return realClient;
    };
  }
}

module.exports = EggApplication;
