require('events').EventEmitter.defaultMaxListeners = 0
const task = require('..')('gateway', {
    parseBody: false
});

const proxy = require('koa-server-http-proxy');
const koaConnect = require('koa2-connect')
const httpProxy = require('http-proxy-middleware')

const routemap = (task.config.gateway.services || []).reduce((r,v) => {r[v]=1; return r;}, {})
const proxymap = {}
async function normalroute(ctx, next) {
    if (!(ctx.request.path in routemap)) {
        if (!(ctx.request.path in proxymap)) {
            const servicename = ctx.request.path.split('/').splice(1,1).pop()
            if (servicename && task.config[servicename] && task.config[servicename].port) {
                proxymap[ctx.request.path] = httpProxy(ctx.request.path, {
                    target: `http://127.0.0.1:${task.config[servicename].port}`, 
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
        if (ctx.request.path in proxymap) {
            await koaConnect(proxymap[ctx.request.path])(ctx, next)
        } else {
            ctx.status = 404
        }
    } else {
        await next()
    }
}

const eldstart = task.start;
task.start = ((addr)=>{
    (task.config.gateway.services || []).map((service)=>{
        task.api.use(proxy(service[0], { 
            target: service[1], 
            changeOrigin: true,
            onError: (err, req, res)=>{
                res.writeHead(501, {
                    'Content-Type': 'text/plain'
                })
                res.end(
                    'Something went wrong. And we are reporting a custom error message.'
                )
            },
        }));
    })
    task.api.use(normalroute)
    eldstart(addr);
}).bind(task);

module.exports = task