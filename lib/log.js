const log4js = require('log4js');
log4js.addLayout('json', function(config) {
    return function(logEvent) {
        if (logEvent.data && logEvent.data.length && logEvent.data.length === 1) {
            logEvent.data = logEvent.data[0]
        }
        return JSON.stringify(logEvent)
    }
});
const config = require('./config');

log4js.configure(config.log4js);

const get = (module)=>{
    const logger = log4js.getLogger(module);
    logger.level = 'debug';
    return logger;
}
module.exports = {
    get
}