const func = require('../func')

describe('Basic function', () => {
    it('hashid', ()=>{
        const id = func.safeid('table1', 1)
        const [table, aid] = func.desafeid(id)
        expect(aid).toEqual(1)
        expect(table).toEqual('table1')
    })
})
