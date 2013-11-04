
module.exports = require('./lib');

if (process.env.BS_COVERAGE){
  var dir = './lib-cov/';
  module.exports = require(dir);
}