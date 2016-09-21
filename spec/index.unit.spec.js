'use strict';

//dependencies
const path = require('path');
const _ = require('lodash');
const expect = require('chai').expect;
const redis = require('paywell-redis')();
const wallet = require(path.join(__dirname, '..'))();

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
        wallet.toE164('0714999999', function (error, phoneNumber) {
          expect(error).to.not.exist;
          expect(phoneNumber).to.exist;
          expect(_.startsWith(phoneNumber, '+255')).to.be.true;
          expect(phoneNumber).to.contains('714999999');
          done(error, phoneNumber);
        });
      });
  });

  describe('key', function () {
    it(
      'should be able to create wallet key from phone number',
      function (done) {
        wallet.key('0714999999', function (error, key) {
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
    it('should be able to generate shortid', function (done) {
      wallet.shortid(function (error, shortid) {
        expect(error).to.not.exist;
        expect(shortid).to.exist;
        done(error, shortid);
      });
    });
  });

  describe('create', function () {
    before(function (done) {
      redis.clear(done);
    });

    it('should be able to create wallet');
    it('should be able to initialize wallet balance');
    it('should be able to initialize wallet total deposit');
    it('should be able to initialize wallet total withdraw');
    it('should be able to initialize wallet total transfer');
  });

  describe('get', function () {
    before(function (done) {
      redis.clear(done);
    });
    it('should be able to get single wallet');
    it('should be able to get multiple wallets');
  });

  describe('verify', function () {
    before(function (done) {
      redis.clear(done);
    });
    it('should be able to send verification code');
    it('should be able to accept verification to verify wallet');
  });

  describe('deposit', function () {
    before(function (done) {
      redis.clear(done);
    });
    it('should be able to deposit cash');
  });

  describe('withdraw', function () {
    before(function (done) {
      redis.clear(done);
    });
    it('should be able to withdraw cash');
  });

  describe('transfer', function () {
    before(function (done) {
      redis.clear(done);
    });
    it('should be able to transfer cash');
  });

  describe('analytics', function () {
    before(function (done) {
      redis.clear(done);
    });
    it('should be able to get wallet with max deposit count');
    it('should be able to get wallet with min deposit count');
    it('should be able to get wallet with max deposit amount');
    it('should be able to get wallet with min deposit amount');
  });

  describe('search', function () {
    before(function (done) {
      redis.clear(done);
    });
    it(
      'should be able to index wallet using reds atomically during save'
    );
  });

  after(function (done) {
    redis.clear(done);
  });

});