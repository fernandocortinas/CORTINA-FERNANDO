import {json,bytes,hex,sign,originOK} from './_shared.js';
export async function onRequestPost({request,env}){
 if(!originOK(request))return json({error:'Origem inválida'},403);
 if(!env.APP_PASSWORD||!env.SESSION_SECRET)return json({error:'Configure os segredos APP_PASSWORD e SESSION_SECRET no Cloudflare'},503);
 let payload;try{payload=await request.json();}catch{return json({error:'Dados inválidos'},400)}
 const name=String(payload.username||'').trim().toUpperCase();const password=String(payload.password||'');
 if(password.length>256)return json({error:'Credenciais inválidas'},401);
 const expected=await bytes('CORTINA_FERNANDO:'+env.APP_PASSWORD),actual=await bytes('CORTINA_FERNANDO:'+password);
 let diff=0;for(let i=0;i<expected.length;i++)diff|=expected[i]^actual[i];
 if(name!=='FERNANDO'||diff!==0)return json({error:'Usuário ou senha inválidos'},401);
 const expiry=Date.now()+7*24*3600*1000;const token='FERNANDO.'+expiry;const mac=await sign(token,env.SESSION_SECRET);
 return json({ok:true},200,{'Set-Cookie':`cortina_session=${token}.${mac}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`});
}