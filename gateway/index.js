require('events').EventEmitter.defaultMaxListeners = 0
const task = require('..')('gateway', {
    parseBody: false
});

const proxy = require('koa-server-http-proxy');

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
    eldstart(addr);
}).bind(task);

module.exports = task