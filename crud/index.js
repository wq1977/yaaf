/**
 * 每一张表必有的字段为id,createat,deleteat,updateat,userid
 */

/**
 * 通用创建记录模板，规范创建记录操作
 */
function C(tablename, optsroot) {
    return async (ctx) => {
        const keys = Object.keys(ctx.request.body).filter(key => key !== 'opts')
        const opts = ctx.request.body.opts
        const options = {...optsroot, ...opts}
        const values = keys.map(key => ctx.request.body[key])
        const {userid} = ctx.sessionData
        if (userid) {
            keys.push('userid')
            values.push(userid)    
        }
        const res = await ctx.db.query(`insert into ${tablename} (${keys.join(",")}) values (${keys.map(k=>'?').join(",")})`, values, ctx.info)
        const id = res.insertId
        const row = await ctx.db.query(`select * from ${tablename} where id = ?`, [id])
        const extramap = options.itemmap ? await options.itemmap(ctx, row[0]) : {}
        ctx.body = ctx.func.response(0, {
            ...row[0],
            id: ctx.func.safeid(row[0].id),
            ...extramap 
        })    
    }
}

/**
 * 通用获取记录模板，规范获取记录操作
 * 
 * 通用options包括 sort: [sort 字段名], desc: [true false]
 * 
 */
function R(tablename, optsroot) {
    return async (ctx) => {
        let {page, perPage, opts} = ctx.request.body
        page = page || 1
        perPage = perPage || optsroot.perPage || 1000
        const options = {...optsroot, ...opts}
        const query = []
        const values = []
        if (!options.includeDeleted) {
            query.push('deleteat is null')
        }
        const rows = await ctx.db.query(`select SQL_CALC_FOUND_ROWS * from ${tablename} where 1=1 and ${query.join(' and ')} ${options.sort ? ('order by QUOTE(' + options.sort + ')') : ''} ${options.desc ? 'desc' : ''} limit ?,?`,
                [...values, (page -1) * perPage, perPage], ctx.info)
        const total = await ctx.db.query('select FOUND_ROWS() as total')
        const extramap = options.itemmap ? await options.itemmap(ctx, row[0]) : {}
        ctx.body = ctx.func.response(0, {
            total: total[0].total,
            page, perPage,
            items: rows.map(r => ({
                ...r,
                id: ctx.func.safeid(r.id),
                ...extramap
            }))
        })
    }
}

/**
 * 通用更新记录模板，规范更新记录操作
 */
function U() {
}

/**
 * 通用删除记录模板，规范删除记录操作
 */
function D() {
}

module.exports = {
    C,R,U,D
}