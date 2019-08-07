let cache = require('./redis')(require('./config').redis.url)
module.exports = async (ctx, next) => {
  ctx.log = require('./log').get(ctx._module || '__nomodule__')
  ctx.config = require('./config');
  ctx.info = ctx.log.info.bind(ctx.log,'no-session');        
  ctx.error = ctx.log.error.bind(ctx.log,'no-session');   
  ctx.warn = ctx.log.warn.bind(ctx.log,'no-session');
  ctx.remoteip = ctx.request.ip
  if ('x-session' in ctx.req.headers) {
      ctx.session = ctx.req.headers['x-session'];
      ctx.info = ctx.log.info.bind(ctx.log, ctx.session);        
      ctx.error = ctx.log.error.bind(ctx.log, ctx.session);                
      ctx.warn = ctx.log.warn.bind(ctx.log, ctx.session);                
  }
  ctx.errorCode = require('./errorCode')
  ctx.func = require('./func')
  ctx.cache = cache
  await next();
}