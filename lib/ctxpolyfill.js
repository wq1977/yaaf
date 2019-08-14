let cache = require('./redis')(require('./config').redis.url)

const jsonlog = function(log, ctx, tag, ...args){
  log({session: ctx.session, remoteip: ctx.remoteip,  type:'log', tag, args})
}

module.exports = async (ctx, next) => {
  ctx.log = require('./log').get(ctx._module || '__nomodule__')
  ctx.config = require('./config');
  ctx.info = jsonlog.bind(null, ctx.log.info.bind(ctx.log), ctx)      
  ctx.error = jsonlog.bind(null, ctx.log.error.bind(ctx.log), ctx)  
  ctx.warn = jsonlog.bind(null, ctx.log.warn.bind(ctx.log), ctx) 
  ctx.remoteip = ctx.request.headers['x-real-ip'] || ctx.request.headers['x-forwarded-for'] || ctx.request.ip
  if ('x-session' in ctx.req.headers) {
      ctx.session = ctx.req.headers['x-session'];
      // ctx.info = jsonlog.bind(null, ctx.log.info.bind(ctx.log), ctx.session)        
      // ctx.error = jsonlog.bind(null, ctx.log.error.bind(ctx.log), ctx.session)                 
      // ctx.warn = jsonlog.bind(null, ctx.log.warn.bind(ctx.log), ctx.session)           
  }
  ctx.errorCode = require('./errorCode')
  ctx.func = require('./func')
  ctx.cache = cache
  await next();
}