import {json,session,originOK,passwordHash} from './_shared.js';
export async function onRequestGet({request,env}){
 const role=await session(request,env);
 return role?json({role}):json({error:'Acesso não autorizado'},401);
}
export async function onRequestPut({request,env}){
 if(!originOK(request))return json({error:'Origem inválida'},403);
 if(await session(request,env)!=='ADMIN')return json({error:'Apenas ADMIN pode alterar a senha'},403);
 let body;try{body=await request.json()}catch{return json({error:'Dados inválidos'},400)}
 const password=String(body.password||'');
 if(password.length<12||password.length>128)return json({error:'A senha deve ter de 12 a 128 caracteres'},400);
 const salt=Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
 const password_hash=await passwordHash(password,salt);
 await env.DB.prepare(`INSERT INTO user_credentials(username,salt,password_hash,updated_at) VALUES('FERNANDO',?,?,CURRENT_TIMESTAMP) ON CONFLICT(username) DO UPDATE SET salt=excluded.salt,password_hash=excluded.password_hash,updated_at=CURRENT_TIMESTAMP`).bind(salt,password_hash).run();
 return json({ok:true});
}
