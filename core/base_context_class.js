'use strict';

const EggCoreBaseContextClass = require('egg-core').BaseContextClass;
const BaseContextLogger = require('./base_context_logger');

const LOGGER = Symbol('BaseContextClass#logger');

/**
 * 这是最重要的类
 */
class BaseContextClass extends EggCoreBaseContextClass {
  get logger() {
    if (!this[LOGGER]) this[LOGGER] = new BaseContextLogger(this.ctx, this.pathName);
    return this[LOGGER];
  }
}

module.exports = BaseContextClass;
