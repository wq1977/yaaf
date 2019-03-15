const func = require('../func')

describe('Basic function', () => {
    it('hashid', ()=>{
        const id = func.safeid(1)
        console.log(id)
        const aid = func.desafeid(id)
        expect(aid).toEqual(1)
    })
})
