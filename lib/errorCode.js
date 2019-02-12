const config = require('./config');

const errorCode = {};
config.errorCode.forEach((def,idx) => {
    const key = Object.keys(def)[0];
    errorCode[key] = {
        code:10000+idx, msg:def[key]
    };
});

module.exports = errorCode
