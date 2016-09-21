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
          done(error, _wallet);
        });
      });

    after(function (done) {
      redis.clear(done);
    });

  });

  describe('activate', function () {
    it('should be able to activate wallet');
  });


  describe('search', function () {
    before(function (done) {
      redis.clear(done);
    });
    it(
      'should be able to index wallet using reds atomically during save'
    );
  });

  describe('deposit', function () {
    before(function (done) {
      redis.clear(done);
    });
    it('should be able to deposit cash');
    it('should be able to obtain wallet deposit timeline');
  });

  describe('withdraw', function () {
    before(function (done) {
      redis.clear(done);
    });
    it('should be able to withdraw cash');
    it('should be able to obtain wallet withdraw timeline');
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