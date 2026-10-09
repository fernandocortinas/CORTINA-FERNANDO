const enc=new TextEncoder();
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const bytes=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
async function signingKey(secret){return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function sign(value,secret){return hex(new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(secret),enc.encode(value))));}
function cookie(request,name){return (request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.split('=').slice(1).join('')||'';}
async function session(request,env){
 if(!env.SESSION_SECRET)return null;
 const raw=cookie(request,'cortina_session');const [user,until,mac]=raw.split('.');
 if(!['ADMIN','FERNANDO'].includes(user)||!until||!/^\d+$/.test(until)||!mac||Number(until)<Date.now())return null;
 const expected=await sign(user+'.'+until,env.SESSION_SECRET);
 if(mac.length!==expected.length)return null;
 let diff=0;for(let i=0;i<mac.length;i++)diff|=mac.charCodeAt(i)^expected.charCodeAt(i);
 return diff===0?user:null;
}
async function passwordHash(password,salt){
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 const output=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:150000,hash:'SHA-256'},key,256);
 return hex(new Uint8Array(output));
}
async function equalString(a,b){const x=await bytes(a),y=await bytes(b);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
function originOK(req){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
export {json,bytes,hex,sign,session,originOK,passwordHash,equalString};