'use strict';
const fs = require('fs');
const path = require('path');

const pify = require('pify');
const test = require('ava');
const temp = require('temp');
const mockery = require('mockery');
// require now to avoid mockery warnings
require('@blinkmobile/aws-s3');
require('elegant-spinner');
require('log-update');

const fileData = 'test contents\n\n';
const pWriteFile = pify(fs.writeFile);
const pMkdir = pify(temp.mkdir);

const chainer = {
  on: () => chainer,
  send: () => chainer
};

const s3FactoryModule = '../lib/s3-bucket-factory';
const s3BucketFactoryMock = () => Promise.resolve({
  listObjects (options, callback) { callback(null, { Contents: [] }); },
  upload (options, callback) { callback(null); }
});

const makeArray = num => {
  let arr = [];
  for (let i = 0; i < num; ++i) {
    arr.push(i);
  }

  return arr;
};

const createFile = dir => id => {
  const filePath = path.join(dir, `${id}.js`);
  return pWriteFile(filePath, fileData);
};

temp.track();
mockery.enable();
mockery.registerMock(s3FactoryModule, s3BucketFactoryMock);
mockery.registerAllowables([
  '../commands/deploy',
  'fs',
  'path',
  '@blinkmobile/aws-s3',
  'elegant-spinner',
  'log-update'
]);

test.after(() => mockery.disable());

function makeTest (timerLabel, numFiles) {
  return t => {
    const deploy = require('../commands/deploy');
    const upload = dir => {
      console.time(timerLabel);
      deploy([dir]);
    };

    let tempPath;
    return pMkdir('temp' + numFiles).then(dirPath => {
      let count = makeArray(100);
      tempPath = dirPath;
      return Promise.all(count.map(createFile(tempPath)));
    }).then(results => upload(tempPath))
      .then(result => console.timeEnd(timerLabel));
  };
}

test('read 100 files from disk', makeTest('100Files', 100));

test('read 500 files from disk', makeTest('500Files', 500));

test('read 1000 files from disk', makeTest('1000Files', 1000));

test('read 2000 files from disk', makeTest('2000Files', 2000));