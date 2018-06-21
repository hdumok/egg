'use strict';

const fs = require('fs');
const path = require('path');

/**
 * The configuration of egg application, can be access by `app.config`
 * @class Config
 * @since 1.0.0
 */

module.exports = appInfo => {

  const config = {

    env: appInfo.env,

    name: appInfo.name,

    keys: '',

    proxy: false,

    protocolHeaders: 'x-forwarded-proto',

    ipHeaders: 'x-forwarded-for',

    hostHeaders: '',

    pkg: appInfo.pkg,

    // "baseDir": "/Users/mok/Desktop/x-verify",
    // "HOME": "/Users/mok",
    // "rundir": "/Users/mok/Desktop/x-verify/run",
    baseDir: appInfo.baseDir,

    HOME: appInfo.HOME,

    rundir: path.join(appInfo.baseDir, 'run'),

    dump: {
      ignore: new Set([
        'pass', 'pwd', 'passd', 'passwd', 'password', 'keys', 'masterKey', 'accessKey',
        // ignore any key contains "secret" keyword
        /secret/i,
      ]),
    },

    confusedConfigurations: {
      bodyparser: 'bodyParser',
      notFound: 'notfound',
      sitefile: 'siteFile',
      middlewares: 'middleware',
      httpClient: 'httpclient',
    },
  };

  config.notfound = {
    pageUrl: '',
  };

  config.siteFile = {
    '/favicon.ico': fs.readFileSync(path.join(__dirname, 'favicon.png')),
  };

  config.bodyParser = {
    enable: true,
    encoding: 'utf8',
    formLimit: '100kb',
    jsonLimit: '100kb',
    strict: true,
    // @see https://github.com/hapijs/qs/blob/master/lib/parse.js#L8 for more options
    queryString: {
      arrayLimit: 100,
      depth: 5,
      parameterLimit: 1000,
    },
  };

  config.logger = {
    dir: path.join(appInfo.root, 'logs', appInfo.name),
    encoding: 'utf8',
    env: appInfo.env,
    level: 'INFO',
    consoleLevel: 'INFO',
    disableConsoleAfterReady: appInfo.env !== 'local' && appInfo.env !== 'unittest',
    outputJSON: false,
    buffer: true,
    appLogName: `${appInfo.name}-web.log`,
    coreLogName: 'egg-web.log',
    agentLogName: 'egg-agent.log',
    errorLogName: 'common-error.log',
    coreLogger: {},
    allowDebugAtProd: false,
  };

  config.httpclient = {
    enableDNSCache: false,
    dnsCacheMaxLength: 1000,
    dnsCacheMaxAge: 10000,

    request: {
      timeout: 5000,
    },
    httpAgent: {
      keepAlive: true,
      freeSocketKeepAliveTimeout: 4000,
      maxSockets: Number.MAX_SAFE_INTEGER,
      maxFreeSockets: 256,
    },
    httpsAgent: {
      keepAlive: true,
      freeSocketKeepAliveTimeout: 4000,
      maxSockets: Number.MAX_SAFE_INTEGER,
      maxFreeSockets: 256,
    },
  };

  /**
   * The option of `meta` middleware
   *
   * @member Config#meta
   * @property {Boolean} enable - enable meta or not, default is true
   * @property {Boolean} logging - enable logging start request, default is false
   */
  config.meta = {
    enable: true,
    logging: false,
  };

  /**
   * core enable middlewares
   * @member {Array} Config#middleware
   */
  config.coreMiddleware = [
    'meta',
    'siteFile',
    'notfound',
    'bodyParser',
    'overrideMethod',
  ];

  config.workerStartTimeout = 10 * 60 * 1000;

  config.cluster = {
    listen: {
      path: '',
      port: 7001,
      hostname: '',
    },
  };

  /**
   * @property {Number} responseTimeout - response timeout, default is 60000
   */
  config.clusterClient = {
    maxWaitTime: 60000,
    responseTimeout: 60000,
  };

  config.onClientError = null;

  return config;
};
