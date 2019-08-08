
const crontask = {};
const md5 = require('md5')
const config = require('./lib/config');
const Koa = require('koa')

const errorCode = require('./lib/errorCode');
const func = require('./lib/func');
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
            this.api.use(require('koa-body')({
                multipart: true,
                formidable: {
                    maxFieldsSize: 157286400
                }
            }));
        }
        this.api.use(async(ctx, next) => {
            ctx._module = module
            await next() 
        })
        this.api.use(require('./lib/ctxpolyfill'))
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
    if (apitc.dupcheck && ctx.request.body) {
        const cachekey = `lr-${ctx.session}-${urlkey.replace(/\//g, '-')}`
        const cachevalue = md5(JSON.stringify(ctx.request.body))
        const lastreq = await ctx.cache.get(cachekey)
        if (lastreq === cachevalue) {
            ctx.body = ctx.func.response(ctx.errorCode.invalidRequestParam, '不允许发送重复的请求')
            return
        }
        // 10秒内同一个API同一个用户不允许发送相同的请求
        await ctx.cache.setex(cachekey, 10, cachevalue)
    }
    await next();
}

async function logRequest(ctx, next) {
    const isStream = require('is-stream')
    ctx.log.info({
        session: ctx.session, 
        type: "req",
        path: ctx.req.url,
        method: ctx.req.method,
        requestip: ctx.request.headers['x-real-ip'] || '-',
        requestbody: ctx.request.body || '-'
    })
    await next();
    if (isStream(ctx.body)) ctx.log.info({
        session: ctx.session,
        type: "rsp",
        status: ctx.status,
        rsp: 'stream'
    }); else {
        ctx.set('Content-Type', 'application/json')
        let rsp
        try {
            rsp = JSON.parse(ctx.body)
        } catch (ex) {
            rsp = {rsp: ctx.body}
        }
        ctx.log.info({
            session: ctx.session,
            type: "rsp",
            path: ctx.req.url,
            status: ctx.status,
            ...rsp
        })
    }
}

module.exports = (module, options)=>{
    return new Task(module, options)
}