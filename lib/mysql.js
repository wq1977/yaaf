const {promisify} = require('util');
var mysql = require("mysql")

let logfunc

class MySQL {
    constructor(address){
        this._client = mysql.createConnection(address)
        // this._client.query('SET @@global.time_zone = "+08:00";')
        // this._client.query('SET @@session.time_zone = "+08:00";')
        this.query = (function(){
            const oldargs = [].slice.call(arguments);
            const that = this;
            // let logsqlfunc = null;
            // before we do sql-dump, we allow last param to set log sql function
            if (typeof(oldargs[oldargs.length-1]) === 'function') {
                oldargs.splice(oldargs.length-1, 1)[0];
            }
            return new Promise((resolve, reject)=>{
                let q
                const queryat = new Date().getTime()
                const args = [...oldargs, (err, result)=>{
                    const delta = new Date().getTime() - queryat                    
                    if (err) {
                        logfunc && logfunc('sql-error', {
                            sql: err.sql,
                            fatal: err.fatal,
                            msg: err.sqlMessage
                        })
                        reject(err)
                    }
                    else {
                        logfunc && logfunc('sql-dump', {delta, sql: q.sql})
                        resolve(result)
                    }
                }];
                q = that._client.query.call(that._client, ...args);
                // logsqlfunc && logsqlfunc(q.sql); 
            });
        })
        promisify(this._client.query).bind(this._client);
        this.beginTransaction = promisify(this._client.beginTransaction).bind(this._client);
        this.commit = promisify(this._client.commit).bind(this._client);
        this.rollback = promisify(this._client.rollback).bind(this._client);
    }
    destroy(){
        this._client.destroy();
    }
}

let queryPool
module.exports=async (ctx, next) => {
    if (!queryPool) queryPool = new MySQL(ctx.config.mysql.url)
    ctx.db = queryPool
    logfunc = ctx.info
    next && await next()
}