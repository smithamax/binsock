var dir = './lib/';
if (process.env.COVERAGE){
  dir = './lib-cov/';
}

module.exports = require(dir);