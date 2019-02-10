
process.env.NODE_CONFIG_DIR = require('path').join(__dirname, '../../runtime/config/');
const config = require('config');
module.exports = config;
