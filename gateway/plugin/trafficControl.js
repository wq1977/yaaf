const config = require('../../lib/config');
const redis = require('../../lib/redis')(config.redis.url);
module.exports = async (ctx, next)=>{
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