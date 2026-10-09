const enc=new TextEncoder();
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const bytes=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
async function signingKey(secret){return crypto.subtle.importKey('raw',enc.encode(secret),'HMAC',false,['sign','verify']);}
async function sign(value,secret){return hex(new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(secret),enc.encode(value))));}
function cookie(request,name){return (request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.split('=').slice(1).join('')||'';}
async function session(request,env){if(!env.SESSION_SECRET)return false;const raw=cookie(request,'cortina_session');const [user,until,mac]=raw.split('.');if(user!=='FERNANDO'||!until||!mac||Number(until)<Date.now())return false;const expected=await sign(user+'.'+until,env.SESSION_SECRET);if(mac.length!==expected.length)return false;let diff=0;for(let i=0;i<mac.length;i++)diff|=mac.charCodeAt(i)^expected.charCodeAt(i);return diff===0;}
function originOK(req){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
export {json,bytes,hex,sign,session,originOK};