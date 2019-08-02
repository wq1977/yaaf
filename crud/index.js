/**
 * 每一张表必有的字段为id,createat,deleteat,updateat,userid
 */

const commonItemMap = (ctx, item) => {
    const result = {}
    for (let key in item) {
        if (key.endsWith('id')) {
            if (item[key] && ctx.func.safeid(item[key])) {
                result[key] = ctx.func.safeid(item[key])
            }
        }
    }
    return result
}


/**
 * 通用创建记录模板，规范创建记录操作
 */
function C(tablename, optsroot) {
    return async (ctx) => {
        const keys = Object.keys(ctx.request.body).filter(key => key !== 'opts')
        const opts = ctx.request.body.opts
        const options = {...optsroot, ...opts}
        const values = keys.map(key => key.endsWith('id') ? ctx.func.desafeid(ctx.request.body[key]) : ctx.request.body[key])
        const userid = (ctx.sessionData && ctx.sessionData.userid) || null
        if (userid) {
            keys.push('userid')
            values.push(userid)    
        }

        if (options.uniq && options.uniq.length > 0) {
            for (let field of options.uniq) {
                if (field in ctx.request.body) {
                    const value = ctx.request.body[field]
                    const tmp_row = await ctx.db.query(`select * from ${tablename} where ${field} = ? limit 1`, [value])
                    if (tmp_row.length > 0) {
                        ctx.error('uniq-field-fail', field, tmp_row[0])
                        ctx.body = ctx.func.response(ctx.errorCode.invalidRequestParam, `${value} 已经存在`)
                        return
                    }
                }
            }
        }

        const res = await ctx.db.query(`insert into ${tablename} (${keys.join(",")}) values (${keys.map(k=>'?').join(",")})`, values, ctx.info)
        const id = res.insertId
        const row = await ctx.db.query(`select * from ${tablename} where id = ?`, [id])
        const result = {...row[0], ...commonItemMap(row[0])}
        const extramap = options.itemmap ? await options.itemmap(ctx, result) : {}
        ctx.body = ctx.func.response(0, {
            ...result,
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

        if (options.precheck) {
            await options.precheck(ctx)
            if (ctx.body) return
        }

        const symbol = ctx.request.body.symbol || {}
        Object.keys(symbol).forEach(key => {
            if (['=', 'in', '&'].indexOf(symbol[key]) < 0) {
                ctx.body = ctx.func.response(ctx.errorCode.invalidRequestParam, `不允许的操作:${symbol[key]}`)
                return
            }
        })
        const query = []
        const values = []
        if (!('userid' in ctx.request.body)) {
            const {userid} = ctx.sessionData
            query.push(`userid ${symbol.userid || '='} ?`)
            values.push(userid)    
        }

        if (!options.includeDeleted) {
            query.push('deleteat is null')
        }

        Object.keys(ctx.request.body).forEach(p=>{
            if (['page', 'perPage', 'opts', 'symbol'].indexOf(p) >= 0) return
            let value = ctx.request.body[p]
            if (value === "not null") {
                query.push(`${p} is not null`)
            } else {
                value = p.endsWith('id') && ctx.request.body[p] ? ctx.func.desafeid(ctx.request.body[p]) : ctx.request.body[p]
                query.push(`${p} ${symbol[p] || '='} ?`)
                values.push(value)
            }
        })
        const rows = await ctx.db.query(`select SQL_CALC_FOUND_ROWS * from ${tablename} where 1=1 and ${query.join(' and ')} ${options.sort ? ('order by QUOTE(' + options.sort + ')') : ''} ${options.desc ? 'desc' : ''} limit ?,?`,
                [...values, (page -1) * perPage, perPage], ctx.info)
        const total = await ctx.db.query('select FOUND_ROWS() as total')
        const items = []
        ctx.rows = rows
        for (let row of rows) {
            const result = {...row, ...commonItemMap(row)}
            const extramap = options.itemmap ? await options.itemmap(ctx, result) : {}
            items.push({
                ...result,
                ...extramap
            })
        }
        ctx.body = ctx.func.response(0, {
            total: total[0].total,
            page, perPage,
            items
        })
    }
}

/**
 * 通用更新记录模板，规范更新记录操作
 */
function U(tablename, optsroot) {
    return async (ctx) => {
        const keys = Object.keys(ctx.request.body).filter(key => key !== 'opts' && key !== 'where')
        const opts = ctx.request.body.opts
        const where = ctx.request.body.where
        const options = {...optsroot, ...opts}
        const values = keys.map(key => key.endsWith('id') ? ctx.func.desafeid(ctx.request.body[key]) : ctx.request.body[key])

        const wherekeys = Object.keys(where)
        const wherevalues = wherekeys.map(key => key.endsWith('id') ? ctx.func.desafeid(where[key]) : where[key])

        if (options.uniq && options.uniq.length > 0) {
            for (let field of options.uniq) {
                if (field in ctx.request.body) {
                    const value = ctx.request.body[field]
                    const tmp_row = await ctx.db.query(`select * from ${tablename} where ${field} = ? and not (${wherekeys.map(r=>r+'=?').join('and')}) limit 1`, [value, ...wherevalues])
                    if (tmp_row.length > 0) {
                        ctx.error('uniq-field-fail', field, tmp_row[0])
                        ctx.body = ctx.func.response(ctx.errorCode.invalidRequestParam, `${value} 已经存在`)
                        return
                    }
                }
            }
        }

        await ctx.db.query(`update ${tablename} set ${keys.map(r => r + '=?').join(',')} where ${wherekeys.map(r=>r+'=?').join('and')}`, [...values, ...wherevalues], ctx.info)
        const row = await ctx.db.query(`select * from ${tablename} where ${wherekeys.map(r=>r+'=?').join('and')}`, [...wherevalues])
        const result = {...row[0], ...commonItemMap(row[0])}
        const extramap = options.itemmap ? await options.itemmap(ctx, result) : {}
        ctx.body = ctx.func.response(0, {
            ...result,
            ...extramap 
        })    
    }
}

/**
 * 通用删除记录模板，规范删除记录操作
 */
function D() {
}

/**
 * 通用路由函数
 * @param {*} task 
 * @param {*} cfg 
 */
function routes(task, cfg) {
    for (let table of task.config.crud.tables) {
        task.post(`/crud/${table}/create`, C(table, cfg))
        task.post(`/crud/${table}/list`, R(table, cfg))
        task.post(`/crud/${table}/update`, U(table, cfg))
    }
}

module.exports = {
    C,R,U,D,routes
}