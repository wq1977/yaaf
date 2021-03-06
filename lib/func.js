const config = require('./config')

function response(error, body){
    const code  = error === 0 ? 0 : error.code;
    const msg = error === 0 ? 'succ' : typeof(body)==='string' ? body : error.msg;
    const data = typeof(body)==='string' && error !== 0 ? {} : body;
    return JSON.stringify({
        code, msg, data
    });
}

function isValidPhoneNo(phone) {
    return /^1\d{10}$/.test(phone);
}

function random(len) {
    result = '';
    for (let i=0;i<len;i++) {
        result = result + '' + Math.floor(Math.random() * 10) % 9;
    }
    return result;
}

String.prototype.hexEncode = function(){
    var hex, i;

    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("000"+hex).slice(-4);
    }

    return result
}

String.prototype.hexDecode = function(){
    var j;
    var hexes = this.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[j], 16));
    }

    return back;
}

const Hashids = require('hashids');
var hashids = new Hashids(config.common.safehash, 8, 'abcdefghijklmnopqrstuvwxyz0123456789');
function safeid(id) {
    return hashids.encode(id)
}
function desafeid(id) {
    return hashids.decode(id)[0]
}

async function callservice(ctx, service, body) {
    log = ctx.log;
    const fetch = require('node-fetch');
    const config = require('./config');
    res = await fetch(config.service[service].address, {
        method: 'POST',
        body: body.readable ? body : JSON.stringify(body),
        headers: body.readable ? {
            'x-session' : ctx.session,
        } : { 
            'Content-Type': 'application/json',
            'x-session' : ctx.session,
        }
    });
    const status = Number(res.status)
    const rspbody = await res.text();
    log.info(ctx.session, 'call-'+service, body.readable ? 'readable' : JSON.stringify(body), status, rspbody.replace(/(?:\r\n|\r|\n)/g, ''));
    return [status, rspbody];
}

function oss(url) {
    if (url.startsWith('http')) return url
    if (url.startsWith('/')) return url
    return config.common.oss.entry + url
}

let userfuncs = {}
try {
    userfuncs = require('../../../../runtime/plugin/func')
} catch { userfuncs = {} }

module.exports = {
    response,
    random,
    callservice,
    isValidPhoneNo,
    safeid,
    oss,
    desafeid,
    ...userfuncs
}
