const {promisify} = require('util');
var mysql = require("mysql");
class MySQL {
    constructor(address){
        this._client = mysql.createConnection(address);
        this._client.query('SET @@global.time_zone = "+08:00";')
        this._client.query('SET @@session.time_zone = "+08:00";')
        this.query = (function(){
            const oldargs = [].slice.call(arguments);
            const that = this;
            let logsqlfunc = null;
            if (typeof(oldargs[oldargs.length-1]) === 'function') {
                logsqlfunc = oldargs.splice(oldargs.length-1, 1)[0];
            }
            return new Promise((resolve, reject)=>{
                const args = [...oldargs, (err, result)=>{
                    if (err) reject(err);
                    else resolve(result);
                }];
                const q = that._client.query.call(that._client, ...args);
                logsqlfunc && logsqlfunc(q.sql); 
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
module.exports=(uri)=>{
    return new MySQL(uri);
};