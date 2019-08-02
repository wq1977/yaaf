
process.env.NODE_CONFIG_DIR = process.env.NODE_CONFIG_DIR || require('path').join(__dirname, '../../../../runtime/config/');
const config = require('config');

//组装CRUD配置
if (config.crud) {
    for (let table of (config.crud.tables || [])) {
        config.gateway.services.push([`/curd/${table}/create`, config.crud.target])
        config.gateway.services.push([`/curd/${table}/list`, config.crud.target])
        config.gateway.services.push([`/curd/${table}/update`, config.crud.target])
    }
    if (config.crud.default) {
        const apimap = {}
        for (let table of (config.crud.tables || [])) {
            apimap[`/curd/${table}/create`] = config.crud.default
            apimap[`/curd/${table}/list`] = config.crud.default
            apimap[`/curd/${table}/update`] = config.crud.default
        }
        config.tc = [...apimap, ...config.tc]
    }
}

module.exports = config;
