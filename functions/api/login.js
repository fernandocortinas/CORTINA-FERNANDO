import {json,sign,originOK,passwordHash,equalString} from './_shared.js';
export async function onRequestPost({request,env}){
 if(!originOK(request))return json({error:'Origem inválida'},403);
 if(!env.APP_PASSWORD||!env.ADMIN_PASSWORD||!env.SESSION_SECRET||!env.DB)return json({error:'Configure APP_PASSWORD, ADMIN_PASSWORD, SESSION_SECRET e DB no Cloudflare'},503);
 let payload;try{payload=await request.json();}catch{return json({error:'Dados inválidos'},400)}
 const name=String(payload.username||'').trim().toUpperCase(), password=String(payload.password||'');
 if(!['ADMIN','FERNANDO'].includes(name)||!password||password.length>256)return json({error:'Usuário ou senha inválidos'},401);
 let allowed=false;
 if(name==='ADMIN')allowed=await equalString(password,env.ADMIN_PASSWORD);
 else {
  const override=await env.DB.prepare('SELECT salt, password_hash FROM user_credentials WHERE username=?').bind('FERNANDO').first();
  allowed=override?await equalString(await passwordHash(password,override.salt),override.password_hash):await equalString(password,env.APP_PASSWORD);
 }
 if(!allowed)return json({error:'Usuário ou senha inválidos'},401);
 const expiry=Date.now()+7*24*3600*1000,token=name+'.'+expiry,mac=await sign(token,env.SESSION_SECRET);
 return json({ok:true,role:name},200,{'Set-Cookie':`cortina_session=${token}.${mac}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`});
}
