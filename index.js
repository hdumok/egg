'use strict';

/**
 * @namespace Egg
 */

//脚本就是调用了这个
exports.startCluster = require('egg-cluster').startCluster;

exports.Application = require('./application');

exports.Agent = require('./agent');

exports.AppWorkerLoader = require('./loader').AppWorkerLoader;
exports.AgentWorkerLoader = require('./loader').AgentWorkerLoader;

/**
 * 4个都是基础基类
 * 继承 require('egg-core').BaseContextClass
 */
exports.Controller = require('./core/base_context_class');
exports.Service = require('./core/base_context_class');
exports.Subscription = require('./core/base_context_class');
exports.BaseContextClass = require('./core/base_context_class');
