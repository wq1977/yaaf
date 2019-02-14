const config = require('../lib/config');
const mysql = require('../lib/mysql')(config.mysql.url);
const redis = require('../lib/redis')(config.redis.url);
const log = require('../lib/log').get('unittest');
const func = require('../lib/func');
const errorCode = require('../lib/errorCode');
const ctx={
    db:mysql,
    cache:redis,
    log,
    func,
    errorCode
}
const mockdbname = 'db_'+Math.round(Math.random()*10000);
ctx.db.init=async function(){    
    const rows = await mysql.query(`SELECT table_name FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = '${mysql._client.config.database}'`);
    const tables=[];
    for (let row of rows){
        const create = await mysql.query(`show create table \`${row.table_name}\``);
        const truncate = `truncate table \`${row.table_name}\``;
        tables.push({create:create[0]['Create Table'], truncate});
    }
    await mysql.query(`create database ${mockdbname}`);
    await mysql.query(`use ${mockdbname}`);
    await mysql.query('SET @@global.time_zone = "+08:00";')
    await mysql.query('SET @@session.time_zone = "+08:00";')
    for (let table of tables) {
        await mysql.query(table.create);
        await mysql.query(table.truncate);
    }
}

ctx.destroy=async function(){
    await mysql.query(`drop database ${mockdbname}`)
    mysql.destroy();
    redis.destroy();
}
module.exports = ctx
