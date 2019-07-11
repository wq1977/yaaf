
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
        this.warn = this.log.warn.bind(this.log);        
        this.config = config;
        if (options.parseBody) {
            this.api.use(async(ctx, next) => {
                if (ctx.request.type.indexOf('xml') >= 0) ctx.is = (a)=>a==='text';
                await next()
            }) 
            this.api.use(require('koa-body')({ multipart: true }));
        }
        this.api.use(async (ctx, next) => {
            ctx.log = this.log;
            ctx.config = config;
            ctx.info = this.log.info.bind(this.log,'no-session');        
            ctx.error = this.log.error.bind(this.log,'no-session');   
            ctx.warn = this.log.warn.bind(this.log,'no-session');   
            if ('x-session' in ctx.req.headers) {
                ctx.session = ctx.req.headers['x-session'];
                ctx.info = this.log.info.bind(this.log, ctx.session);        
                ctx.error = this.log.error.bind(this.log, ctx.session);                
                ctx.warn = this.log.warn.bind(this.log, ctx.session);                
            }
            ctx.errorCode =errorCode;
            ctx.func = func;
            ctx.db = mysql;
            ctx.cache=redis;
            await next();
        });
        this.db = mysql;
        this.cache = redis;
        this.func=func;
        this.errorCode = errorCode;
        this.api.use(logRequest);
        this.api.use(dupRequestCheck);
        this.api.use(appendSessionData);
        this.start = this.api.start = (addr)=>{
            this.api.use(this.router.routes()).use(this.router.allowedMethods());
            const bindaddr = addr || '127.0.0.1'
            this.api.listen(this.api_port, bindaddr);
            this.info(`service ${module} listenning at http://${bindaddr}:${this.api_port}`)
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

async function dupRequestCheck(ctx, next) {
    const defaulttc = ctx.config.tc['default']
    const urlkey = ctx.req.url
    const apitc = {...defaulttc, ...(ctx.config.tc[urlkey] || {})}
    if (apitc.dupcheck) {
        const lastreq = await ctx.cache.get(`api-last-req-${ctx.session}-${urlkey}`)
        if (lastreq === JSON.stringify(ctx.request.body)) {
            ctx.body = ctx.func.response(ctx.errorCode.invalidRequestParam, '不允许发送重复的请求')
            return
        }
        // 30秒内同一个API同一个用户不允许发送相同的请求
        await ctx.cache.setex(`api-last-req-${ctx.session}-${urlkey}`, 30, JSON.stringify(ctx.request.body))
    }
    await next();
}

async function logRequest(ctx, next) {
    const isStream = require('is-stream');
    ctx.log.info(ctx.session, "req", ctx.req.url, ctx.req.method, ctx.request.headers['x-real-ip'], ctx.request.body); 
    await next();
    if (isStream(ctx.body)) ctx.log.info(ctx.session, "rsp", ctx.status, 'stream'); 
    else {
        ctx.set('Content-Type', 'application/json');
        ctx.log.info(ctx.session, "rsp", ctx.status, ctx.body || '-');     
    }
}

module.exports = (module, options)=>{
    return new Task(module, options);
}