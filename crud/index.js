/**
 * 每一张表必有的字段为id,createat,deleteat,updateat
 */

/**
 * 通用创建记录模板，规范创建记录操作
 */
function C() {
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
        ctx.body = ctx.func.response(0, {
            total: total[0].total,
            page, perPage,
            items: rows.map(r => ({
                ...r,
                id: ctx.func.safeid(r.id),
                ...(options.itemmap ? options.itemmap(ctx, r) : {}) 
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