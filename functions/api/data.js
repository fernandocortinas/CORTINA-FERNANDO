import {json,session,originOK} from './_shared.js';
export async function onRequestGet({request,env}){
 if(!await session(request,env))return json({error:'Acesso não autorizado'},401);
 const row=await env.DB.prepare('SELECT data,version FROM company_data WHERE id=1').first();
 return json({data:row?JSON.parse(row.data):null,version:row?.version||0});
}
export async function onRequestPut({request,env}){
 if(!originOK(request))return json({error:'Origem inválida'},403);
 if(!await session(request,env))return json({error:'Acesso não autorizado'},401);
 let body;try{body=await request.json()}catch{return json({error:'Dados inválidos'},400)}
 if(!body.data||typeof body.data!=='object'||Array.isArray(body.data)||!Number.isInteger(body.version))return json({error:'Formato inválido'},400);
 // Validação de duplicidade baseada no estado persistido: tolera duplicatas históricas,
 // mas impede que uma nova gravação aumente sua quantidade.
 const activeOrders=(body.data.orders||[]).filter(o=>o.status!=='Cancelado');
 const counts=new Map();for(const o of activeOrders){const key=String(o.quoteNumber||'').trim();if(key)counts.set(key,(counts.get(key)||0)+1);}
 const duplicated=[...counts].filter(([key,count])=>count>1);
 if(duplicated.length){
   const existing=await env.DB.prepare('SELECT data FROM company_data WHERE id=1').first();
   let old={};try{old=existing?JSON.parse(existing.data):{};}catch{}
   const oldCounts=new Map();for(const o of old.orders||[]){if(o.status==='Cancelado')continue;const key=String(o.quoteNumber||'').trim();if(key)oldCounts.set(key,(oldCounts.get(key)||0)+1);}
   if(duplicated.some(([key,count])=>count>(oldCounts.get(key)||0)))return json({error:'Não é permitido gerar novos pedidos duplicados para o mesmo orçamento.'},409);
 }
 const data=JSON.stringify(body.data);if(data.length>8_000_000)return json({error:'Dados muito grandes'},413);
 if(body.version===0){let result=await env.DB.prepare('INSERT OR IGNORE INTO company_data(id,data,version) VALUES(1,?,1)').bind(data).run();if(result.meta.changes===1)return json({version:1});return json({error:'Dados alterados em outro dispositivo'},409);}
 const result=await env.DB.prepare('UPDATE company_data SET data=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=1 AND version=?').bind(data,body.version).run();
 if(!result.meta.changes)return json({error:'Dados alterados em outro dispositivo'},409);
 return json({version:body.version+1});
}