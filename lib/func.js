const errorCode = require('./errorCode');

function response(error, body){
    const code  = error === 0 ? 0 : error.code;
    const msg = error === 0 ? 'succ' : typeof(body)==='string' ? body : error.msg;
    const data = typeof(body)==='string' ? {} : body;
    return JSON.stringify({
        code, msg, data
    });
}

function isValidPhoneNo(phone) {
    return /^1[34578]\d{9}$/.test(phone);
}

function random(len) {
    result = '';
    for (let i=0;i<len;i++) {
        result = result + '' + Math.floor(Math.random() * 10) % 9;
    }
    return result;
}

async function callservice(ctx, service, body) {
    log = ctx.log;
    const fetch = require('node-fetch');
    const config = require('./config');
    res = await fetch(config.service[service].address, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 
            'Content-Type': 'application/json',
            'x-session' : ctx.session,
        }
    });
    const status = Number(res.status)
    const rspbody = await res.text();
    log.info(ctx.session, 'call-'+service, body, status, rspbody);
    return [status, rspbody];
}

module.exports = {
    response,
    random,
    callservice,
    isValidPhoneNo
}