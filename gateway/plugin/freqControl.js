const config = require('../../lib/config');
const redis = require('../../lib/redis')(config.redis.url);
module.exports = async (ctx, next)=>{
    //特定 API 每分钟可以接受的 每IP的服务次数 和总次数
    const log = ctx.log;
    const url = ctx.req.url;
    const ip = ctx.request.ip;
    const key = `fc-${url}-${ip}`;
    if (!(url in config.tc)) {
        ctx.status = 501;
        log.error(ctx.session,'fc-no-cnf',url);
        return;
    }
    const value = await redis.incr(key);
    if (value === 1) {
        redis.expire(key, 60);
    } else if (value > config.tc[url].perip) {
        ctx.status = 429;
        log.error(ctx.session,'fc-429',ip, url);
        return;
    }
    await next();
}