'use strict';

module.exports = {
  // enable plugins

  onerror: {
    enable: true,
    package: 'egg-onerror',
  },

  session: {
    enable: true,
    package: 'egg-session',
  },

  /**
   * i18n
   * @member {Object} Plugin#i18n
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  i18n: {
    enable: true,
    package: 'egg-i18n',
  },

  watcher: {
    enable: true,
    package: 'egg-watcher',
  },

  multipart: {
    enable: true,
    package: 'egg-multipart',
  },

  security: {
    enable: true,
    package: 'egg-security',
  },

  development: {
    enable: true,
    package: 'egg-development',
  },

  /**
   * logger file rotator
   * @member {Object} Plugin#logrotator
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  logrotator: {
    enable: true,
    package: 'egg-logrotator',
  },

  schedule: {
    enable: true,
    package: 'egg-schedule',
  },

  static: {
    enable: true,
    package: 'egg-static',
  },

  jsonp: {
    enable: true,
    package: 'egg-jsonp',
  },

  view: {
    enable: true,
    package: 'egg-view',
  },
};
