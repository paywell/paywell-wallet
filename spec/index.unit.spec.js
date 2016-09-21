'use strict';

//dependencies
const path = require('path');
const _ = require('lodash');
const expect = require('chai').expect;
const wallet = require(path.join(__dirname, '..'))();

describe('wallet', function () {

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

});