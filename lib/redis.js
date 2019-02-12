const {promisify} = require('util');
var redis = require("redis");
class Redis {
    constructor(address){
        this._client = redis.createClient(address);
        this.get = promisify(this._client.get).bind(this._client);
        this.keys = promisify(this._client.keys).bind(this._client);
        this.hmset = promisify(this._client.hmset).bind(this._client);
        this.hmget = promisify(this._client.hmget).bind(this._client);
        this.hgetall = promisify(this._client.hgetall).bind(this._client);
        this.hset = promisify(this._client.hset).bind(this._client);
        this.expire = promisify(this._client.expire).bind(this._client);
        this.incr = promisify(this._client.incr).bind(this._client);
        this.hget = promisify(this._client.hget).bind(this._client);
        this.setex = promisify(this._client.setex).bind(this._client);
        this.zadd = promisify(this._client.zadd).bind(this._client);
        this.del = promisify(this._client.del).bind(this._client);
        this.zscore = promisify(this._client.zscore).bind(this._client);
        this.flushdb = promisify(this._client.flushdb).bind(this._client);
    }
    destroy(){
        this._client.quit();
    }
}
module.exports=(uri)=>{
    return new Redis(uri);
};