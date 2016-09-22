paywell-wallet
================

[![Build Status](https://travis-ci.org/paywell/paywell-wallet.svg?branch=master)](https://travis-ci.org/paywell/paywell-wallet)
[![Dependency Status](https://img.shields.io/david/paywell/paywell-wallet.svg?style=flat)](https://david-dm.org/paywell/paywell-wallet)
[![npm version](https://badge.fury.io/js/paywell-wallet.svg)](https://badge.fury.io/js/paywell-wallet)

virtual wallet for paywell

## Requirements
- [Redis 2.8.0+](http://redis.io/)
- [NodeJS 6.5.0+](https://nodejs.org/en/)

## Installation
```sh
$ npm install --save paywell-wallet
```

## Usage
```js
const wallet = require('paywell-wallet')([options]);

//create wallet
wallet.create(phoneNumber,done);

//wallet save&update
wallet.save(wallet,done);

//get wallet
wallet.get(phoneNumber,done);

//wallet deposit
wallet.deposit({phoneNumber,amount},done);

//wallet withdraw
wallet.withdraw({phoneNumber,amount},done);
```

## Wallet Structure
```js
{
    phoneNumber:String, //in E.164 format
    balance:Number,
    pin:String,
    createdAt:Date,
    verifiedAt:Date,
    updatedAt:Date,
    deletedAt:Date,
}
```

## Testing
* Clone this repository

* Install all development dependencies
```sh
$ npm install
```

* Then run test
```sh
$ npm test
```

## Contribute
It will be nice, if you open an issue first so that we can know what is going on, then, fork this repo and push in your ideas. Do not forget to add a bit of test(s) of what value you adding.

## Licence
The MIT License (MIT)

Copyright (c) 2015 byteskode, paywell, lykmapipo & Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. 