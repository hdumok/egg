'use strict';

/**
 * @namespace Egg
 */

exports.startCluster = require('egg-cluster').startCluster;

/**
 * @member {Application} Egg#Application
 * @since 1.0.0
 */
exports.Application = require('./lib/application');

/**
 * @member {Agent} Egg#Agent
 * @since 1.0.0
 */
exports.Agent = require('./lib/agent');


exports.AppWorkerLoader = require('./lib/loader').AppWorkerLoader;
exports.AgentWorkerLoader = require('./lib/loader').AgentWorkerLoader;

/**
 * 4个都是基础基类???
 */
exports.Controller = require('./lib/core/base_context_class');
exports.Service = require('./lib/core/base_context_class');
exports.Subscription = require('./lib/core/base_context_class');
exports.BaseContextClass = require('./lib/core/base_context_class');
