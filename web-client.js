(function(){
'use strict';
let loaded=false, version=0, pending=false, working=false, savedSnapshot='', retryTimer;
const $=id=>document.getElementById(id);
const login=$('webLoginForm'), msg=$('webLoginMsg'), status=$('webStatus');
function showStatus(t){status.hidden=false;status.textContent=t;}
async function api(path,options={}){const r=await fetch('/api/'+path,{credentials:'same-origin',cache:'no-store',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});let out=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(out.error||'Falha no servidor ('+r.status+')'),{status:r.status});return out;}
async function boot(){
 try{const r=await api('data');version=r.version||0;
 // No cloud data exists yet: use the original factory settings, never browser cache from another business.
 db=r.data||clone(defaults);
 if(!r.data){const init=await api('data',{method:'PUT',body:JSON.stringify({data:db,version})});version=init.version;}
 savedSnapshot=JSON.stringify(db);loaded=true;window.CORTINA_WEB_READY=true;
 document.body.classList.add('web-authorized');renderPage('home');
 showStatus('✓ Dados sincronizados');setTimeout(()=>{if(!pending)status.hidden=true},2500);
 }catch(e){msg.textContent=e.status===401?'Informe usuário e senha para entrar.':'Erro ao carregar dados: '+e.message;}
}
window.cortinaQueueSave=function(){if(!loaded)return;pending=true;showStatus('Salvando na nuvem...');clearTimeout(retryTimer);retryTimer=setTimeout(flush,650);};
async function flush(){retryTimer=null;if(!loaded||!pending)return;if(working){retryTimer=setTimeout(flush,1100);return;}working=true;pending=false;let snapshot=JSON.stringify(db);
 try{const r=await api('data',{method:'PUT',body:JSON.stringify({data:JSON.parse(snapshot),version})});version=r.version;savedSnapshot=snapshot;showStatus('✓ Salvo na nuvem');setTimeout(()=>{if(!pending)status.hidden=true},2000);
 }catch(e){pending=true;if(e.status===409){showStatus('CONFLITO: alterações em outro dispositivo. Faça backup antes de recarregar.');alert('Dados alterados em outro dispositivo. Para evitar perda de dados, exporte um backup e recarregue a página. Nenhum dado foi sobrescrito.');}else if(e.status===401){document.body.classList.remove('web-authorized');msg.textContent='Sessão expirada. Entre novamente.';}else{showStatus('Sem sincronização! Verifique conexão.');retryTimer=setTimeout(flush,5000);}}
 finally{working=false;if(pending&& !retryTimer)retryTimer=setTimeout(flush,1000);}
}
login.addEventListener('submit',async e=>{e.preventDefault();const btn=$('webLoginButton');btn.disabled=true;msg.textContent='Validando acesso...';try{await api('login',{method:'POST',body:JSON.stringify({username:login.elements.username.value,password:login.elements.password.value})});login.elements.password.value='';msg.textContent='Carregando sistema...';await boot();}catch(err){msg.textContent=err.message;}finally{btn.disabled=false;}});
window.addEventListener('online',()=>{if(pending)flush();});
window.addEventListener('beforeunload',e=>{if(pending||working){e.preventDefault();e.returnValue='';}});
// Do not access cloud data unless the server validates its signed session.
boot();
})();