'use strict';

//dependencies
const path = require('path');
const _ = require('lodash');
const expect = require('chai').expect;
const redis = require('paywell-redis')();
const wallet = require(path.join(__dirname, '..'))();
const phoneNumber = '0714999999';

describe('wallet', function () {

  before(function (done) {
    redis.clear(done);
  });

  it('should be exportable', function () {
    expect(wallet).to.exist;
    expect(wallet).to.be.an.Object;
  });

  describe('phone', function () {
    it(
      'should be able to convert phone number into E.164 format',
      function (done) {
        wallet.toE164(phoneNumber, function (error, _phoneNumber) {
          expect(error).to.not.exist;
          expect(_phoneNumber).to.exist;
          expect(_.startsWith(_phoneNumber, '+255')).to.be.true;
          expect(_phoneNumber).to.contains('714999999');
          done(error, _phoneNumber);
        });
      });

    it(
      'should be able to convert phone number into E.164 format',
      function (done) {
        wallet.toE164('255714999999', function (error, _phoneNumber) {
          expect(error).to.not.exist;
          expect(_phoneNumber).to.exist;
          expect(_.startsWith(_phoneNumber, '+255')).to.be.true;
          expect(_phoneNumber).to.contains('714999999');
          done(error, _phoneNumber);
        });
      });

    it(
      'should be able to convert phone number into E.164 format',
      function (done) {
        wallet.toE164('+255714999999', function (error, _phoneNumber) {
          expect(error).to.not.exist;
          expect(_phoneNumber).to.exist;
          expect(_.startsWith(_phoneNumber, '+255')).to.be.true;
          expect(_phoneNumber).to.contains('714999999');
          done(error, _phoneNumber);
        });
      });
  });

  describe('key', function () {
    it(
      'should be able to create wallet key from phone number',
      function (done) {
        wallet.key(phoneNumber, function (error, key) {
          expect(error).to.not.exist;
          expect(key).to.exist;
          const parts = key.split(':');
          expect(parts.length).to.be.equal(3);
          expect(parts[1]).to.be.equal('wallets');
          expect(_.startsWith(parts[2], '255')).to.true;
          expect(parts[2]).to.contains('714999999');
          done(error, key);
        });
      });
  });

  describe('shortid', function () {
    before(function (done) {
      redis.clear(done);
    });
    it('should be able to generate shortid', function (done) {
      wallet.shortid(function (error, shortid) {
        expect(error).to.not.exist;
        expect(shortid).to.exist;
        done(error, shortid);
      });
    });
  });

  describe('lock', function () {
    let unlock;
    before(function (done) {
      redis.clear(done);
    });

    it('should be able to lock wallet', function (done) {
      wallet.lock(phoneNumber, {
        ttl: 20000
      }, function (error, _unlock) {
        expect(error).to.not.exist;
        expect(_unlock).to.exist;
        expect(_unlock).to.be.a.Function;
        unlock = _unlock;
        done(error, _unlock);
      });
    });

    it(
      'should not be able to obtain lock if previous lock have not released',
      function (done) {
        wallet.lock(phoneNumber, {
          ttl: 20000
        }, function (error, _unlock) {
          expect(error).to.exist;
          expect(error.message).to.be.equal('Missing Wallet Lock');
          expect(error.status).to.be.equal(400);
          expect(_unlock).to.not.exist;
          done();
        });
      });

    after(function (done) {
      unlock(done);
    });

  });

  describe('create', function () {
    let newWallet;
    before(function (done) {
      redis.clear(done);
    });

    it(
      'should be able to create wallet',
      function (done) {
        wallet.create(phoneNumber, function (error, _wallet) {
          expect(error).to.not.exist;
          expect(_wallet).to.exist;
          expect(_wallet.phoneNumber).to.exist;
          expect(_wallet.pin).to.exist;
          expect(_wallet.createdAt).to.exist;
          expect(_wallet.updatedAt).to.exist;
          newWallet = _wallet;
          done(error, _wallet);
        });
      });

    it(
      'should be able to initialize wallet balance',
      function () {
        expect(newWallet.balance).to.exist;
        expect(newWallet.balance).to.be.equal(0);
      });

    it(
      'should be able to re-create wallet if not verified',
      function (done) {
        wallet.create(phoneNumber, function (error, _wallet) {
          expect(error).to.not.exist;
          expect(_wallet).to.exist;
          expect(_wallet.phoneNumber).to.exist;
          expect(_wallet.pin).to.exist;
          expect(_wallet.createdAt).to.exist;
          expect(_wallet.updatedAt).to.exist;
          newWallet = _wallet;
          done(error, _wallet);
        });
      });

    it('should be able to initialize wallet total deposit amount');
    it('should be able to initialize wallet total deposit count');
    it('should be able to initialize wallet total withdraw amount');
    it('should be able to initialize wallet total withdraw count');
    it('should be able to initialize wallet total transfer balance');
    it('should be able to initialize wallet total transfer count');
    it('should not be able to create same wallet in parallel/cluster');

    after(function (done) {
      redis.clear(done);
    });
  });

  describe('recover', function () {
    it('should be able to recoever using same wallet phone number');
    it('should be able to add second number in case of theft or lost');
    it('should be able to recoever using wallet second phone number');
  });

  describe('verify', function () {
    let pin;
    before(function (done) {
      redis.clear(done);
    });

    before(function (done) {
      wallet.create(phoneNumber, function (error, _wallet) {
        pin = _wallet.pin;
        done(error, _wallet);
      });
    });

    it('should be able to send verification code');
    it(
      'should be able to accept verification code to verify wallet',
      function (done) {
        wallet.verify({ phoneNumber, pin }, function (error, _wallet) {
          expect(error).to.not.exist;
          expect(_wallet).to.exist;
          expect(_wallet.verifiedAt).to.exist;
          expect(_wallet.pin).to.be.equal(pin);
          done(error, _wallet);
        });
      });

    it(
      'should not be able to re-create a wallet once verified',
      function (done) {
        wallet.create(phoneNumber, function (error, _wallet) {
          expect(error).to.exist;
          expect(error.message)
            .to.contains('Wallet Already Exist');
          expect(_wallet).to.exist;
          done();
        });
      });

    it(
      'should not be able to verify wallet more than once',
      function (done) {
        wallet.verify({ phoneNumber, pin }, function (error, _wallet) {
          expect(error).to.exist;
          expect(error.message)
            .to.contains('Wallet Already Verified');
          expect(_wallet).to.exist;
          done();
        });
      });

    after(function (done) {
      redis.clear(done);
    });

  });

  describe('activate', function () {
    let pin;
    before(function (done) {
      redis.clear(done);
    });

    before(function (done) {
      wallet.create(phoneNumber, function (error, _wallet) {
        pin = _wallet.pin;
        done(error, _wallet);
      });
    });

    it(
      'should be able to activate wallet',
      function (done) {
        wallet.activate({ phoneNumber }, function (error, _wallet) {
          expect(error).to.not.exist;
          expect(_wallet).to.exist;
          expect(_wallet.activatedAt).to.exist;
          expect(_wallet.pin).to.be.equal(pin);
          done(error, _wallet);
        });
      });

    it(
      'should not be able to re-create a wallet once activated',
      function (done) {
        wallet.create(phoneNumber, function (error, _wallet) {
          expect(error).to.exist;
          expect(error.message)
            .to.contains('Wallet Already Exist');
          expect(_wallet).to.exist;
          done();
        });
      });

    it(
      'should not be able to activate wallet more than once',
      function (done) {
        wallet.activate({ phoneNumber }, function (error, _wallet) {
          expect(error).to.exist;
          expect(error.message)
            .to.contains('Wallet Already Activated');
          expect(_wallet).to.exist;
          done();
        });
      });

    after(function (done) {
      redis.clear(done);
    });
  });

  describe('get', function () {
    before(function (done) {
      redis.clear(done);
    });

    before(function (done) {
      wallet.create(phoneNumber, function (error, _wallet) {
        done(error, _wallet);
      });
    });

    it(
      'should be able to get a wallet',
      function (done) {
        wallet.get(phoneNumber, function (error, _wallet) {
          expect(error).to.not.exist;
          expect(_wallet).to.exist;
          done(error, _wallet);
        });
      });

    after(function (done) {
      redis.clear(done);
    });
  });

  describe('search', function () {
    before(function (done) {
      redis.clear(done);
    });

    before(function (done) {
      wallet.create(phoneNumber, done);
    });

    it('update reds to allow number search');

    it('should be able to search for a wallet');

    it(
      'should be able to index wallet using reds atomically during save'
    );

    after(function (done) {
      redis.clear(done);
    });
  });

  describe('deposit', function () {
    const deposit = 200;
    before(function (done) {
      redis.clear(done);
    });

    before(function (done) {
      wallet.create(phoneNumber, function (error, _wallet) {
        done(error, _wallet);
      });
    });

    it(
      'should be able to deposit cash',
      function (done) {
        wallet.deposit({ phoneNumber: phoneNumber, amount: deposit },
          function (error, _wallet) {
            expect(error).to.not.exist;
            expect(_wallet).to.exist;
            expect(_wallet.balance).to.be.equal(200);
            done(error, _wallet);
          });
      });

    it('should not be able to deposit on same wallet in parallel');

    it('should be able to obtain wallet deposit timeline');

    after(function (done) {
      redis.clear(done);
    });
  });

  describe('withdraw', function () {
    const deposit = 300;
    const withdraw = 100;
    before(function (done) {
      redis.clear(done);
    });

    before(function (done) {
      wallet.create(phoneNumber, function (error, _wallet) {
        done(error, _wallet);
      });
    });

    before(function (done) {
      wallet.deposit({ phoneNumber: phoneNumber, amount: deposit },
        done);
    });

    it(
      'should be able to withdraw cash',
      function (done) {
        wallet.withdraw({ phoneNumber: phoneNumber, amount: withdraw },
          function (error, _wallet) {
            expect(error).to.not.exist;
            expect(_wallet).to.exist;
            expect(_wallet.balance).to.be.equal(200);
            done(error, _wallet);
          });
      });

    it(
      'should be able to withdraw cash',
      function (done) {
        wallet.withdraw({ phoneNumber: '255714999999', amount: withdraw },
          function (error, _wallet) {
            expect(error).to.not.exist;
            expect(_wallet).to.exist;
            expect(_wallet.balance).to.be.equal(100);
            done(error, _wallet);
          });
      });

    it(
      'should be able to restrict withdraw that may cause balance to go below zero',
      function (done) {
        wallet.withdraw({ phoneNumber: phoneNumber, amount: 400 },
          function (error, _wallet) {
            expect(error).to.exist;
            expect(_wallet).to.not.exist;
            expect(error.message).to.contains('Balance Overflow');
            done();
          });
      }
    );

    it('should not be able to withdraw on same wallet in parallel');


    it('should be able to obtain wallet withdraw timeline');

    after(function (done) {
      redis.clear(done);
    });
  });

  describe('transfer', function () {
    before(function (done) {
      redis.clear(done);
    });
    it('should be able to transfer cash');
    it('should be able to obtain wallet transfer timeline');
  });

  describe('analytics', function () {
    before(function (done) {
      redis.clear(done);
    });
    it('should be able to get wallet with max deposit count');
    it('should be able to get wallet with min deposit count');
    it('should be able to get wallet with max deposit amount');
    it('should be able to get wallet with min deposit amount');
    it('should be able to obtain total wallet count');
    it('should be able to obtain total wallet count by date');
  });

  after(function (done) {
    redis.clear(done);
  });

});