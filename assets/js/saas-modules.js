/*! PROJECT.IA SaaS Modules v1
 *  Itens 1, 3, 4, 5 - Onboarding, Audit Log, 2FA/Senha, DMS, Email Prefs
 *  Requer: window.sb (Supabase client), window._org, window._user
 *  Expoe: window.PIASaaS.{onboarding, audit, mfa, dms, emailPrefs}
 */
(function(w){'use strict';
const PIA = w.PIASaaS = {};
const sec = w.PIASec || { esc:(s)=>String(s==null?'':s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])) };
const esc = sec.esc;

function _toast(msg, kind){
  if(w.toast) return w.toast(msg, kind||'ok');
  // Fallback inline toast
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;background:'+(kind==='err'?'#FEF2F2':kind==='warn'?'#FFFBEB':'#ECFDF5')+';color:'+(kind==='err'?'#991B1B':kind==='warn'?'#92400E':'#065F46')+';border:1px solid '+(kind==='err'?'#FCA5A5':kind==='warn'?'#FCD34D':'#6EE7B7')+';padding:11px 16px;border-radius:10px;font:600 13px/1.4 -apple-system,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.12)';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='.3s';setTimeout(()=>t.remove(),300);}, 3500);
}
function _renderIcons(){ try{ w.lucide && w.lucide.createIcons(); }catch(_){} }

function _modal(title, icon, contentHtml, opts){
  opts = opts || {};
  const ov = document.createElement('div');
  ov.className = 'pia-modal-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(4px);z-index:9500;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = (e)=>{ if(e.target===ov) ov.remove(); };
  ov.innerHTML = '<div style="background:#fff;border-radius:14px;padding:24px;max-width:'+(opts.width||'720px')+';width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(10,22,40,.2);position:relative">'
    + '<button class="pia-close" style="position:absolute;top:14px;right:14px;background:transparent;border:none;cursor:pointer;color:#64748B;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center"><i data-lucide="x" style="width:16px;height:16px"></i></button>'
    + '<div style="display:flex;align-items:center;gap:9px;font-size:16px;font-weight:700;color:#0F172A;margin-bottom:14px;letter-spacing:-.2px"><i data-lucide="'+icon+'" style="width:18px;height:18px;color:#1E40AF;stroke-width:2"></i>'+esc(title)+'</div>'
    + '<div class="pia-modal-body">'+contentHtml+'</div></div>';
  document.body.appendChild(ov);
  ov.querySelector('.pia-close').onclick = ()=> ov.remove();
  _renderIcons();
  return ov;
}

// =========================================================
// AUDIT LOG VIEWER
// =========================================================
PIA.audit = {
  async open(){
    if(!w.sb || !w._org) { _toast('Aguarde o sistema carregar','warn'); return; }
    const ov = _modal('Trilha de Auditoria (LGPD)','shield-check',
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'
      +'<select id="aud-table" style="flex:1;min-width:180px;padding:7px 10px;border:1px solid #E2E8F0;border-radius:8px;font-size:12.5px"><option value="">Todas tabelas</option></select>'
      +'<select id="aud-action" style="padding:7px 10px;border:1px solid #E2E8F0;border-radius:8px;font-size:12.5px"><option value="">Todas acoes</option><option>INSERT</option><option>UPDATE</option><option>DELETE</option><option>SOFT_DELETE</option></select>'
      +'<input id="aud-user" placeholder="email do usuario" style="flex:1;min-width:200px;padding:7px 10px;border:1px solid #E2E8F0;border-radius:8px;font-size:12.5px">'
      +'<button id="aud-export" style="background:#F1F5F9;border:1px solid #E2E8F0;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;color:#334155;display:inline-flex;align-items:center;gap:5px"><i data-lucide="download" style="width:13px;height:13px"></i>CSV</button>'
      +'</div>'
      +'<div id="aud-list" style="max-height:55vh;overflow-y:auto;border:1px solid #E2E8F0;border-radius:10px"></div>'
      +'<div style="font-size:11px;color:#94A3B8;margin-top:8px">Apenas administradores/gerentes visualizam. Trilha em conformidade com LGPD art. 37.</div>',
      {width:'880px'}
    );
    const tableSel = ov.querySelector('#aud-table');
    const actionSel = ov.querySelector('#aud-action');
    const userInp = ov.querySelector('#aud-user');
    const listEl = ov.querySelector('#aud-list');
    let allRows = [];

    async function load(){
      listEl.innerHTML = '<div style="padding:30px;text-align:center;color:#94A3B8">Carregando...</div>';
      let q = w.sb.from('audit_log').select('*').eq('org_id', w._org.id).order('created_at',{ascending:false}).limit(500);
      const tt = tableSel.value;
      const aa = actionSel.value;
      const uu = userInp.value.trim();
      if(tt) q = q.eq('table_name', tt);
      if(aa) q = q.eq('action', aa);
      if(uu) q = q.ilike('user_email', '%'+uu+'%');
      const {data, error} = await q;
      if(error){ listEl.innerHTML = '<div style="padding:20px;color:#991B1B">Erro: '+esc(error.message)+'</div>'; return; }
      allRows = data || [];
      render();
    }

    async function render(){
      if(!allRows.length){ listEl.innerHTML = '<div style="padding:30px;text-align:center;color:#94A3B8">Sem eventos.</div>'; return; }
      const tables = [...new Set(allRows.map(r=>r.table_name))].sort();
      if(tableSel.options.length === 1){
        tables.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; tableSel.appendChild(o); });
      }
      listEl.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#F8FAFC;border-bottom:1px solid #E2E8F0">'
        +'<th style="text-align:left;padding:9px 11px;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#64748B;font-weight:700">Quando</th>'
        +'<th style="text-align:left;padding:9px 11px;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#64748B;font-weight:700">Usuario</th>'
        +'<th style="text-align:left;padding:9px 11px;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#64748B;font-weight:700">Acao</th>'
        +'<th style="text-align:left;padding:9px 11px;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#64748B;font-weight:700">Tabela</th>'
        +'<th style="text-align:left;padding:9px 11px;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#64748B;font-weight:700">Registro</th>'
        +'<th style="text-align:left;padding:9px 11px;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#64748B;font-weight:700">Campos alterados</th>'
        +'</tr></thead><tbody>'
        + allRows.map(r=>{
            const dt = r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '-';
            const action = r.action || '-';
            const actColor = action==='INSERT'?'#065F46':action==='DELETE'||action==='SOFT_DELETE'?'#991B1B':'#92400E';
            const actBg = action==='INSERT'?'#ECFDF5':action==='DELETE'||action==='SOFT_DELETE'?'#FEF2F2':'#FFFBEB';
            const changed = (r.changed_fields||[]).slice(0,5).join(', ') + ((r.changed_fields||[]).length>5?' +'+(r.changed_fields.length-5):'');
            return '<tr style="border-bottom:1px solid #F1F5F9"><td style="padding:8px 11px;font-family:JetBrains Mono,monospace;color:#64748B;white-space:nowrap">'+esc(dt)+'</td>'
              +'<td style="padding:8px 11px">'+esc(r.user_email||'sistema')+'</td>'
              +'<td style="padding:8px 11px"><span style="background:'+actBg+';color:'+actColor+';padding:2px 8px;border-radius:12px;font-size:10.5px;font-weight:700">'+esc(action)+'</span></td>'
              +'<td style="padding:8px 11px;font-family:JetBrains Mono,monospace;color:#334155">'+esc(r.table_name||'-')+'</td>'
              +'<td style="padding:8px 11px;font-family:JetBrains Mono,monospace;color:#64748B;font-size:10.5px">'+esc((r.record_id||'-').slice(0,8))+'</td>'
              +'<td style="padding:8px 11px;color:#64748B;font-size:11px">'+esc(changed||'-')+'</td></tr>';
          }).join('')
        +'</tbody></table>';
    }

    tableSel.onchange = load;
    actionSel.onchange = load;
    userInp.oninput = ()=>{ clearTimeout(w._audT); w._audT = setTimeout(load,300); };
    ov.querySelector('#aud-export').onclick = ()=>{
      if(!allRows.length){ _toast('Sem dados pra exportar','warn'); return; }
      const csv = 'data,usuario,acao,tabela,registro_id,campos_alterados\n' +
        allRows.map(r=>[r.created_at, r.user_email||'', r.action, r.table_name, r.record_id||'', (r.changed_fields||[]).join('|')].map(c=>'"'+String(c||'').replace(/"/g,'""')+'"').join(',')).join('\n');
      const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='audit_log_'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
      URL.revokeObjectURL(url);
    };
    load();
    _renderIcons();
  }
};

// =========================================================
// 2FA + RESET SENHA
// =========================================================
PIA.mfa = {
  async open(){
    if(!w.sb || !w._user) { _toast('Aguarde o sistema carregar','warn'); return; }
    // Lista factors existentes
    const {data: factors} = await w.sb.auth.mfa.listFactors();
    const enrolled = (factors?.totp || []).filter(f=>f.status==='verified');
    const isEnabled = enrolled.length > 0;

    const ov = _modal('Segurança da Conta','shield',
      '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:14px">'
      +  '<div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:4px">Autenticação em 2 fatores (2FA/TOTP)</div>'
      +  '<div style="font-size:12px;color:#64748B;margin-bottom:10px">Use Google Authenticator, Authy, 1Password ou similar.</div>'
      +  (isEnabled
          ? '<div style="display:flex;align-items:center;gap:8px;background:#ECFDF5;color:#065F46;border:1px solid #6EE7B7;padding:9px 13px;border-radius:8px;font-size:12.5px;font-weight:600"><i data-lucide="check-circle" style="width:14px;height:14px"></i>2FA ativado</div><button id="mfa-disable" style="margin-top:10px;background:transparent;border:1px solid #FCA5A5;color:#991B1B;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600">Desativar 2FA</button>'
          : '<button id="mfa-enroll" style="background:#1E40AF;color:#fff;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px"><i data-lucide="shield-plus" style="width:14px;height:14px;stroke:#fff"></i>Ativar 2FA</button>')
      + '</div>'
      + '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px">'
      +  '<div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:4px">Alterar senha</div>'
      +  '<div style="font-size:12px;color:#64748B;margin-bottom:10px">Defina uma nova senha (mínimo 8 caracteres).</div>'
      +  '<div style="display:flex;gap:8px;flex-wrap:wrap">'
      +    '<input id="mfa-newpw" type="password" placeholder="Nova senha" style="flex:1;min-width:200px;padding:8px 11px;border:1px solid #E2E8F0;border-radius:8px;font-size:12.5px;outline:none">'
      +    '<input id="mfa-confirmpw" type="password" placeholder="Confirme a senha" style="flex:1;min-width:200px;padding:8px 11px;border:1px solid #E2E8F0;border-radius:8px;font-size:12.5px;outline:none">'
      +    '<button id="mfa-savepw" style="background:#1E40AF;color:#fff;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600">Salvar senha</button>'
      +  '</div>'
      + '</div>',
      {width:'560px'}
    );

    if(!isEnabled){
      ov.querySelector('#mfa-enroll').onclick = async ()=>{
        const {data, error} = await w.sb.auth.mfa.enroll({factorType:'totp', friendlyName:'PROJECT.IA'});
        if(error){ _toast('Erro: '+error.message,'err'); return; }
        const qrSvg = data.totp.qr_code;
        const secret = data.totp.secret;
        const factorId = data.id;
        ov.querySelector('.pia-modal-body').innerHTML =
          '<div style="text-align:center;margin-bottom:14px">'
          +'<div style="font-size:13px;color:#334155;margin-bottom:10px">1. Escaneie o QR code com seu app autenticador:</div>'
          +'<div style="display:inline-block;background:#fff;padding:16px;border:1px solid #E2E8F0;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.06)">'
          +qrSvg
          +'</div></div>'
          +'<div style="background:#FEFCE8;border:1px solid #FDE68A;border-radius:8px;padding:10px 13px;font-size:11.5px;color:#92400E;margin-bottom:14px">'
          +'<strong>Não consegue escanear?</strong> Insira manualmente este código:<br><code style="font-family:JetBrains Mono,monospace;font-size:13px;letter-spacing:1px;background:#FFFBEB;padding:3px 6px;border-radius:4px;display:inline-block;margin-top:4px">'+esc(secret)+'</code></div>'
          +'<div style="font-size:13px;color:#334155;margin-bottom:8px">2. Digite o código de 6 dígitos gerado pelo app:</div>'
          +'<div style="display:flex;gap:8px"><input id="mfa-code" maxlength="6" placeholder="000000" style="flex:1;padding:11px 14px;border:1px solid #E2E8F0;border-radius:8px;font-size:18px;font-family:JetBrains Mono,monospace;text-align:center;letter-spacing:6px;outline:none">'
          +'<button id="mfa-verify" style="background:#1E40AF;color:#fff;border:none;padding:11px 20px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600">Verificar</button></div>';
        ov.querySelector('#mfa-verify').onclick = async ()=>{
          const code = ov.querySelector('#mfa-code').value.trim();
          if(code.length !== 6){ _toast('Digite os 6 digitos','warn'); return; }
          const {data: chData, error: chErr} = await w.sb.auth.mfa.challenge({factorId});
          if(chErr){ _toast('Erro: '+chErr.message,'err'); return; }
          const {error: vErr} = await w.sb.auth.mfa.verify({factorId, challengeId: chData.id, code});
          if(vErr){ _toast('Codigo invalido: '+vErr.message,'err'); return; }
          _toast('2FA ativado com sucesso!','ok');
          ov.remove();
        };
      };
    } else {
      ov.querySelector('#mfa-disable').onclick = async ()=>{
        const _ok3 = await (w.PIAConfirm ? w.PIAConfirm.warning("Desativar autenticação em 2 etapas", "Sua conta ficará menos protegida contra acessos não autorizados. Tem certeza?", "Desativar 2FA") : Promise.resolve(confirm('Desativar 2FA? Sua conta ficará menos segura.')));
        if(!_ok3) return;
        for(const f of enrolled){
          await w.sb.auth.mfa.unenroll({factorId: f.id});
        }
        _toast('2FA desativado','warn');
        ov.remove();
      };
    }

    ov.querySelector('#mfa-savepw').onclick = async ()=>{
      const pw = ov.querySelector('#mfa-newpw').value;
      const cf = ov.querySelector('#mfa-confirmpw').value;
      if(pw.length < 8){ _toast('Senha mínimo 8 caracteres','warn'); return; }
      if(pw !== cf){ _toast('Senhas não conferem','warn'); return; }
      const {error} = await w.sb.auth.updateUser({password: pw});
      if(error){ _toast('Erro: '+error.message,'err'); return; }
      _toast('Senha alterada com sucesso','ok');
      ov.querySelector('#mfa-newpw').value=''; ov.querySelector('#mfa-confirmpw').value='';
    };
  },

  // Tela de "esqueci minha senha" - chama do login
  async openForgotPassword(){
    const ov = _modal('Recuperar senha','key-round',
      '<div style="font-size:13px;color:#334155;margin-bottom:14px">Informe o email cadastrado. Você receberá um link para criar nova senha.</div>'
      +'<div style="display:flex;flex-direction:column;gap:10px">'
      +  '<input id="fp-email" type="email" placeholder="seu@email.com" style="padding:10px 12px;border:1px solid #E2E8F0;border-radius:8px;font-size:13px;outline:none">'
      +  '<button id="fp-send" style="background:#1E40AF;color:#fff;border:none;padding:11px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600">Enviar link de recuperação</button>'
      +'</div>'
      +'<div id="fp-msg" style="margin-top:12px;font-size:12px"></div>',
      {width:'420px'}
    );
    ov.querySelector('#fp-send').onclick = async ()=>{
      const em = ov.querySelector('#fp-email').value.trim();
      const msg = ov.querySelector('#fp-msg');
      if(!em){ msg.innerHTML='<span style="color:#991B1B">Informe email</span>'; return; }
      const {error} = await w.sb.auth.resetPasswordForEmail(em, { redirectTo: window.location.origin + '/hydrostec_v9.html#reset-password' });
      if(error){ msg.innerHTML='<span style="color:#991B1B">Erro: '+esc(error.message)+'</span>'; return; }
      msg.innerHTML='<span style="color:#065F46;font-weight:600">Email enviado! Verifique sua caixa.</span>';
    };
  }
};

// =========================================================
// DOCUMENT MANAGEMENT SYSTEM (DMS)
// =========================================================
PIA.dms = {
  _state: { folder:'/', search:'' },

  async open(projectId){
    if(!w.sb || !w._org) { _toast('Aguarde','warn'); return; }
    this._state.projectId = projectId || (w._curProject && w._curProject.id) || null;
    const ov = _modal('Documentos do projeto','folder-open',
      '<div id="dms-bar" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px">'
      +'<div id="dms-breadcrumb" style="flex:1;font-size:13px;color:#334155;font-weight:600"></div>'
      +'<input id="dms-search" placeholder="Buscar..." style="padding:7px 11px;border:1px solid #E2E8F0;border-radius:8px;font-size:12.5px;outline:none;min-width:180px">'
      +'<button id="dms-new-folder" style="background:#F1F5F9;border:1px solid #E2E8F0;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;color:#334155;display:inline-flex;align-items:center;gap:5px"><i data-lucide="folder-plus" style="width:13px;height:13px"></i>Pasta</button>'
      +'<button id="dms-upload" style="background:#1E40AF;color:#fff;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px"><i data-lucide="upload" style="width:13px;height:13px;stroke:#fff"></i>Enviar arquivo</button>'
      +'</div>'
      +'<div id="dms-drop" style="border:2px dashed #E2E8F0;border-radius:12px;padding:18px;text-align:center;margin-bottom:14px;color:#94A3B8;font-size:12px;background:#F8FAFC;cursor:pointer"><i data-lucide="cloud-upload" style="width:24px;height:24px;color:#94A3B8;margin-bottom:4px"></i><div>Arraste arquivos aqui ou clique para selecionar</div></div>'
      +'<div id="dms-list" style="min-height:200px"></div>'
      +'<input type="file" id="dms-input" multiple style="display:none">',
      {width:'860px'}
    );
    this._ov = ov;
    this._bindEvents();
    this.refresh();
  },

  _bindEvents(){
    const ov = this._ov;
    const input = ov.querySelector('#dms-input');
    const upBtn = ov.querySelector('#dms-upload');
    const drop = ov.querySelector('#dms-drop');
    upBtn.onclick = ()=> input.click();
    drop.onclick = ()=> input.click();
    input.onchange = (e)=> this._handleFiles(e.target.files);
    drop.ondragover = (e)=>{ e.preventDefault(); drop.style.borderColor='#1E40AF'; drop.style.background='#EFF6FF'; };
    drop.ondragleave = ()=>{ drop.style.borderColor='#E2E8F0'; drop.style.background='#F8FAFC'; };
    drop.ondrop = (e)=>{ e.preventDefault(); drop.style.borderColor='#E2E8F0'; drop.style.background='#F8FAFC'; this._handleFiles(e.dataTransfer.files); };
    ov.querySelector('#dms-search').oninput = (e)=>{ this._state.search = e.target.value; clearTimeout(w._dmsT); w._dmsT = setTimeout(()=>this.refresh(), 300); };
    ov.querySelector('#dms-new-folder').onclick = ()=>{
      const name = prompt('Nome da pasta:');
      if(!name) return;
      const newPath = (this._state.folder === '/' ? '' : this._state.folder) + '/' + name.replace(/[^a-zA-Z0-9_\-\s]/g,'');
      this._state.folder = newPath;
      this.refresh();
    };
  },

  async refresh(){
    const ov = this._ov;
    const listEl = ov.querySelector('#dms-list');
    listEl.innerHTML = '<div style="text-align:center;padding:30px;color:#94A3B8">Carregando...</div>';
    const breadcrumb = ov.querySelector('#dms-breadcrumb');
    const parts = this._state.folder.split('/').filter(Boolean);
    let path = '';
    breadcrumb.innerHTML = '<a href="#" data-cd="/" style="color:#1E40AF;text-decoration:none;font-weight:600">📁 Raiz</a>'
      + parts.map(p=>{ path += '/'+p; return ' / <a href="#" data-cd="'+esc(path)+'" style="color:#1E40AF;text-decoration:none">'+esc(p)+'</a>'; }).join('');
    breadcrumb.querySelectorAll('[data-cd]').forEach(a=> a.onclick = (e)=>{ e.preventDefault(); this._state.folder = a.dataset.cd; this.refresh(); });

    let q = w.sb.from('dms_files').select('*').eq('org_id', w._org.id).is('deleted_at', null).order('uploaded_at',{ascending:false});
    if(this._state.projectId) q = q.eq('project_id', this._state.projectId);
    if(this._state.search){ q = q.ilike('name', '%'+this._state.search+'%'); }
    else { q = q.eq('folder_path', this._state.folder); }

    const {data, error} = await q.limit(500);
    if(error){ listEl.innerHTML = '<div style="padding:20px;color:#991B1B">Erro: '+esc(error.message)+'</div>'; return; }
    if(!data || !data.length){ listEl.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8;font-size:13px">Pasta vazia. Envie um arquivo ou crie outra pasta.</div>'; return; }

    // Agrupa por parent_file_id (revisões)
    const byParent = {};
    data.forEach(f=>{
      const key = f.parent_file_id || f.id;
      if(!byParent[key]) byParent[key] = [];
      byParent[key].push(f);
    });

    const groups = Object.values(byParent).filter(arr=> arr[0].parent_file_id == null || arr.length > 1);
    // Mostra apenas o "head" de cada grupo (última versão)
    const heads = data.filter(f=> !f.parent_file_id);

    listEl.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">'
      + heads.map(f=>{
          const icon = this._fileIcon(f.mime_type, f.name);
          const sizeKB = f.size_bytes ? Math.round(f.size_bytes/1024) : 0;
          const versions = (byParent[f.id] || []).length + 1;
          return '<div data-fid="'+f.id+'" style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:12px;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor=\'#1E40AF\';this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 8px 20px rgba(0,0,0,.06)\'" onmouseout="this.style.borderColor=\'#E2E8F0\';this.style.transform=\'\';this.style.boxShadow=\'\'">'
            +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><i data-lucide="'+icon+'" style="width:18px;height:18px;color:#1E40AF;flex-shrink:0"></i><span style="font-size:10.5px;color:#94A3B8;text-transform:uppercase;font-weight:600">'+esc(f.version_label||'A')+(versions>1?' &middot; '+versions+'rev':'')+'</span></div>'
            +'<div style="font-size:13px;font-weight:600;color:#0F172A;margin-bottom:2px;word-break:break-word;line-height:1.3">'+esc(f.name)+'</div>'
            +'<div style="font-size:10.5px;color:#94A3B8;font-family:JetBrains Mono,monospace">'+sizeKB+' KB</div>'
            +'</div>';
        }).join('')
      +'</div>';

    listEl.querySelectorAll('[data-fid]').forEach(card=>{
      card.onclick = ()=> this._openFile(data.find(x=>x.id === card.dataset.fid));
    });
    _renderIcons();
  },

  _fileIcon(mime, name){
    const ext = (name||'').toLowerCase().split('.').pop();
    if(/pdf/.test(mime||'')||ext==='pdf') return 'file-text';
    if(/image/.test(mime||'')||['png','jpg','jpeg','webp','gif'].includes(ext)) return 'image';
    if(/sheet|excel/.test(mime||'')||['xlsx','xls','csv'].includes(ext)) return 'file-spreadsheet';
    if(/word|document/.test(mime||'')||['doc','docx'].includes(ext)) return 'file-text';
    if(['dwg','dxf'].includes(ext)) return 'pen-tool';
    if(['zip','rar','7z'].includes(ext)) return 'package';
    return 'file';
  },

  async _handleFiles(files){
    if(!files || !files.length) return;
    const projectId = this._state.projectId;
    let ok=0, err=0;
    for(const file of files){
      if(file.size > 50 * 1024 * 1024){ _toast('Arquivo > 50MB: '+file.name,'warn'); err++; continue; }
      try {
        const ext = file.name.split('.').pop();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
        const path = w._org.id + '/' + (projectId||'org') + '/' + Date.now() + '_' + safeName;
        const {error: upErr} = await w.sb.storage.from('dms-files').upload(path, file, {upsert:false});
        if(upErr){ err++; _toast('Upload erro: '+upErr.message,'err'); continue; }
        const {error: dbErr} = await w.sb.from('dms_files').insert({
          org_id: w._org.id,
          project_id: projectId,
          folder_path: this._state.folder,
          name: file.name,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          storage_path: path,
          uploaded_by: w._user?.id
        });
        if(dbErr){ err++; _toast('Erro DB: '+dbErr.message,'err'); continue; }
        ok++;
      } catch(e){ err++; }
    }
    _toast(ok+' enviados, '+err+' falharam', err? 'warn':'ok');
    this.refresh();
  },

  async _openFile(f){
    if(!f) return;
    const {data, error} = await w.sb.storage.from('dms-files').createSignedUrl(f.storage_path, 600);
    if(error){ _toast('Erro: '+error.message,'err'); return; }
    const isImg = /image/.test(f.mime_type||'');
    const isPdf = /pdf/.test(f.mime_type||'');
    const preview = isImg ? '<img src="'+data.signedUrl+'" style="max-width:100%;max-height:60vh;border-radius:8px;border:1px solid #E2E8F0">'
                 : isPdf ? '<iframe src="'+data.signedUrl+'" style="width:100%;height:65vh;border:1px solid #E2E8F0;border-radius:8px"></iframe>'
                 : '<div style="background:#F8FAFC;border:1px dashed #E2E8F0;border-radius:10px;padding:40px;text-align:center;color:#64748B">Preview não disponível</div>';
    _modal(f.name, 'file',
      preview
      +'<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">'
      +'<a href="'+data.signedUrl+'" target="_blank" download style="background:#1E40AF;color:#fff;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:6px"><i data-lucide="download" style="width:14px;height:14px;stroke:#fff"></i>Baixar</a>'
      +'<button onclick="PIASaaS.dms._uploadNewVersion(\''+f.id+'\')" style="background:#F1F5F9;border:1px solid #E2E8F0;padding:9px 14px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600;color:#334155;display:inline-flex;align-items:center;gap:6px"><i data-lucide="upload" style="width:14px;height:14px"></i>Nova revisão</button>'
      +'<button onclick="PIASaaS.dms._deleteFile(\''+f.id+'\')" style="background:transparent;border:1px solid #FCA5A5;color:#991B1B;padding:9px 14px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px;margin-left:auto"><i data-lucide="trash-2" style="width:14px;height:14px"></i>Excluir</button>'
      +'</div>',
      {width:'820px'}
    );
  },

  _uploadNewVersion(parentId){
    const input = document.createElement('input');
    input.type='file';
    input.onchange = async ()=>{
      const file = input.files[0]; if(!file) return;
      const {data: parent} = await w.sb.from('dms_files').select('*').eq('id', parentId).maybeSingle();
      if(!parent) return;
      const nextVer = String.fromCharCode((parent.version_label||'A').charCodeAt(0) + 1);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      const path = w._org.id + '/' + (parent.project_id||'org') + '/' + Date.now() + '_v' + nextVer + '_' + safeName;
      const {error: upErr} = await w.sb.storage.from('dms-files').upload(path, file);
      if(upErr){ _toast('Erro: '+upErr.message,'err'); return; }
      await w.sb.from('dms_files').update({status:'superseded'}).eq('id', parentId);
      await w.sb.from('dms_files').insert({
        org_id: w._org.id, project_id: parent.project_id, folder_path: parent.folder_path,
        name: file.name, mime_type: file.type, size_bytes: file.size, storage_path: path,
        version_label: nextVer, version_number: (parent.version_number||1)+1,
        parent_file_id: parentId, uploaded_by: w._user?.id
      });
      _toast('Nova revisão '+nextVer+' criada','ok');
      document.querySelectorAll('.pia-modal-ov').forEach(o=>o.remove());
      this.open(this._state.projectId);
    };
    input.click();
  },

  async _deleteFile(id){
    const _ok = await (w.PIAConfirm ? w.PIAConfirm.danger("Excluir arquivo", "O anexo será removido permanentemente.", "Excluir") : Promise.resolve(confirm("Excluir arquivo?")));
  if(!_ok) return;
    await w.sb.from('dms_files').update({deleted_at: new Date().toISOString()}).eq('id', id);
    _toast('Arquivo excluído','ok');
    document.querySelectorAll('.pia-modal-ov').forEach(o=>o.remove());
    this.open(this._state.projectId);
  }
};

// =========================================================
// EMAIL PREFERENCES
// =========================================================
PIA.emailPrefs = {
  async open(){
    if(!w.sb || !w._user) { _toast('Aguarde','warn'); return; }
    const {data: prefs} = await w.sb.from('email_preferences').select('*').eq('user_id', w._user.id).maybeSingle();
    const p = prefs || {};
    const toggle = (key, label, desc, def)=>{
      const checked = p[key] !== undefined ? p[key] : def;
      return '<label style="display:flex;gap:11px;padding:11px 13px;background:#fff;border:1px solid '+(checked?'#1E40AF':'#E2E8F0')+';border-radius:10px;cursor:pointer;margin-bottom:6px"><input type="checkbox" data-pref="'+key+'" '+(checked?'checked':'')+' style="margin-top:2px;cursor:pointer;accent-color:#1E40AF"><div><div style="font-size:13px;font-weight:600;color:#0F172A">'+label+'</div><div style="font-size:11.5px;color:#64748B;margin-top:1px">'+desc+'</div></div></label>';
    };
    const ov = _modal('Notificações por Email','mail',
      '<div style="font-size:12.5px;color:#64748B;margin-bottom:14px">Escolha quando o sistema envia email para <strong>'+esc(w._user.email)+'</strong>.</div>'
      + toggle('on_team_invite','Convite para equipe','Quando alguém adiciona você num projeto', true)
      + toggle('on_junta_reprovada','Junta reprovada','Quando uma junta é marcada como reprovada', true)
      + toggle('on_rdo_atrasado','RDO atrasado','Quando o relatório diário não é preenchido por 3+ dias', true)
      + toggle('on_nr13_vencendo','NR-13 vencendo','Quando uma inspeção NR-13 vence em 15 dias', true)
      + toggle('on_ia_concluida','IA concluída','Quando uma análise IA termina o processamento', false)
      + toggle('on_ia_limite','Limite IA','Quando você atinge 80% do limite mensal de IA', true)
      + toggle('daily_digest','Resumo diário','Digest com tudo que mudou no dia (8h da manhã)', false)
      + toggle('weekly_summary','Resumo semanal','Relatório executivo da semana (segunda-feira)', true)
      + '<div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px"><button onclick="this.closest(\'.pia-modal-ov\').remove()" style="background:transparent;border:1px solid #E2E8F0;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600;color:#334155">Cancelar</button><button id="ep-save" style="background:#1E40AF;color:#fff;border:none;padding:9px 18px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600">Salvar</button></div>',
      {width:'520px'}
    );
    ov.querySelector('#ep-save').onclick = async ()=>{
      const data = { user_id: w._user.id, org_id: w._org?.id };
      ov.querySelectorAll('[data-pref]').forEach(cb=>{ data[cb.dataset.pref] = cb.checked; });
      const {error} = await w.sb.from('email_preferences').upsert(data, {onConflict:'user_id'});
      if(error){ _toast('Erro: '+error.message,'err'); return; }
      _toast('Preferências salvas','ok');
      ov.remove();
    };
    // Live toggle borda
    ov.querySelectorAll('[data-pref]').forEach(cb=>{
      cb.onchange = ()=>{ const l = cb.closest('label'); if(l) l.style.borderColor = cb.checked ? '#1E40AF' : '#E2E8F0'; };
    });
  }
};

// =========================================================
// ONBOARDING (Shepherd.js)
// =========================================================
PIA.onboarding = {
  shouldShow: null,

  async check(){
    if(!w.sb || !w._user) return false;
    const {data} = await w.sb.from('user_onboarding_state').select('*').eq('user_id', w._user.id).maybeSingle();
    if(data && (data.dismissed || data.finished_at)) return false;
    this.shouldShow = true;
    return true;
  },

  start(){
    if(!w.Shepherd){ console.warn('Shepherd.js nao carregado'); return; }
    const tour = new w.Shepherd.Tour({
      defaultStepOptions: {
        classes: 'pia-shepherd',
        cancelIcon: { enabled: true },
        scrollTo: { behavior: 'smooth', block: 'center' }
      },
      useModalOverlay: true
    });

    tour.addStep({
      id: 'welcome',
      title: 'Bem-vindo ao PROJECT.IA',
      text: 'Plataforma de engenharia multi-disciplinar com IA. Vou te mostrar o essencial em 5 passos rápidos.',
      buttons: [
        { text: 'Pular tour', action: ()=> this.dismiss(tour) },
        { text: 'Vamos lá', action: tour.next, classes:'shepherd-button-primary' }
      ]
    });

    tour.addStep({
      id: 'projects',
      title: 'Comece criando um projeto',
      text: 'Aqui você gerencia todos os projetos da sua empresa. Cada projeto agrupa as disciplinas que ele envolve (Mecânica, Civil, Elétrica...).',
      attachTo: { element: '#tab-proj', on: 'right' },
      buttons: [
        { text: 'Voltar', action: tour.back },
        { text: 'Próximo', action: tour.next, classes:'shepherd-button-primary' }
      ]
    });

    tour.addStep({
      id: 'disciplines',
      title: 'Escolha disciplinas por projeto',
      text: 'Cada disciplina tem seu HUB especializado. Aperte aqui pra ver Engenharia Civil, Elétrica, Mecânica, Pintura, Caldeiraria...',
      attachTo: { element: '#tab-disc', on: 'right' },
      buttons: [
        { text: 'Voltar', action: tour.back },
        { text: 'Próximo', action: tour.next, classes:'shepherd-button-primary' }
      ]
    });

    tour.addStep({
      id: 'hub',
      title: 'HUB do Planejador',
      text: 'Abre o HUB com folhas, juntas, suportes, cabos, materiais. Você escolhe qual HUB usar baseado nas disciplinas do projeto.',
      attachTo: { element: '#tab-planner', on: 'right' },
      buttons: [
        { text: 'Voltar', action: tour.back },
        { text: 'Próximo', action: tour.next, classes:'shepherd-button-primary' }
      ]
    });

    tour.addStep({
      id: 'ai',
      title: 'IA Isométrico',
      text: 'Dentro do HUB, suba um PDF de isométrico. A IA extrai TAG da linha, materiais com quantidades, juntas e cadastra automaticamente.',
      buttons: [
        { text: 'Voltar', action: tour.back },
        { text: 'Próximo', action: tour.next, classes:'shepherd-button-primary' }
      ]
    });

    tour.addStep({
      id: 'finish',
      title: 'Pronto!',
      text: 'Você já conhece o essencial. Explore o resto e use a IA pra acelerar seu trabalho. Boa engenharia!',
      buttons: [
        { text: 'Finalizar', action: ()=>{ this.complete(tour); }, classes:'shepherd-button-primary' }
      ]
    });

    tour.start();
  },

  async complete(tour){
    await w.sb.from('user_onboarding_state').upsert({ user_id: w._user.id, step: 'done', finished_at: new Date().toISOString(), steps_completed: ['welcome','projects','disciplines','hub','ai','finish'] }, {onConflict:'user_id'});
    tour && tour.complete();
    _toast('Tour finalizado! Bem-vindo.','ok');
  },

  async dismiss(tour){
    await w.sb.from('user_onboarding_state').upsert({ user_id: w._user.id, dismissed: true }, {onConflict:'user_id'});
    tour && tour.complete();
  },

  async restart(){
    await w.sb.from('user_onboarding_state').upsert({ user_id: w._user.id, dismissed: false, finished_at: null, steps_completed: [] }, {onConflict:'user_id'});
    if(!w.Shepherd){
      // Carrega Shepherd dinamicamente
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdn.jsdelivr.net/npm/shepherd.js@11/dist/css/shepherd.css';
      document.head.appendChild(css);
      const js = document.createElement('script');
      js.src = 'https://cdn.jsdelivr.net/npm/shepherd.js@11/dist/js/shepherd.min.js';
      js.onload = ()=> this.start();
      document.head.appendChild(js);
    } else {
      this.start();
    }
  }
};

// Auto-start onboarding apos login bem-sucedido
document.addEventListener('pia-user-ready', async ()=>{
  if(await PIA.onboarding.check()){
    setTimeout(()=> PIA.onboarding.restart(), 1500);
  }
});

})(window);
