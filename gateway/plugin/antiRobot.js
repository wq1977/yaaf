const config = require('../../lib/config');
const redis = require('../../lib/redis')(config.redis.url);
const {response} = require('../../lib/func');
const errorCode = require('../../lib/errorCode');

module.exports = async(ctx, next)=>{
    if (ctx.config.whitelist && ctx.config.whitelist.list && (ctx.config.whitelist.list.indexOf(ctx.remoteip)>=0 )) {
        //白名单IP地址允许最低限度的校验，不需session，仅限制1分钟内的请求总数
        return await next();
    }

    const log = ctx.log;
    // 如果没有带 session 消息头的消息将被认为是 机器人发送的消息 
    if (!ctx.session) {
        ctx.status = 401;
        log.error(ctx.session,'robot-req-no-session',ctx.remoteip, ctx.req.url);
        return;
    }
    // 如果带的 session 不是有效的 session， 将被认为是 session 超时 或者是机器人发送的消息
    const createat = await redis.hget(`session-${ctx.session}`, 'createat');
    if (!createat) {
        ctx.body = response(errorCode.sessionTimeout);
        log.error(ctx.session,'robot-req-session-timeout', ctx.req.url, ctx.session);
        return;        
    }
    // 如果发送的 session 太快，将被认为是机器人发送的消息
    const duration = new Date().getTime() - createat;
    const delta = 'reqDelta' in config.antirobot ? config.antirobot.reqDelta : 1000;
    if ((ctx.req.url === '/code') && (duration < delta)) {
        ctx.status = 403;
        log.error(ctx.session,'robot-code-too-fast',ctx.remoteip, ctx.req.url, duration, delta);
        return;
    }    

    // 如果未登录就请求api，将被认为是机器人发送的消息
    const login = await redis.hget(`session-${ctx.session}`, 'login');
    let urlkey = ctx.req.url // in config.tc ? ctx.req.url : 'default';
    const defaulttc = config.tc['default']
    const apitc = {...defaulttc, ...(config.tc[urlkey] || {})}
    const userrole = await redis.hget(`session-${ctx.session}`, 'role');
    const apirole = apitc.role
    if (apirole !== null) {
        if ((apirole === 0 && userrole === null) ||
            ((apirole > 0) && !(apirole & userrole))) {
                ctx.status=403;
                log.error(ctx.session,'api-need-role',ctx.remoteip, ctx.req.url, apirole, userrole, apitc);
                return;        
            }
    }

    //TODO 如果发送的 session 所代表的指纹 被认为是 恶意的指纹，将被认为是 机器人发送的消息

    if (apirole !== null) {
        //如果通过了检查，就重制session的超时时间
        ctx.info('refresh-session-timeout', config.common.expire.session)
        await redis.expire(`session-${ctx.session}`, config.common.expire.session);
    }


    await next();
}