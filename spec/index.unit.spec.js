'use strict';

//dependencies
const path = require('path');
const expect = require('chai').expect;
const wallet = require(path.join(__dirname, '..'))();

describe('wallet', function () {
  it('should be exportable', function () {
    expect(wallet).to.exist;
    expect(wallet).to.be.an.Object;
  });
});