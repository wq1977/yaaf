const config = require('../../lib/config');
const redis = require('../../lib/redis')(config.redis.url);
module.exports = async (ctx, next)=>{
    if (ctx.config.whitelist && ctx.config.whitelist.list && (ctx.config.whitelist.list.indexOf(ctx.remoteip)>=0 )) {
        return await next();
    }

    //特定 API 每分钟可以接受的 每IP的服务次数 和总次数
    const log = ctx.log;
    let urlkey = ctx.req.url;
    const ip = ctx.remoteip;
    const key = `fc-${ctx.req.url}-${ip}`;
    if (!(urlkey in config.tc)) {
        urlkey='default';
    }
    const value = await redis.incr(key);
    if (value === 1) {
        redis.expire(key, 60);
    } else if (value > config.tc[urlkey].perip) {
        ctx.status = 429;
        log.error({
            session: ctx.session,
            tag: 'fc-429',
            args: [ip, urlkey]});
        return;
    }
    await next();
}