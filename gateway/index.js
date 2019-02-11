const task = require('..')('gateway', {
    parseBody: false
});

const proxy = require('koa-server-http-proxy');
(task.config.gateway.services || []).map((service)=>{
    task.api.use(proxy(service[0], { 
        target: service[1], 
        changeOrigin: true,
        onError: (err, req, res)=>{
            const hostname = (req.headers && req.headers.host) || (req.hostname || req.host) // (websocket) || (node0.10 || node 4/5)
            task.error(req.headers["x-session"], 'proxy-err', req.url, hostname, service[1], err.code);
            res.writeHead(501, {
                'Content-Type': 'text/plain'
            })
            res.end(
                'Something went wrong. And we are reporting a custom error message.'
            )
        },
        onProxyReq:(proxyReq, req, res)=>{
            const hostname = (req.headers && req.headers.host) || (req.hostname || req.host) // (websocket) || (node0.10 || node 4/5)
            task.info(req.headers["x-session"], 'proxy-req', req.url, hostname, service[1], '...');
        },
        onProxyRes:(proxyRes, req, res)=>{
            const hostname = (req.headers && req.headers.host) || (req.hostname || req.host) // (websocket) || (node0.10 || node 4/5)
            task.info(req.headers["x-session"], 'proxy-rsp', req.url, hostname, service[1], proxyRes.statusCode);
        },
    }));
})

module.exports = task