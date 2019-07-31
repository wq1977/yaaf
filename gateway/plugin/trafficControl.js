const config = require('../../lib/config');
const redis = require('../../lib/redis')(config.redis.url);
module.exports = async (ctx, next)=>{
    if (ctx.config.whitelist && ctx.config.whitelist.list && (ctx.remoteip in ctx.config.whitelist.list )) {
        //白名单IP地址允许最低限度的校验，不需session，仅限制1分钟内的请求总数
        const key = `fc-whitelist-${ctx.remoteip}`;
        const value = await redis.incr(key);
        if (value === 1) {
            redis.expire(key, 60);
        } else if (value > ctx.config.whitelist.limit) {
            ctx.status = 429;
            log.error(ctx.session,'fc-429', ctx.remoteip);
            return;
        }
        return await next()
    }
    //特定 API 每分钟可以接受的 每IP的服务次数 和总次数
    const log = ctx.log;
    let urlkey = ctx.req.url;
    const key = `tc-${ctx.req.url}`;
    if (!(urlkey in config.tc)) {
        urlkey = 'default';
    }
    const value = await redis.incr(key);
    if (value === 1) {
        redis.expire(key, 60);
    } else if (value > config.tc[urlkey].total) {
        //TODO only allow big person use
        ctx.status = 429;
        log.error(ctx.session,'tc-429', ip, urlkey);
        return;
    }
    await next();
}