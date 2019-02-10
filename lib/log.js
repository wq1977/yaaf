const log4js = require('log4js');
const config = require('./config');
const logfile = require('path').join(__dirname, '../../runtime/log/info.log');
const log4jsconfig = {
    appenders: {
        cheese: { type: 'file', filename:  logfile},
        console: { type: 'console'},
    },
    categories: { default: { appenders: ['cheese'], level: 'info' } }
};

if (config.log4js.console) {
    log4jsconfig.categories.default.appenders.push('console');
}

log4js.configure(log4jsconfig);

const get = (module)=>{
    const logger = log4js.getLogger(module);
    logger.level = 'debug';
    return logger;
}
module.exports = {
    get
}