/*! PROJECT.IA — IA RDO Manuscrito v1
 *  Foto de RDO papel preenchido a mão -> JSON estruturado -> revisão -> cadastra daily_reports
 *  + daily_report_team + daily_report_activities + atualiza pcp_packages se bater.
 *  Uso: PIAIARdo.openFromPhoto(projectId)
 */
(function(w, d){'use strict';
try {
function getSb(){ return w.sb || null; }
function esc(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function n(x){ const v = parseFloat(x); return isNaN(v) ? 0 : v; }
let _state = { projectId: null, file: null, b64: null, mime: null, extracted: null, busy: false };

const PROMPT = `Voce e um engenheiro de campo experiente lendo um RDO (Relatorio Diario de Obra) escrito a mao por encarregado. Letra pode ser dificil. Use contexto da obra industrial pra deduzir o que esta escrito.

RETORNE JSON entre marcadores ###DISCIPLINE_IA_JSON### e ###FIM_DISCIPLINE_IA_JSON###:

{
  "rdo": {
    "data_relatorio": "YYYY-MM-DD",
    "turno": "manha|tarde|noite|integral",
    "frente_servico": "...",
    "disciplina": "civil|tubulacao|eletrica|instrumentacao|pintura|caldeiraria|geral",
    "clima_manha": "ensolarado|nublado|chuvoso|...",
    "clima_tarde": "...",
    "horas_paralisacao": 0,
    "motivo_paralisacao": null,
    "encarregado_nome": "...",
    "encarregado_assinatura_visivel": true
  },
  "efetivo": [
    {"nome": "...", "funcao": "soldador|encanador|ajudante|...", "horas_trabalhadas": 8, "horas_extras": 0}
  ],
  "atividades": [
    {
      "descricao": "...",
      "frente_localizacao": "...",
      "qty_executada": null,
      "unidade": "m|m2|m3|un|jt|kg",
      "percentual_avanco": null,
      "codigo_pacote_pcp": null,
      "observacao": "..."
    }
  ],
  "ocorrencias": [
    {"tipo": "atraso|incidente|condicao_climatica|falta_material|outros", "descricao": "...", "gravidade": "baixa|media|alta"}
  ],
  "epi_anomalias": [{"item": "capacete|botina|luva|...", "descricao": "..."}],
  "fotos_mencionadas": ["..."],
  "confianca_ocr": 0.7
}

REGRAS:
- Se algo nao for legivel: deixe null. NUNCA invente.
- horas_trabalhadas tipico = 8. horas_extras = qualquer hora alem.
- percentual_avanco: numero de 0-100 ou null.
- codigo_pacote_pcp: se encarregado escreveu codigo (ex: PCP-001), preencha.
- Apos JSON, escreva 2-3 linhas de analise: principais achados + nivel de confianca geral.`;

async function openFromPhoto(projectId){
  _state.projectId = projectId || (w._curProject && w._curProject.id) || null;
  if(!_state.projectId){ alert('Selecione um projeto antes.'); return; }
  _state.file = null; _state.b64 = null; _state.extracted = null;
  const prev = d.getElementById('pia-iardo-ov'); if(prev) prev.remove();
  const ov = d.createElement('div');
  ov.id = 'pia-iardo-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9880;display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto';
  ov.onclick = e => { if(e.target===ov && !_state.busy) ov.remove(); };
  d.body.appendChild(ov);
  renderUploadStep();
}

function renderUploadStep(){
  const ov = d.getElementById('pia-iardo-ov'); if(!ov) return;
  ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:10px;max-width:560px;width:100%;display:flex;flex-direction:column;border:1px solid var(--t3,#E5E7EB);box-shadow:0 24px 60px rgba(0,0,0,.18)">'
    + '<div style="padding:18px 22px;border-bottom:1px solid var(--t3,#E5E7EB)"><div style="font-size:15px;font-weight:600;color:var(--t9,#0F172A)">IA RDO — Foto manuscrita</div><div style="font-size:11.5px;color:var(--t6,#64748B);margin-top:3px;line-height:1.5">Foto do RDO escrito a mão pelo encarregado. A IA lê data, frente, efetivo, atividades, % avanço, ocorrências e clima. Revisão obrigatória antes de gravar.</div></div>'
    + '<div style="padding:18px 22px"><label style="border:1.5px dashed var(--t3,#E5E7EB);border-radius:8px;padding:24px;text-align:center;cursor:pointer;display:block;background:var(--t1,#F8FAFC)"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 8px"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><div style="font-size:13px;font-weight:600;color:var(--t9,#0F172A);margin-bottom:4px">Tirar foto ou enviar imagem</div><div style="font-size:11px;color:var(--t6,#64748B)">JPG/PNG/PDF — até 20 MB</div><input id="iardo-file" type="file" accept="image/*,.pdf" capture="environment" style="display:none"></label><div id="iardo-preview" style="margin-top:12px"></div></div>'
    + '<div style="padding:14px 22px;border-top:1px solid var(--t3,#E5E7EB);display:flex;justify-content:space-between;gap:8px;align-items:center"><div id="iardo-status" style="font-size:11.5px;color:var(--t6,#64748B);flex:1"></div><button class="btn bg" id="iardo-cancel">Cancelar</button><button class="btn bia" id="iardo-go" disabled><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/></svg>Ler com IA</button></div>'
  + '</div>';
  d.getElementById('iardo-cancel').onclick = () => ov.remove();
  d.getElementById('iardo-go').onclick = startExtraction;
  d.getElementById('iardo-file').onchange = async (e) => {
    const f = e.target.files[0]; if(!f) return;
    _state.file = f; _state.mime = f.type || 'image/jpeg';
    const url = URL.createObjectURL(f);
    d.getElementById('iardo-preview').innerHTML = '<img src="'+url+'" style="max-width:100%;max-height:240px;border:1px solid var(--t3,#E5E7EB);border-radius:6px">';
    d.getElementById('iardo-go').disabled = false;
  };
}

async function startExtraction(){
  if(!_state.file || !w.PIAAIRouter){ alert('Sistema de IA indisponível.'); return; }
  _state.busy = true;
  const btn = d.getElementById('iardo-go'); btn.disabled = true; btn.textContent = 'Lendo foto...';
  const st = d.getElementById('iardo-status'); st.textContent = 'Convertendo imagem...';
  try {
    _state.b64 = await w.PIAAIRouter.fileToBase64(_state.file);
    st.textContent = 'Analisando com IA Vision...';
    const r = await w.PIAAIRouter.call('analyze-discipline-doc', {
      file: _state.b64, mime: _state.mime, discipline_code: 'custom', custom_prompt: PROMPT
    }, { event: 'rdo_handwritten', tables: ['daily_reports','daily_report_team','daily_report_activities'] });
    if(!r.ok) throw new Error(r.error || 'IA falhou');
    _state.extracted = r.data?.extracted || r.data || {};
    renderReviewStep();
  } catch(e){
    st.textContent = 'Erro: ' + (e.message || String(e)); st.style.color = '#DC2626';
    btn.disabled = false; btn.textContent = 'Ler com IA';
  } finally { _state.busy = false; }
}

function renderReviewStep(){
  const ov = d.getElementById('pia-iardo-ov'); if(!ov) return;
  const ex = _state.extracted || {};
  const r = ex.rdo || {};
  const efetivo = ex.efetivo || [];
  const ativs = ex.atividades || [];
  const ocs = ex.ocorrencias || [];
  ov.innerHTML = '<div style="background:var(--t0,#fff);border-radius:10px;max-width:920px;width:100%;height:90vh;display:flex;flex-direction:column;border:1px solid var(--t3,#E5E7EB);box-shadow:0 24px 60px rgba(0,0,0,.18);overflow:hidden">'
    + '<div style="padding:16px 22px;border-bottom:1px solid var(--t3,#E5E7EB);display:flex;align-items:center;gap:12px"><div style="flex:1"><div style="font-size:15px;font-weight:600;color:var(--t9,#0F172A)">Revisão do RDO extraído</div><div style="font-size:11px;color:var(--t6,#64748B);margin-top:2px">Confiança da OCR: ' + Math.round((ex.confianca_ocr||0)*100) + '%. Revise tudo antes de gravar.</div></div><button class="btn bg" id="iardo-back">Voltar</button><button class="btn bp" id="iardo-save">Gravar RDO</button></div>'
    + '<div style="flex:1;overflow-y:auto;padding:18px 22px;display:grid;grid-template-columns:1fr 1fr;gap:20px">'
      + '<div><div style="font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Dados gerais</div>'
        + fld('Data', 'date', 'data_relatorio', r.data_relatorio || new Date().toISOString().slice(0,10))
        + fld('Turno', 'text', 'turno', r.turno || '')
        + fld('Frente de serviço', 'text', 'frente_servico', r.frente_servico || '')
        + fld('Disciplina', 'text', 'disciplina', r.disciplina || '')
        + fld('Clima manhã', 'text', 'clima_manha', r.clima_manha || '')
        + fld('Clima tarde', 'text', 'clima_tarde', r.clima_tarde || '')
        + fld('Encarregado', 'text', 'encarregado_nome', r.encarregado_nome || '')
      + '</div>'
      + '<div><div style="font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Efetivo (' + efetivo.length + ')</div>' + renderList(efetivo, ['nome','funcao','horas_trabalhadas','horas_extras']) + '</div>'
      + '<div style="grid-column:1/-1"><div style="font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Atividades (' + ativs.length + ')</div>' + renderList(ativs, ['descricao','qty_executada','unidade','percentual_avanco','codigo_pacote_pcp','observacao']) + '</div>'
      + (ocs.length ? '<div style="grid-column:1/-1"><div style="font-size:11px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Ocorrências (' + ocs.length + ')</div>' + renderList(ocs, ['tipo','gravidade','descricao']) + '</div>' : '')
    + '</div></div>';
  d.getElementById('iardo-back').onclick = () => renderUploadStep();
  d.getElementById('iardo-save').onclick = confirmAndSave;
  d.querySelectorAll('[data-rdo-field]').forEach(inp => { inp.oninput = e => { _state.extracted.rdo = _state.extracted.rdo || {}; _state.extracted.rdo[e.target.dataset.rdoField] = e.target.value; }; });
}
function fld(label, type, field, val){ return '<label style="display:block;margin-bottom:8px"><div style="font-size:10.5px;color:var(--t6,#64748B);font-weight:600;margin-bottom:3px">' + label + '</div><input type="' + type + '" data-rdo-field="' + field + '" value="' + esc(val) + '" style="width:100%;padding:6px 9px;border:1px solid var(--t3,#E5E7EB);border-radius:5px;font-size:12px"></label>'; }
function renderList(arr, cols){ if(!arr.length) return '<div style="font-size:11px;color:var(--t6,#94A3B8);font-style:italic">(vazio)</div>'; return '<div style="border:1px solid var(--t3,#E5E7EB);border-radius:6px;overflow:hidden;background:#fff"><table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="background:var(--t1,#F8FAFC)">' + cols.map(c => '<th style="text-align:left;padding:6px 10px;font-size:10px;font-weight:600;color:var(--t6,#64748B);text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid var(--t3,#E5E7EB)">' + c + '</th>').join('') + '</tr></thead><tbody>' + arr.map(row => '<tr style="border-bottom:1px solid var(--t2,#F1F5F9)">' + cols.map(c => '<td style="padding:6px 10px;color:var(--t8,#1E293B)">' + esc(row[c] == null ? '—' : String(row[c]).slice(0,80)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'; }

async function confirmAndSave(){
  const sb = getSb(); if(!sb) return alert('Sem conexão.');
  if(_state.busy) return;
  _state.busy = true;
  const btn = d.getElementById('iardo-save'); btn.disabled = true; btn.textContent = 'Gravando...';
  try {
    const ex = _state.extracted || {}; const r = ex.rdo || {};
    const orgId = (w._org && w._org.id) || null;
    const userId = (w._user && w._user.id) || null;
    // Campos extraídos pela IA que NÃO têm coluna própria em daily_reports
    // são preservados em notes pra não perder informação.
    const extraNotes = [];
    if(r.turno) extraNotes.push('Turno: ' + r.turno);
    if(r.frente_servico) extraNotes.push('Frente: ' + r.frente_servico);
    if(r.encarregado_nome) extraNotes.push('Encarregado: ' + r.encarregado_nome);
    if(n(r.horas_paralisacao) > 0) extraNotes.push('Paralisação: ' + r.horas_paralisacao + 'h' + (r.motivo_paralisacao ? ' (' + r.motivo_paralisacao + ')' : ''));
    extraNotes.push('[Cadastrado via IA — foto manuscrita, confiança OCR ' + Math.round((ex.confianca_ocr||0)*100) + '%]');
    const payload = {
      org_id: orgId, project_id: _state.projectId,
      report_date: r.data_relatorio || new Date().toISOString().slice(0,10),
      morning_status: r.clima_manha || null,
      afternoon_status: r.clima_tarde || null,
      responsible_engineer: r.encarregado_nome || null,
      disciplina: r.disciplina || null,
      notes: extraNotes.join(' · '),
      status: 'draft',
      created_by: userId
    };
    const ins = await sb.from('daily_reports').insert(payload).select('id').single();
    if(ins.error) throw ins.error;
    const savedId = ins.data.id;
    // efetivo -> daily_report_workforce (workforce_type é NOT NULL)
    const wfRows = (ex.efetivo||[]).filter(e => e && (e.funcao || e.nome)).map(e => ({
      daily_report_id: savedId,
      workforce_type: 'direta',
      role: e.funcao || e.nome || 'Não informado',
      people_count: 1,
      hh_worked: (n(e.horas_trabalhadas)||8) + (n(e.horas_extras)||0),
      notes: e.nome ? ('Nome: ' + e.nome + (n(e.horas_extras) ? ' · HE: ' + e.horas_extras + 'h' : '')) : null
    }));
    if(wfRows.length){ const wr = await sb.from('daily_report_workforce').insert(wfRows); if(wr.error) console.warn('[ai-rdo] workforce falhou:', wr.error.message); }
    // atividades -> daily_report_activities
    const acRows = (ex.atividades||[]).filter(a => a && (a.descricao||'').trim()).map(a => {
      const acNotes = [];
      if(a.qty_executada != null) acNotes.push('Qtd: ' + a.qty_executada + (a.unidade ? ' ' + a.unidade : ''));
      if(a.codigo_pacote_pcp) acNotes.push('PCP: ' + a.codigo_pacote_pcp);
      if(a.observacao) acNotes.push(a.observacao);
      return {
        daily_report_id: savedId,
        discipline: r.disciplina || null,
        description: a.descricao,
        location: a.frente_localizacao || null,
        progress_pct: a.percentual_avanco != null ? n(a.percentual_avanco) : null,
        notes: acNotes.length ? acNotes.join(' · ') : null
      };
    });
    if(acRows.length){ const ar = await sb.from('daily_report_activities').insert(acRows); if(ar.error) console.warn('[ai-rdo] atividades falhou:', ar.error.message); }
    // ocorrências -> daily_report_events (event_type e description são NOT NULL)
    const evRows = (ex.ocorrencias||[]).filter(o => o && (o.descricao||'').trim()).map(o => ({
      daily_report_id: savedId,
      event_type: o.tipo || 'outros',
      severity: o.gravidade || null,
      description: o.descricao
    }));
    if(evRows.length){ const er = await sb.from('daily_report_events').insert(evRows); if(er.error) console.warn('[ai-rdo] ocorrências falhou:', er.error.message); }
    // Vincular pacote PCP quando a IA detectou código + avanço
    for(const a of (ex.atividades||[])){
      if(a.codigo_pacote_pcp && a.percentual_avanco != null){
        try {
          const { data: pcp } = await sb.from('pcp_packages').select('id, progress_pct').eq('project_id', _state.projectId).eq('package_code', a.codigo_pacote_pcp).maybeSingle();
          if(pcp){
            await sb.from('pcp_packages').update({ progress_pct: Math.max(n(pcp.progress_pct), n(a.percentual_avanco)) }).eq('id', pcp.id);
          }
        } catch(_){}
      }
    }
    btn.textContent = '✓ Gravado';
    try { if(w.toast) w.toast('RDO cadastrado via IA com sucesso','success'); } catch(_){}
    setTimeout(() => { const ov2 = d.getElementById('pia-iardo-ov'); if(ov2) ov2.remove(); if(w.PIARDODiario && w.PIARDODiario.open) w.PIARDODiario.open(); }, 700);
  } catch(e){ alert('Erro: ' + (e.message||e)); btn.disabled = false; btn.textContent = 'Gravar RDO'; }
  finally { _state.busy = false; }
}

w.PIAIARdo = { openFromPhoto };
} catch(e){ console.error('[ai-rdo] init falhou:', e); }
})(window, document);
