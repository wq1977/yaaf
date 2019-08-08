const {response} = require('../../lib/func');
const config = require('../../lib/config');
const redis = require('../../lib/redis')(config.redis.url);

module.exports = async(ctx, next)=>{
    if (ctx.req.method === 'POST' && ctx.req.url === '/session') {
        const log = ctx.log;

        if (ctx.session) {
            log.info({
                session: ctx.session,
                tag: 'invalidate-old-session',
                args: [ctx.session]});
            await redis.del(`session-${ctx.session}`);
        }

        const getRawBody = require('raw-body');
        const rawbody = await getRawBody(ctx.req, {
            length: ctx.req.headers['content-length'],
            limit: '1mb',
            encoding: 'utf-8',
        });
        try {
            ctx.request.body = JSON.parse(rawbody);
        } catch (ex) {
            log.error({
                session: ctx.session,
                tag: 'json-body-error',
                args: [rawbody, ex]
            });
            ctx.status = 403;
            return;
        }

        // 检查当前已经存在的 redis 是否超过可以支持的上限，如果已经超过，返回错误码
        const sessions = await redis.keys('session-*');
        if (sessions.length >= config.common.quota.session){
            ctx.status = 403;
            ctx.message = 'Too many sessions';
            log.error({
                session: ctx.session, 
                tag: 'create-session',
                args: ['too many sessions']});
            return;
        }
        // 在 redis 中创建一个 session 并且初始化
        const uuidv4 = require('uuid/v4');
        const session = uuidv4();
        await redis.hset(`session-${session}`, 'createat', new Date().getTime());
        await redis.expire(`session-${session}`, 180); //三分钟内没有登录的session将会过期
        ctx.session = session;
        // 返回创建的 session
        ctx.body = response(0, session)
        return;
    } else {
        await next();
    }
}