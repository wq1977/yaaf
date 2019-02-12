const {promisify} = require('util');
var mysql = require("mysql");
class MySQL {
    constructor(address){
        this._client = mysql.createConnection(address);
        this.query = promisify(this._client.query).bind(this._client);
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