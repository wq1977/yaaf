const config = require('../lib/config')
require('events').EventEmitter.defaultMaxListeners = 0
const task = require('..')('gateway', {
    parseBody: false
});

const koaConnect = require('koa2-connect')
const httpProxy = require('http-proxy-middleware')

const serviceMap = {}
const proxymap = {}
let reqsequence = 0
async function normalroute(ctx, next) {
    const host = ctx.gradation && ctx.config.gradation ? ctx.config.gradation.host : '127.0.0.1'
    const key = `${host}${ctx.request.path}`
    ctx.__yaaf = {url: ctx.request.path, host, reqsequence: reqsequence++, timestamp: new Date().getTime()}
    ctx.info('yaaf-gateway-req', ctx.__yaaf)
    if (!(key in serviceMap)) {
        if (!(key in proxymap)) {
            const servicename = ctx.request.path.split('/').splice(1,1).pop()
            if (servicename && task.config[servicename] && task.config[servicename].port) {
                proxymap[ctx.request.path] = httpProxy(ctx.request.path, {
                    target: `http://${host}:${task.config[servicename].port}${ctx.request.path}`, 
                    changeOrigin: true,
                    onError: (err, req, res)=>{
                        res.writeHead(501, {
                            'Content-Type': 'text/plain'
                        })
                        res.end(
                            'Something went wrong. And we are reporting a custom error message.'
                        )
                    }    
                })    
            }
        }
        if (key in proxymap) {
            await koaConnect(proxymap[key])(ctx, next)
            ctx.__yaaf.delta = new Date().getTime() - ctx.__yaaf.timestamp
            ctx.info('yaaf-gateway-end', ctx.__yaaf)
        } else {
            ctx.status = 404
        }
    } else {
        await next()
    }
}

const eldstart = task.start;
const cfgServiceMap = (config.gateway.services || []).reduce((r, service) => {
    r[service[0]] = service
    return r
}, {})
task.start = ((addr)=>{
    task.api.use(async (ctx, next) => {
        const host = ctx.gradation && ctx.config.gradation ? ctx.config.gradation.host : '127.0.0.1'
        const key = `${host}${ctx.request.path}`
        ctx.__yaaf = {url: ctx.request.path, host, reqsequence: reqsequence++, timestamp: new Date().getTime()}
        ctx.info('yaaf-gateway-req', ctx.__yaaf)
        if ((!(key in serviceMap)) && (ctx.request.path in cfgServiceMap)) {
            serviceMap[key] = httpProxy(ctx.request.path, {
                target: ctx.config.gradation ? cfgServiceMap[ctx.request.path][1].replace(/[\d.]+/, host) : cfgServiceMap[ctx.request.path][1], 
                changeOrigin: true,
                onError: (err, req, res)=>{
                    res.writeHead(501, {
                        'Content-Type': 'text/plain'
                    })
                    res.end(
                        'Something went wrong. And we are reporting a custom error message.'
                    )
                },
            })    
        }
        if (key in serviceMap) {
            await koaConnect(serviceMap[key])(ctx, next)
            ctx.__yaaf.delta = new Date().getTime() - ctx.__yaaf.timestamp
            ctx.info('yaaf-gateway-end', ctx.__yaaf)
        } else await next()
    })
    task.api.use(normalroute)
    eldstart(addr);
}).bind(task);

module.exports = task