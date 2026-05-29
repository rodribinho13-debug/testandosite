/*! PROJECT.IA - IA Chat (Pergunte ao seu projeto) v1
 *  Modulo isolado e tolerante a falhas.
 *  Requer: window.sb, window._user, window._org
 *  Opcional: window._curProject ou window.curProj
 */
(function(w){'use strict';
try {

const IA = w.PIAChat = {};

const SB_URL = w.SUPABASE_URL || 'https://toapdhfouuedaexgqlsv.supabase.co';
const SB_KEY = w.SUPABASE_KEY || 'sb_publishable_qVVBatpB_ppDLR6QcG8QgQ_hVYW0h8Q';
// Helper: pega sb global ou cria local
function _getSb(){
  if(w.sb) return w.sb;
  if(w.supabase && typeof w.supabase.createClient === 'function'){
    if(w.__pia_sb){ w.sb = w.__pia_sb; return w.sb; }
    try { w.sb = w.__pia_sb = w.supabase.createClient(SB_URL, SB_KEY, { auth: { storageKey:'sb-toapdhfouuedaexgqlsv-auth-token', persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }); return w.sb; } catch(e){ console.warn('[ia-chat] createClient falhou:', e); }
  }
  return null;
}


function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function _ri(){try{w.lucide && w.lucide.createIcons();}catch(_){}}

// Converte markdown basico para HTML
function md(text){
  if(!text) return '';
  let s = esc(text);
  // Negrito
  s = s.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  // Italico
  s = s.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
  // Codigo inline
  s = s.replace(/`([^`]+)`/g, '<code style="background:#F1F5F9;color:#1E293B;padding:1px 5px;border-radius:4px;font-family:JetBrains Mono,monospace;font-size:.9em">$1</code>');
  // Links Markdown [texto](url) — usados pra fontes do Google Search
  s = s.replace(/\[([^\]]+)\]\((https?:&#x2F;&#x2F;[^\s)]+|https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#1D4ED8;text-decoration:underline;word-break:break-all">$1</a>');
  // Linha horizontal --- vira hr
  s = s.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #E2E8F0;margin:10px 0">');
  // Headings simples ### ##
  s = s.replace(/^### (.+)$/gm, '<div style="font-weight:700;color:#0F172A;margin:10px 0 4px;font-size:13.5px">$1</div>');
  s = s.replace(/^## (.+)$/gm, '<div style="font-weight:700;color:#0F172A;margin:12px 0 6px;font-size:15px">$1</div>');
  s = s.replace(/^# (.+)$/gm, '<div style="font-weight:800;color:#0F172A;margin:14px 0 8px;font-size:16px">$1</div>');
  // Bullets - linhas iniciando com - ou *
  s = s.replace(/^[\-\*]\s+(.+)$/gm, '<div style="padding-left:14px;position:relative;margin:3px 0"><span style="position:absolute;left:0;color:#1E40AF">•</span>$1</div>');
  // Quebras de linha duplas viram paragrafo
  s = s.replace(/\n\n+/g, '</p><p style="margin:8px 0">');
  s = '<p style="margin:0">' + s + '</p>';
  // Quebras simples viram br dentro do paragrafo
  s = s.replace(/(?<!>)\n(?!<)/g, '<br>');
  return s;
}

let _history = [];
let _open = false;
let _pendingAttachments = []; // [{name, mime_type, data_base64, size}]

IA.SUGGESTIONS = [
  '📊 Gere um relatório executivo do projeto em 1 página',
  '⚠️ Quais juntas estão reprovadas ou pendentes?',
  '🏗️ Quanto tempo um pedreiro leva pra concretar 20 m³?',
  '🌐 Qual o sindicato dos trabalhadores da indústria no Maranhão?',
  '🧮 Calcule o BDI completo pra obra industrial de R$ 5 milhões',
  '📋 Resuma as principais mudanças da última revisão da NR-13',
  '💡 Me dê 5 ideias de melhoria pra esse projeto',
  '🔍 Pesquise fornecedores de válvulas em São Luís MA'
];

function getProjectId(){
  return (w._curProject && w._curProject.id) || w.curProj || null;
}

function getProjectName(){
  if(w._curProject && w._curProject.name) return w._curProject.name;
  if(w.projects && w.curProj){
    const p = w.projects.find(x=>x.id===w.curProj);
    if(p) return p.name;
  }
  return null;
}

IA.mountButton = function(){
  if(document.getElementById('pia-chat-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'pia-chat-btn';
  btn.title = 'Pergunte à IA sobre seu projeto';
  btn.style.cssText = 'position:fixed;bottom:22px;right:22px;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#06B6D4 0%,#7C3AED 100%);color:#fff;border:none;cursor:pointer;box-shadow:0 8px 24px rgba(124,58,237,.35);z-index:99999;display:flex;align-items:center;justify-content:center;transition:transform .15s,box-shadow .15s';
  btn.onmouseover = ()=>{ btn.style.transform='scale(1.08)'; btn.style.boxShadow='0 12px 32px rgba(124,58,237,.5)'; };
  btn.onmouseout = ()=>{ btn.style.transform=''; btn.style.boxShadow='0 8px 24px rgba(124,58,237,.35)'; };
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.39 4.42L19 9l-4 3.9 1 5.6L12 16l-4 2.5 1-5.6L5 9l4.61-1.58L12 3z"/></svg>';
  btn.onclick = ()=> IA.toggle();
  document.body.appendChild(btn);
};

IA.toggle = function(){
  if(_open){ IA.close(); } else { IA.open(); }
};

IA.open = function(){
  if(_open) return;
  _open = true;
  const projName = getProjectName();
  const projId = getProjectId();

  const panel = document.createElement('div');
  panel.id = 'pia-chat-panel';
  panel.style.cssText = 'position:fixed;top:0;right:0;width:min(460px,95vw);height:100vh;background:#fff;box-shadow:-20px 0 60px rgba(10,22,40,.18);z-index:9001;display:flex;flex-direction:column;font-family:Inter,-apple-system,Segoe UI,sans-serif;animation:pia-slidein .25s ease-out';

  // Header gradient
  let header = '<div style="background:linear-gradient(135deg,#06B6D4 0%,#7C3AED 100%);color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px">'
    + '<div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.39 4.42L19 9l-4 3.9 1 5.6L12 16l-4 2.5 1-5.6L5 9l4.61-1.58L12 3z"/></svg></div>'
    + '<div style="flex:1"><div style="font-size:15px;font-weight:800;letter-spacing:-.2px">IA do Projeto</div>'
    + '<div style="font-size:11.5px;opacity:.9;margin-top:1px">' + (projName ? 'Contexto: <strong>'+esc(projName)+'</strong>' : 'Sem projeto selecionado') + '</div></div>'
    + '<button id="pia-chat-close" style="background:rgba(255,255,255,.15);border:none;cursor:pointer;color:#fff;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700">×</button>'
    + '</div>';

  // Container das mensagens
  let body = '<div id="pia-chat-msgs" style="flex:1;overflow-y:auto;padding:18px;background:linear-gradient(180deg,#FAFBFD 0%,#F1F5F9 100%);display:flex;flex-direction:column;gap:10px"></div>';

  // Input + barra de anexos
  let footer = '<div style="background:#fff;border-top:1px solid #E2E8F0;padding:12px">'
    + '<div id="pia-chat-attbar" style="display:none;flex-wrap:wrap;gap:6px;margin-bottom:8px"></div>'
    + '<div style="display:flex;gap:6px;align-items:flex-end">'
    + '<input id="pia-chat-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.csv,.txt" multiple style="display:none">'
    + '<button id="pia-chat-attach" title="Anexar PDF, imagem ou texto" style="background:#F1F5F9;border:1px solid #E2E8F0;color:#475569;width:38px;height:42px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.83l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>'
    + '<textarea id="pia-chat-input" rows="1" placeholder="Pergunte qualquer coisa — obra, web, ideias, calculos, conselhos…" style="flex:1;padding:10px 14px;border:1px solid #E2E8F0;border-radius:12px;font-size:13px;font-family:inherit;outline:none;resize:none;max-height:120px;min-height:42px;line-height:1.4"></textarea>'
    + '<button id="pia-chat-send" style="background:linear-gradient(135deg,#06B6D4 0%,#7C3AED 100%);color:#fff;border:none;width:42px;height:42px;border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>'
    + '</div>'
    + '<div style="font-size:10.5px;color:#94A3B8;margin-top:6px;text-align:center">Busca web ativa · Anexe arquivos com 📎 · IA pode errar — confira dados críticos.</div>'
    + '</div>';

  panel.innerHTML = header + body + footer;

  // animacao
  if(!document.getElementById('pia-chat-style')){
    const st = document.createElement('style');
    st.id = 'pia-chat-style';
    st.textContent = '@keyframes pia-slidein{from{transform:translateX(100%);opacity:.5}to{transform:translateX(0);opacity:1}}'
      + '@keyframes pia-typing{0%,60%,100%{opacity:.3}30%{opacity:1}}'
      + '.pia-typing span{display:inline-block;width:6px;height:6px;border-radius:50%;background:#7C3AED;margin:0 2px;animation:pia-typing 1.4s infinite}'
      + '.pia-typing span:nth-child(2){animation-delay:.2s}.pia-typing span:nth-child(3){animation-delay:.4s}';
    document.head.appendChild(st);
  }
  document.body.appendChild(panel);

  // Mensagem de boas-vindas + sugestoes
  const msgs = panel.querySelector('#pia-chat-msgs');
  if(_history.length === 0){
    const welcome = '<div style="background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,.04)">'
      + '<div style="font-size:13.5px;color:#0F172A;font-weight:600;margin-bottom:6px">👋 Olá! Sou seu assistente de IA</div>'
      + '<div style="font-size:12.5px;color:#475569;line-height:1.55">Posso responder <strong>qualquer pergunta</strong> — sobre ' + (projName ? '<strong>'+esc(projName)+'</strong>, ' : '') + 'engenharia, cálculos, ideias, código, conselhos, ou qualquer assunto. Busco informação na web quando precisa e analiso arquivos que você anexar (📎).</div>'
      + (projId ? '' : '<div style="margin-top:10px;font-size:11.5px;color:#92400E;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:8px 11px">💡 Selecione um projeto pra eu acessar os dados da obra.</div>')
      + '</div>';
    const suggBlock = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">'
      + IA.SUGGESTIONS.map((s,i)=>'<button data-sugg="'+i+'" style="background:#fff;border:1px solid #E2E8F0;color:#334155;padding:7px 12px;border-radius:18px;cursor:pointer;font-size:11.5px;font-family:inherit;text-align:left;transition:all .12s" onmouseover="this.style.borderColor=\'#7C3AED\';this.style.background=\'#F5F3FF\';this.style.color=\'#5B21B6\'" onmouseout="this.style.borderColor=\'#E2E8F0\';this.style.background=\'#fff\';this.style.color=\'#334155\'">'+s+'</button>').join('')
      + '</div>';
    msgs.innerHTML = welcome + suggBlock;
    msgs.querySelectorAll('[data-sugg]').forEach(b=>{
      b.onclick = ()=>{
        const idx = parseInt(b.dataset.sugg);
        const text = IA.SUGGESTIONS[idx].replace(/^[^\s]+\s/, ''); // remove emoji do inicio
        document.getElementById('pia-chat-input').value = text;
        IA.send();
      };
    });
  } else {
    // restaura historico
    _history.forEach(h => IA._appendMessage(h.role, h.text, true));
  }

  // Wire handlers
  panel.querySelector('#pia-chat-close').onclick = ()=> IA.close();
  const inp = panel.querySelector('#pia-chat-input');
  inp.onkeydown = (e)=>{
    if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); IA.send(); }
    // Auto-resize
    setTimeout(()=>{ inp.style.height='auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; }, 0);
  };
  inp.oninput = ()=>{ inp.style.height='auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; };
  panel.querySelector('#pia-chat-send').onclick = ()=> IA.send();
  // Upload de arquivos (PDF/imagem/texto)
  const fileIn = panel.querySelector('#pia-chat-file');
  panel.querySelector('#pia-chat-attach').onclick = ()=> fileIn.click();
  fileIn.onchange = async ()=>{
    const files = Array.from(fileIn.files || []);
    for(const f of files){
      if(f.size > 6 * 1024 * 1024){ alert('Arquivo "'+f.name+'" tem mais de 6MB. Limite por arquivo: 6MB.'); continue; }
      if(_pendingAttachments.length >= 5){ alert('Maximo 5 arquivos por mensagem.'); break; }
      try {
        const b64 = await new Promise((res, rej)=>{
          const r = new FileReader();
          r.onload = ()=> res(String(r.result).split(',')[1] || '');
          r.onerror = rej;
          r.readAsDataURL(f);
        });
        _pendingAttachments.push({ name: f.name, mime_type: f.type || 'application/octet-stream', data_base64: b64, size: f.size });
      } catch(e){ console.warn('[ia-chat upload]', e); }
    }
    fileIn.value = '';
    IA._renderAttachments();
  };
  setTimeout(()=> inp.focus(), 100);
  IA._renderAttachments();
};

IA._renderAttachments = function(){
  const bar = document.getElementById('pia-chat-attbar');
  if(!bar) return;
  if(_pendingAttachments.length === 0){ bar.style.display='none'; bar.innerHTML=''; return; }
  bar.style.display = 'flex';
  bar.innerHTML = _pendingAttachments.map(function(a, i){
    var kb = Math.round(a.size/1024);
    var icon = a.mime_type.startsWith('image/') ? '🖼️' : (a.mime_type.indexOf('pdf')>=0 ? '📄' : '📎');
    return '<div style="background:#F5F3FF;border:1px solid #DDD6FE;color:#5B21B6;padding:5px 9px;border-radius:14px;font-size:11px;display:flex;align-items:center;gap:6px"><span>'+icon+'</span><span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(a.name)+'</span><span style="color:#7C3AED;opacity:.7">'+kb+'KB</span><button data-att-rm="'+i+'" style="background:none;border:none;cursor:pointer;color:#7C3AED;font-weight:700;font-size:13px;padding:0 0 0 2px">×</button></div>';
  }).join('');
  bar.querySelectorAll('[data-att-rm]').forEach(function(b){
    b.onclick = function(){
      _pendingAttachments.splice(parseInt(b.dataset.attRm), 1);
      IA._renderAttachments();
    };
  });
};

IA.close = function(){
  _open = false;
  const p = document.getElementById('pia-chat-panel');
  if(p) p.remove();
};

IA._appendMessage = function(role, text, skipHistory){
  const msgs = document.getElementById('pia-chat-msgs');
  if(!msgs) return;
  // Remove welcome block ao primeira mensagem
  if(!skipHistory){
    const welcome = msgs.querySelector('div:first-child');
    if(welcome && _history.length === 0){ msgs.innerHTML = ''; }
  }
  const wrap = document.createElement('div');
  if(role === 'user'){
    wrap.style.cssText = 'align-self:flex-end;max-width:85%;background:linear-gradient(135deg,#1E40AF 0%,#2563EB 100%);color:#fff;padding:10px 14px;border-radius:16px 16px 4px 16px;font-size:13px;line-height:1.5;box-shadow:0 2px 6px rgba(30,64,175,.18);white-space:pre-wrap;word-break:break-word';
    wrap.textContent = text;
  } else {
    wrap.style.cssText = 'align-self:flex-start;max-width:92%;background:#fff;border:1px solid #E2E8F0;color:#1E293B;padding:12px 14px;border-radius:16px 16px 16px 4px;font-size:13px;line-height:1.55;box-shadow:0 1px 3px rgba(0,0,0,.04)';
    wrap.innerHTML = md(text);
  }
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
  if(!skipHistory){
    _history.push({ role, text });
    if(_history.length > 20) _history = _history.slice(-20);
  }
};

IA._appendTyping = function(){
  const msgs = document.getElementById('pia-chat-msgs');
  if(!msgs) return;
  const wrap = document.createElement('div');
  wrap.id = 'pia-typing-ind';
  wrap.style.cssText = 'align-self:flex-start;background:#fff;border:1px solid #E2E8F0;padding:14px 16px;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.04)';
  wrap.innerHTML = '<div class="pia-typing"><span></span><span></span><span></span></div>';
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
};
IA._removeTyping = function(){ const t = document.getElementById('pia-typing-ind'); if(t) t.remove(); };

IA.send = async function(){
  const inp = document.getElementById('pia-chat-input');
  const btn = document.getElementById('pia-chat-send');
  if(!inp) return;
  const q = inp.value.trim();
  if(!q && _pendingAttachments.length === 0) return;
  const hasAtts = _pendingAttachments.length > 0;
  const atts = _pendingAttachments.slice();
  inp.value = '';
  inp.style.height='auto';
  if(btn) btn.disabled = true;

  let userMsg = q || '(analisar arquivos anexados)';
  if(hasAtts){
    userMsg += '\n\nAnexos: ' + atts.map(a => a.name).join(', ');
  }
  IA._appendMessage('user', userMsg);
  _pendingAttachments = []; IA._renderAttachments();
  IA._appendTyping();

  try {
    const sb = _getSb();
    if(!sb){ throw new Error('Sistema ainda nao carregado.'); }
    const { data:{ session } } = await sb.auth.getSession();
    if(!session){ throw new Error('Voce nao esta logado.'); }
    const projId = getProjectId();
    const resp = await fetch(SB_URL + '/functions/v1/chat-projeto', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + session.access_token
      },
      body: JSON.stringify({
        question: q || 'Analise os anexos.',
        project_id: projId,
        history: _history.slice(-10, -1),
        attachments: atts.map(a => ({ name: a.name, mime_type: a.mime_type, data_base64: a.data_base64 })),
        enable_search: true
      })
    });
    const data = await resp.json();
    IA._removeTyping();
    if(!resp.ok || data.error){
      IA._appendMessage('assistant', 'Erro: ' + (data.error || 'HTTP ' + resp.status));
    } else {
      let answer = data.answer || 'Sem resposta.';
      if(Array.isArray(data.sources) && data.sources.length > 0){
        answer += '\n\n---\n**Fontes consultadas:**\n';
        answer += data.sources.map((s, i) => '[' + (i+1) + '] [' + (s.title || s.uri) + '](' + s.uri + ')').join('\n');
      }
      IA._appendMessage('assistant', answer);
    }
  } catch(e){
    IA._removeTyping();
    IA._appendMessage('assistant', 'Erro: ' + (e.message || e));
  } finally {
    if(btn) btn.disabled = false;
    setTimeout(()=>{ const i=document.getElementById('pia-chat-input'); if(i) i.focus(); }, 100);
  }
};

IA.clearHistory = function(){ _history = []; };

IA.unmountButton = function(){
  const b = document.getElementById('pia-chat-btn');
  if(b) b.remove();
  if(_open) IA.close();
};

function isUserAuthed(){
  try {
    const auth = document.getElementById('screen-auth');
    const app = document.getElementById('app');
    if(auth && auth.style.display !== 'none' && auth.offsetParent !== null) return false;
    if(app && (app.style.display === 'none' || app.offsetParent === null)) return false;
  } catch(_){}
  if(w._user && w._user.id) return true;
  try {
    for(const k of Object.keys(localStorage)){
      if(k.startsWith('sb-') && k.endsWith('-auth-token')){
        const v = localStorage.getItem(k);
        if(v){ const d = JSON.parse(v); if(d && d.user && d.user.id) return true; }
      }
    }
  } catch(_){}
  return false;
}
function syncButtonVisibility(){
  const exists = !!document.getElementById('pia-chat-btn');
  const should = isUserAuthed();
  if(should && !exists){ IA.mountButton(); }
  else if(!should && exists){ IA.unmountButton(); _history = []; }
}
function tryMount(){
  if(!document.body){ setTimeout(tryMount, 200); return; }
  syncButtonVisibility();
  setInterval(syncButtonVisibility, 1000);
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(tryMount, 500); });
} else {
  setTimeout(tryMount, 500);
}

} catch(e){ console.warn('[PIAChat] init falhou:', e); }
})(window);
