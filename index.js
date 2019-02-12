
const crontask = {};

const config = require('./lib/config');
const Koa = require('koa')

const errorCode = require('./lib/errorCode');
const func = require('./lib/func');
const mysql = require('./lib/mysql')(config.mysql.url);
const redis = require('./lib/redis')(config.redis.url);


class Task{
    constructor(module, options) {
        options = options || {
            parseBody: true // not suitable for proxy
        }
        this.api = new Koa();
        this.api_port = module in config ? config[module].port || 80 : 0;
        this._module = module;
        this.log = require('./lib/log').get(module);
        this.use = this.api.use.bind(this.api);
        this.info = this.log.info.bind(this.log);        
        this.error = this.log.error.bind(this.log);        
        this.config = config;
        if (options.parseBody) {
            this.api.use(require('koa-body')());
        }
        this.api.use(async (ctx, next) => {
            ctx.log = this.log;
            ctx.config = config;
            if ('x-session' in ctx.req.headers) {
                ctx.session = ctx.req.headers['x-session'];
            }
            ctx.errorCode =errorCode;
            ctx.func = func;
            ctx.db = mysql;
            ctx.cache=redis;
            await next();
        });
        this.api.use(logRequest);
        this.api.use(appendSessionData);
        this.start = this.api.start = ()=>{
            this.api.use(this.router.routes()).use(this.router.allowedMethods());
            this.api.listen(this.api_port, '127.0.0.1');
            this.info(`service ${module} listenning at http://127.0.0.1:${this.api_port}`)
        }

        const Router = require('koa-router');
        this.router = new Router();
        this.get=this.api.get = this.router.get.bind(this.router);
        this.post=this.api.post = this.router.post.bind(this.router);

        this.crons=[];
        this.cron = {
            use: (func, rule)=>{
                const CronJob = require('cron').CronJob;
                this.crons.push(new CronJob(rule, func.bind(this,this)));
                func.bind(this,this)();
            },
            start: ()=>{
                this.crons.forEach((task)=>{
                    task.start();
                })
            }
        }
    }
}

async function appendSessionData(ctx, next) {
    if (ctx.session){
        const data = await redis.hgetall(`session-${ctx.session}`);
        ctx.sessionData = data;
    }
    await next();
}

async function logRequest(ctx, next) {
    ctx.log.info(ctx.session, "req", ctx.req.url, ctx.req.method, ctx.request.headers['x-real-ip']); 
    await next();
    ctx.set('Content-Type', 'application/json');
    ctx.log.info(ctx.session, "rsp", ctx.status, ctx.body || '-'); 
}

module.exports = (module, options)=>{
    return new Task(module, options);
}