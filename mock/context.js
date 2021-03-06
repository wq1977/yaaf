const config = require('../lib/config');
const libmysql = require('../lib/mysql')
const redis = require('../lib/redis')(config.redis.url);
const log = require('../lib/log').get('unittest');
const func = require('../lib/func');
const errorCode = require('../lib/errorCode');
const ctx={
    db: {destroy(){}},
    cache:redis,
    config,
    log,
    info: log.info.bind(log),
    error: log.error.bind(log),
    warn: log.warn.bind(log),
    func,
    errorCode
}
let mysql
let mockdbname = 'db_'+Math.round(Math.random()*10000);
ctx.db.init=async function(dbname){
    const init = ctx.db.init  
    await libmysql(ctx, async a=>a)
    mysql = ctx.db
    ctx.db.init = init
    if (dbname)  mockdbname = dbname;
    const rows = await mysql.query(`SELECT table_name FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = '${mysql._client.config.database}'`);
    const tables=[];
    for (let row of rows){
        const create = await mysql.query(`show create table \`${row.table_name}\``);
        const truncate = `truncate table \`${row.table_name}\``;
        const drop = `DROP TABLE IF EXISTS \`${row.table_name}\`;`
        tables.push({create:create[0]['Create Table'], truncate, drop});
    }
    await mysql.query(`create database IF NOT EXISTS ${mockdbname}`);
    await mysql.query(`use ${mockdbname}`);
    await mysql.query('SET @@global.time_zone = "+08:00";')
    await mysql.query('SET @@session.time_zone = "+08:00";')
    for (let table of tables) {
        await mysql.query(table.drop);
        await mysql.query(table.create);
        await mysql.query(table.truncate);
    }
    console.log('using mock db:', mockdbname)
}

ctx.destroy=async function(drop){
    if (drop) {
        await mysql.query(`drop database ${mockdbname}`)
    }
    mysql.destroy();
    redis.destroy();
}
module.exports = ctx
