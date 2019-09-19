
process.env.NODE_CONFIG_DIR = process.env.NODE_CONFIG_DIR || require('path').join(__dirname, '../../../../runtime/config/');
const config = require('config');

if (!config.gateway.services) config.gateway.services = []
if (!config.log4js) {
    config.log4js = {
        appenders:{
            errorlog:{
                type: 'file',
                filename:  '/tmp/error.log'
            },
            infolog:{
                type: 'file',
                filename:  '/tmp/info.log'
            },
            warnlog:{
                type: 'file',
                filename:  '/tmp/warn.log'
            },
            errors_in_error_file: {layout: { type: 'json'}, type: 'logLevelFilter', appender: 'errorlog', level: 'error' },
            warn_in_warning_file: {layout: { type: 'json'}, type: 'logLevelFilter', appender: 'warnlog', level: 'warn', maxLevel:'warn'},
            infos_in_info_file: {layout: { type: 'json'}, type: 'logLevelFilter', appender: 'infolog', level:'all', maxLevel:'info' }
        },
        categories:{
            default:{
                appenders: ['errors_in_error_file','warn_in_warning_file','infos_in_info_file'],
                level: 'all'
            }
        }
    }
}

//组装CRUD配置
if (config.crud) {
    // for (let table of (config.crud.tables || [])) {
    //     config.gateway.services.push([`/crud/${table}/create`, config.crud.target])
    //     config.gateway.services.push([`/crud/${table}/list`, config.crud.target])
    //     config.gateway.services.push([`/crud/${table}/update`, config.crud.target])
    // }
    if (config.crud.default) {
        const apimap = {}
        for (let table of (config.crud.tables || [])) {
            apimap[`/crud/${table}/create`] = config.crud.default
            apimap[`/crud/${table}/list`] = config.crud.default
            apimap[`/crud/${table}/update`] = config.crud.default
        }
        config.tc = {...apimap, ...config.tc}
    }
}

module.exports = config;
