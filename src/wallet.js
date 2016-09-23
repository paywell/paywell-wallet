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
//TODO ensure wallet currency / units
//TODO ensure precision / decimal points

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
 * @name save
 * @description update existing wallet
 * @param  {Object}   wallet valid paywell wallet
 * @param  {Function} done   a callback to invoke on success or failure
 * @return {Object}          wallet or error
 * @since 0.1.0
 * @public
 */
exports.save = function (wallet, done) {
  //TODO ensure _id exists
  //TODO obtain save lock

  //prepare save options
  const options = {
    collection: exports.defaults.collection,
    index: true,
    ignore: ['_id', 'payload']
  };

  //obtain redis client
  const client = exports.redis;

  //update timestamps
  const today = new Date();
  wallet = _.merge({}, wallet, {
    updatedAt: today
  });

  //persist wallet
  client.hash.save(wallet, options, function (error, _wallet) {
    _wallet = exports.deserialize(_wallet);
    done(error, _wallet);
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
  //TODO obtain wallet creation lock to prevent wallet of 
  //same phone number being create parallel

  async.waterfall([

    function ensureNotExists(next) {
      exports.get(phoneNumber, function (error, wallet) {
        //ensure wallet not exist
        //TODO add discussion about this verification
        const alreadyExist = !!wallet &&
          (!!wallet.activatedAt || !!wallet.verifiedAt);
        if (alreadyExist) {
          error = new Error('Wallet Already Exist ' + phoneNumber);
          error.status = 400;
          // TODO set error code
        }
        next(error, wallet);
      });
    },

    function ensureDefaults(wallet, next) {
      const today = new Date();
      wallet = _.merge({}, {
        balance: 0,
        createdAt: today,
        updatedAt: today
      }, wallet, {
        phoneNumber: phoneNumber,
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
      exports.save(wallet, next);
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


/**
 * @function
 * @name activate
 * @description activate a wallet to be liable for cash out and cash in
 * @param  {String}   options.phoneNumber  activate given wallet
 * @param  {Function} done a callback to invoke on success or failure
 * @return {Object|Error}        wallet or error
 * @since 0.1.0
 * @public
 */
exports.activate = function (options, done) {
  //ensure options
  options = _.merge({}, options);

  async.waterfall([

    function ensureOptions(next) {
      const isValidOptions = !!options.phoneNumber;
      if (!isValidOptions) {
        let error = new Error('Invalid Activation Details');
        error.status = 400;
        //TODO set error code
        next(error);
      } else {
        next(null, options);
      }
    },

    function getWallet(options, next) {
      exports.get(options.phoneNumber, function (error, _wallet) {
        next(error, _wallet, options);
      });
    },

    function activateWallet(_wallet, options, next) {
      //check wallet for validity
      const isValidWallet = !!_wallet && _.keys(_wallet).length > 0;
      const isAlreadyActivated = isValidWallet && !!_wallet.activatedAt;

      //if already activate throw alredy activated
      if (isAlreadyActivated) {
        let error = new Error('Wallet Already Activated');
        error.status = 400;
        //TODO add error code
        next(error, _wallet);
      }

      //activate wallet
      else if (isValidWallet && !isAlreadyActivated) {
        const today = new Date();
        _wallet = _.merge({}, _wallet, {
          activatedAt: today,
          updatedAt: today
        });

        exports.save(_wallet, next);
      }

      //create new wallet
      else {
        exports.create(options.phoneNumber, next);
      }
    }

  ], function (error, _wallet) {
    done(error, _wallet);
  });
};


/**
 * @function
 * @name verify
 * @description verify a given wallet is really existing.
 *              
 *              This must me done by sending sms to a phone number with a pin
 *              that owner of a number can use to activate the wallet.
 *
 *        This process is not mandatory based on type of deployment.
 *              
 * @param  {String}   options.phoneNumber  verify given wallet using its pin
 * @param  {String}   options.pin  wallet pin code
 * @param  {Function} done a callback to invoke on success or failure
 * @return {Object|Error}        wallet or error
 * @since 0.1.0
 * @public
 */
exports.verify = function (options, done) {
  //ensure options
  options = _.merge({}, options);

  async.waterfall([

    function ensureOptions(next) {
      const isValidOptions = !!options.pin && !!options.phoneNumber;
      if (!isValidOptions) {
        let error = new Error('Invalid Verification Details');
        error.status = 400;
        //TODO set error code
        next(error);
      } else {
        next(null, options);
      }
    },

    function getWallet(options, next) {
      exports.get(options.phoneNumber, function (error, _wallet) {
        next(error, _wallet, options);
      });
    },

    function verifyPin(_wallet, options, next) {
      const isValidPin = !!_wallet && !!_wallet.pin &&
        _wallet.pin === options.pin;
      const isAlreadyVerified = isValidPin && !!_wallet.verifiedAt;

      //if already verified throw already verified
      if (isAlreadyVerified) {
        let error = new Error('Wallet Already Verified');
        error.status = 400;
        //TODO add error code
        next(error, _wallet);
      }

      //verify wallet
      else if (isValidPin && !isAlreadyVerified) {
        const today = new Date();
        _wallet = _.merge({}, _wallet, {
          verifiedAt: today,
          updatedAt: today
        });

        exports.save(_wallet, next);
      }

      //create new wallet
      else {
        exports.create(options.phoneNumber, next);
      }
    }

  ], function (error, _wallet) {
    done(error, _wallet);
  });
};


/**
 * @fuction
 * @name deposit
 * @description deposit a given amount to a wallet
 *              
 *              This operation involves the increase in wallet balance.
 *               
 *              It acquires a lock on the wallet, and defers its release until 
 *              the operation completes successfully. 
 *              
 *              It increases the wallet balance by amount using the Redis 
 *              operation HINCRBYFLOAT.
 *              
 * @param  {Object}   options valid deposit details
 * @param  {String}   options.phoneNumber valid phone number
 * @param  {String}   options.amount amount to be deposited. defalt to zero
 * @param  {Function} done    a callback to invoke on success or failure
 * @return {Object|Error}           wallet or error
 * @since 0.10
 * @public
 * @see {@link http://redis.io/commands/hincrbyfloat|HINCRBYFLOAT}
 */
exports.deposit = function (options, done) {
  //TODO ensure deposit code
  //TODO ensure redis cli can not update balance during deposit
  //ensure deposit details
  options = _.merge({}, {
    amount: 0
  }, options);

  async.waterfall([

      function ensureValidOptions(next) {
        const isValidDeposit = !!options.phoneNumber &&
          !!options.amount && options.amount >= 0;
        if (!isValidDeposit) {
          let error = new Error('Invalid Deposit');
          error.status = 400;
          //TODO set error code
          next(error);
        } else {
          next(null, options);
        }
      },

      function getWallet(options, next) {
        exports.get(options.phoneNumber, function (error, _wallet) {

          const isValidWallet = !!_wallet &&
            _.keys(_wallet).length > 0;

          if (!isValidWallet) {
            let error = new Error('Invalid Wallet');
            error.status = 400;
            //TODO set error code
            next(error);
          } else {
            next(null, _wallet, options);
          }
        });
      },

      function obtainWalletLock(_wallet, options, next) {
        exports.lock(options.phoneNumber, function (error, unlock) {
          next(error, _wallet, options, unlock);
        });
      },

      function incrementWalletBalance(_wallet, options, unlock, next) {
        //update wallet balance
        //TODO update wallet deposit timeline
        const client = exports.redis.client();
        client.hincrbyfloat(_wallet._id, 'balance', options.amount,
          function (error /*, newBalance*/ ) {
            next(error, options, unlock);
          });
      },

      function releaseLockAndGetWallet(options, unlock, next) {
        unlock(function (error) {
          if (error) {
            next(error);
          } else {
            exports.get(options.phoneNumber, next);
          }
        });
      }
    ],
    function (error, _wallet) {
      done(error, _wallet);
    });
};


/**
 * @fuction
 * @name withdraw
 * @description withdraw a given amount from a wallet
 *              
 *              This operation involves the decrease in wallet balance.
 *               
 *              It acquires a lock on the wallet, and defers its release until 
 *              the operation completes successfully. 
 *              
 *              It decreases the wallet balance by amount using the Redis 
 *              operation HINCRBYFLOAT.
 *              
 * @param  {Object}   options valid withdraw details
 * @param  {String}   options.phoneNumber valid phone number
 * @param  {String}   options.amount amount to be withdraw. defalt to zero
 * @param  {Function} done    a callback to invoke on success or failure
 * @return {Object|Error}           wallet or error
 * @since 0.10
 * @public
 * @see {@link http://redis.io/commands/hincrbyfloat|HINCRBYFLOAT}
 */
exports.withdraw = function (options, done) {
  //TODO ensure withdraw code
  //TODO ensure redis cli can not update balance during deposit
  //ensure withdraw details
  options = _.merge({}, {
    amount: 0
  }, options);

  async.waterfall([

    function ensureValidOptions(next) {
      const isValidWithdraw = !!options.phoneNumber &&
        !!options.amount && options.amount >= 0;
      if (!isValidWithdraw) {
        let error = new Error('Invalid Withdraw');
        error.status = 400;
        //TODO set error code
        next(error);
      } else {
        next(null, options);
      }
    },

    function getWallet(options, next) {
      exports.get(options.phoneNumber, function (error, _wallet) {

        const isValidWallet = !!_wallet &&
          _.keys(_wallet).length > 0;

        const canDeduct = isValidWallet &&
          (_wallet.balance - options.amount) >= 0;

        if (!isValidWallet) {
          let error = new Error('Invalid Wallet');
          error.status = 400;
          //TODO set error code
          next(error);
        }

        //check if deduction will lead to negative balance
        else if (!canDeduct) {
          let error = new Error('Balance Overflow');
          error.status = 400;
          //TODO set error code
          next(error);
        }

        //continue with deduction
        else {
          next(error, _wallet, options);
        }
      });
    },

    function obtainWalletLock(_wallet, options, next) {
      exports.lock(options.phoneNumber, function (error, unlock) {
        next(error, _wallet, options, unlock);
      });
    },

    function decrementWalletBalance(_wallet, options, unlock, next) {
      //update wallet balance
      //TODO update wallet withdraw timeline
      const client = exports.redis.client();
      client.hincrbyfloat(_wallet._id, 'balance', -options.amount,
        function (error /*, newBalance*/ ) {
          next(error, options, unlock);
        });
    },

    function releaseLockAndGetWallet(options, unlock, next) {
      unlock(function (error) {
        if (error) {
          next(error);
        } else {
          exports.get(options.phoneNumber, next);
        }
      });
    }
  ], function (error, _wallet) {
    done(error, _wallet);
  });
};