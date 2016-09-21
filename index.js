'use strict';

//dependencies
const path = require('path');
const _ = require('lodash');
const wallet = require(path.join(__dirname, 'src', 'wallet'));

exports = module.exports = function (options) {
  //merge options
  wallet.defaults = _.merge({}, wallet.defaults, options);

  //initialize
  wallet.init();

  //export
  return wallet;
};