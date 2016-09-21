'use strict';


/**
 * @module
 * @copyright paywell Team at byteskode <www.byteskode.com>
 * @description virtual wallet for paywell
 * @since 0.1.0
 * @author lally elias<lallyelias87@gmail.com, lally.elias@byteskode.com>
 * @singleton
 * @public
 */

//TODO make use of event emitter

//dependencies
const _ = require('lodash');
const async = require('async');
const redis = require('paywell-redis');
const phone = require('phone');
const shortid = require('shortid');
// const uuid = require('uuid');
const warlock = require('node-redis-warlock');
// const kue = require('kue');

//TODO add error codes

//default receipt options
const defaults = {
  prefix: 'paywell',
  redis: {},
  collection: 'wallets',
  queue: 'wallets',
  country: 'TZ',
  shortid: {
    worker: 1,
    seed: 999
  },
  warlock: {
    ttl: 10000
  }
};


/**
 * @name defaults
 * @description default options/settings
 * @type {Object}
 * @private
 * @since 0.1.0
 */
exports.defaults = _.merge({}, defaults);


/**
 * @function
 * @name init
 * @description initialize receipt internals
 * @since 0.1.0
 * @public
 */
exports.init = function () {

  //initialize redis client
  if (!exports.redis) {
    exports.redis = redis(exports.defaults);
  }

  //initialize warlock
  if (!exports.warlock) {
    exports.warlock = warlock(exports.redis.client());
  }

  //initialize shortid
  shortid.worker(exports.defaults.shortid.worker);
  shortid.seed(exports.defaults.shortid.seed);

};


/**
 * @function
 * @name deserialize
 * @description traverse wallet and try convert values to their respective
 *              js type i.e numbers etc
 * @param  {Object} wallet valid wallet
 * @return {Object}        object with all nodes converted to their respective
 *                         js types
 *
 * @since 0.3.0
 * @private
 */
exports.deserialize = function (wallet) {

  //ensure wallet
  wallet = _.merge({}, wallet);

  //convert dates
  wallet = _.merge({}, wallet, {
    createdAt: wallet.createdAt ? new Date(wallet.createdAt) : undefined,
    updatedAt: wallet.updatedAt ? new Date(wallet.updatedAt) : undefined,
    verifiedAt: wallet.verifiedAt ? new Date(wallet.verifiedAt) : undefined,
    activatedAt: wallet.activatedAt ? new Date(wallet.activatedAt) : undefined,
  });

  return wallet;
};


/**
 * @function
 * @name toE164
 * @description convert phone number to E.164 format
 * @param  {String} phoneNumber valid phone number
 * @param  {Object} [options] convertion options
 * @param  {String} [options.country] valid alpha2 country code. default to
 *                                    TZS(Tanzania)
 * @param  {Function} done a callback to invoke on success or failure
 * @return {String}             phone number in E.164 format or null
 * @since 0.1.0
 * @public
 * @see {@link https://en.wikipedia.org/wiki/E.164|E.164}
 */
exports.toE164 = function (phoneNumber, options, done) {
  //normalize arguments
  if (options && _.isFunction(options)) {
    done = options;
    options = {};
  }

  //ensure options
  options = _.merge({}, {
    country: exports.defaults.country
  }, options);

  //convert number to E.164
  try {
    const parts = phone(phoneNumber, options.country);
    const isValidPhoneNumber = !parts || parts.length !== 0;

    //return number
    if (isValidPhoneNumber) {
      done(null, parts[0]);
    }

    //throw exception
    else {
      let error = new Error('Invalid Phone Number ' + phoneNumber);
      error.status = 400;
      done(error);
    }
  } catch (error) {
    done(error);
  }

};


/**
 * @function
 * @name key
 * @description generate wallet redis storage key
 * @param  {String} phoneNumber valid phone number
 * @param  {Function} done a callback to invoke on success or failure
 * @return {String}             wallet redis storage key or null
 * @since 0.1.0
 * @public
 */
exports.key = function (phoneNumber, done) {
  async.waterfall([

    function toE164(next) {
      exports.toE164(phoneNumber, next);
    },

    function generateWalletKey(_phoneNumber, next) {
      //replace leading + in e.164 phone number
      _phoneNumber = _phoneNumber.replace('+', '');
      //generate redis storage key
      const key = exports.redis.key(
        exports.defaults.collection,
        _phoneNumber
      );
      next(null, key);
    }
  ], function (error, _phoneNumber) {
    done(error, _phoneNumber);
  });
};


/**
 * @function
 * @name shortid
 * @description generate unique shortid to be used for wallet pin and paycode
 * @param  {Function} done a callback to invoke on success or failure
 * @return {String|Error}             shortid or error
 * @since 0.1.0
 * @public
 */
exports.shortid = function (done) {
  try {
    const pin = [shortid.generate(), shortid.generate()]
      .join('')
      .replace(/-|_/g, '')
      .substr(0, 8)
      .toUpperCase();
    done(null, pin);
  } catch (error) {
    done(error);
  }
};


/**
 * @function
 * @name lock
 * @description lock a wallet for specific ttl
 * @param  {String}   phoneNumber valid phone number
 * @param  {Object}   [options]     lock options
 * @param  {Number}   [options.ttl] lock ttl
 * @param  {Function} done a callback to invoke on success or failure
 * @return {Function|Error}               unlock fuction or error
 * @since 0.1.0
 * @public
 */
exports.lock = function (phoneNumber, options, done) {
  //normalize arguments
  if (options && _.isFunction(options)) {
    done = options;
    options = {};
  }

  //ensure options
  options = _.merge({}, {
    ttl: exports.defaults.warlock.ttl
  }, options);

  async.waterfall([

    function generateKey(next) {
      exports.key(phoneNumber, next);
    },

    function obtainWalletLock(key, next) {
      exports.warlock.lock(key, options.ttl, function (error, unlock) {
        //ensure lock
        if (!error && !_.isFunction(unlock)) {
          error = new Error('Missing Wallet Lock');
          error.status = 400;
          //ensure lock was not set
          unlock = undefined;
          //TODO set error code
        }
        next(error, unlock);
      });
    }

  ], function (error, unlock) {
    done(error, unlock);
  });
};


/**
 * @function
 * @name get
 * @description get wallet(s)
 * @param  {String,String[]}   phoneNumber valid wallet phone number(s)
 * @param  {Function} done a callback to invoke on success or failure
 * @return {Object|Object[]}        collection or single wallets
 * @since 0.1.0
 * @public
 */
exports.get = function (phoneNumber, done) {

  //get specific wallet(s)
  const client = exports.redis;

  async.waterfall([

    function ensureWalletKey(next) {
      //prepare phone numbers collection
      let keys = [].concat(phoneNumber);
      //convert wallet phone numbers to wallet keys
      keys = _.map(keys, function (_phoneNumber) {
        return function (then) {
          exports.key(_phoneNumber, then);
        };
      });
      async.parallel(keys, next);
    },

    function getWallet(keys, next) {
      console.log(keys);
      client.hash.get(keys, next);
    },

    function deserializeWallet(wallets, next) {

      //deserialize wallets
      if (_.isArray(wallets)) {
        wallets = _.map(wallets, function (wallet) {
          wallet = exports.deserialize(wallet);
          return wallet;
        });
      }

      //deserialize wallet
      else {
        wallets = exports.deserialize(wallets);
      }

      next(null, wallets);
    }
  ], function (error, wallets) {
    done(error, wallets);
  });

};


/**
 * @function
 * @name create
 * @description persist a given wallet into redis
 * @param  {Object}   wallet valid paywell wallet
 * @param  {Function} done    a callback to invoke on success or failure
 * @return {Object|Error}           valid paywell wallet or error
 * @since 0.1.0
 * @public
 */
exports.create = function (phoneNumber, done) {
  //TODO ensure paywell-redis index wallet in background

  //prepare save options
  const options = {
    collection: exports.defaults.collection,
    index: true,
    ignore: ['_id', 'payload']
  };

  //obtain redis client
  const client = exports.redis;

  async.waterfall([

    function ensureNotExists(next) {
      exports.get(phoneNumber, function (error, wallet) {
        //ensure wallet not exist
        const alreadyExist = !!wallet && !!wallet.activatedAt;
        if (alreadyExist) {
          error = new Error('Wallet Already Exist ' + phoneNumber);
          error.status = 400;
          // TODO set error code
        }
        next(error, wallet);
      });
    },

    function ensureDefaults(wallet, next) {
      wallet = _.merge({}, {
        balance: 0,
        phoneNumber: phoneNumber,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      next(null, wallet);
    },

    function ensureE164PhoneNumber(wallet, next) {
      exports.toE164(wallet.phoneNumber, function (error, e164PhoneNumber) {
        if (!error && !!e164PhoneNumber) {
          wallet = _.merge({}, wallet, {
            phoneNumber: e164PhoneNumber
          });
        }
        next(error, wallet);
      });
    },

    function ensureWalletId(wallet, next) {
      exports.key(wallet.phoneNumber, function (error, key) {
        if (!error && !!key) {
          wallet = _.merge({}, wallet, {
            _id: key
          });
        }
        next(error, wallet);
      });
    },

    function ensureWalletPin(wallet, next) {
      exports.shortid(function (error, pin) {
        //set wallet pin
        if (!error && !!pin) {
          wallet = _.merge({}, wallet, {
            pin: pin
          });
        }

        next(error, wallet);
      });
    },

    function saveWallet(wallet, next) {
      client.hash.save(wallet, options, function (error, _wallet) {
        _wallet = exports.deserialize(_wallet);
        next(error, _wallet);
      });
    },

    function sendWalletPin(wallet, next) {
      // TODO queue wallet pin sms send
      // TODO save wallet pin sms send for resend
      // TODO bill wallet for sent sms
      // TODO update wallet total sms sent counter
      // TODO update total sms sent counter
      next(null, wallet);
    }

  ], function (error, wallet) {
    done(error, wallet);
  });

};


/**
 * @function
 * @name search
 * @description free text search receipt(s)
 * @param  {String}   query a search string
 * @param  {Function} done  a callback to invoke on success or failure
 * @return {Object[]}         collection of paywell receipt(s) or error
 */
exports.search = function (query, done) {

  //prepare search options
  const options = {
    collection: exports.defaults.collection,
    q: query
  };

  //search receipts
  const client = exports.redis;
  client.hash.search(options, function (error, receipts) {
    done(error, receipts);
  });

};


exports.activate = function () {
  // body...
};

exports.verify = function () {
  // body...
};