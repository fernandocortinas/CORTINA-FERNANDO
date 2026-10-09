import {json,originOK} from './_shared.js';
export async function onRequestPost({request}){
 if(!originOK(request))return json({error:'Origem inválida'},403);
 return json({ok:true},200,{'set-cookie':'cortina_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
}
