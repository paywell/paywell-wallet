'use strict';

process.env.NODE_ENV = 'test';

//dependencies
const nock = require('nock');
const redis = require('paywell-redis')();


//clean database
after(function (done) {
  redis.clear(done);
});

//clean resources
after(function () {
  redis.quit();
});

//clean nock interceptors
after(function () {
  nock.cleanAll();
});