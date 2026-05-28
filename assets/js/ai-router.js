/*! PROJECT.IA — AI Router v1
 *  Wrapper único pra todas as chamadas de IA do frontend.
 *  Funções:
 *  - Adiciona Authorization automático
 *  - Trata 429 (quota) com modal de upgrade unificado
 *  - Trata 502 com retry exponencial leve
 *  - Loga evento no audit_log (pia.ai_used) com input hash + duração + tabelas
 *  - Retorna shape uniforme { ok, data, error, quota, duration_ms, model }
 *
 *  Uso:
 *    const r = await window.PIAAIRouter.call('analyze-discipline-doc', payload, { event: 'budget_full' });
 *    if (!r.ok) return alert(r.error);
 *    // r.data tem o output original da edge function
 */
(function(w, d){'use strict';
try {

const SB_URL = w.SUPABASE_URL || 'https://toapdhfouuedaexgqlsv.supabase.co';

// Cada slug aqui é uma edge function deployada. Mantém em sync com supabase/functions/
const KNOWN_FUNCTIONS = {
  'analyze-discipline-doc':   { tier: 'pro',  multimodal: true,  desc: 'Hub de extração estruturada (qualquer disciplina + custom_prompt)' },
  'analyze-isometric':        { tier: 'pro',  multimodal: true,  desc: 'Isométrico industrial → materiais/juntas/suportes (gold standard)' },
  'analyze-discipline-multi': { tier: 'pro',  multimodal: true,  desc: 'Multi-disciplina visual com contagem por IA' },
  'analyze-equipment':        { tier: 'pro',  multimodal: true,  desc: 'IA NR-13: PMTA/plot plan/placa → equipments' },
  'analyze-rdo-photo':        { tier: 'pro',  multimodal: true,  desc: 'Foto de obra → atividade + EPI + safety' },
  'analyze-rdo-handwritten':  { tier: 'pro',  multimodal: true,  desc: 'RDO manuscrito → JSON estruturado' },
  'analyze-tdraw':            { tier: 'pro',  multimodal: true,  desc: 'Desenho técnico multi-área' },
  'chat-projeto':             { tier: 'free', multimodal: true,  desc: 'IA Conversacional universal (Gemini/OpenAI/Claude + Google Search)' }
};

function getAuthToken(){
  try {
    if (w.sb && w.sb.auth) {
      // supabase-js v2: session no localStorage sob chave sb-<ref>-auth-token
      const m = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (m) {
        const obj = JSON.parse(localStorage.getItem(m) || 'null');
        return obj?.access_token || null;
      }
    }
  } catch(_){}
  return null;
}

async function logAudit(event, payload){
  try {
    if (!w.sb || !w._user) return;
    await w.sb.from('audit_log').insert({
      org_id: (w._org && w._org.id) || null,
      user_id: w._user.id,
      action: 'pia.ai_used',
      entity_type: 'ai_function',
      entity_id: event.fn || null,
      metadata: {
        fn: event.fn,
        event_label: event.label || null,
        model: payload?.model || null,
        duration_ms: payload?.duration_ms || null,
        cached: payload?.cached || false,
        tables_affected: event.tables || [],
        input_hash: event.inputHash || null,
        success: !payload?.error
      }
    });
  } catch(e) {
    console.warn('[ai-router] audit log falhou:', e?.message || e);
  }
}

async function sha256Hex(str){
  try {
    const enc = new TextEncoder().encode(typeof str === 'string' ? str : JSON.stringify(str));
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('').slice(0, 16);
  } catch(_) { return null; }
}

function showQuotaModal(quotaInfo){
  // Modal sóbrio (sem azul saturado decorativo)
  const prev = d.getElementById('pia-quota-modal'); if(prev) prev.remove();
  const ov = d.createElement('div');
  ov.id = 'pia-quota-modal';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.7);z-index:9900;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  ov.innerHTML = '<div style="background:var(--t0,#fff);border:1px solid var(--t3,#E5E7EB);border-radius:10px;max-width:440px;width:100%;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,.18)">'
    + '<div style="font-size:15px;font-weight:600;color:var(--t9,#0F172A);margin-bottom:6px">Limite mensal de IA atingido</div>'
    + '<div style="font-size:12.5px;color:var(--t6,#64748B);line-height:1.5;margin-bottom:16px">Você usou ' + (quotaInfo.used||'—') + ' de ' + (quotaInfo.max||'—') + ' chamadas no plano <strong>' + (quotaInfo.plan||'atual') + '</strong>. Faça upgrade pra continuar.</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + '  <button class="btn bg" onclick="document.getElementById(\'pia-quota-modal\').remove()">Fechar</button>'
    + '  <button class="btn bp" onclick="document.getElementById(\'pia-quota-modal\').remove(); if(window.PIALazy){window.PIALazy.run(\'plan\',\'open\');} else { document.getElementById(\'tab-plan\') && document.getElementById(\'tab-plan\').click(); }">Ver planos</button>'
    + '</div>'
    + '</div>';
  d.body.appendChild(ov);
}

async function call(fn, payload, opts){
  opts = opts || {};
  const meta = KNOWN_FUNCTIONS[fn];
  if (!meta && !opts.allowUnknown) {
    console.warn('[ai-router] função desconhecida:', fn, '— pass {allowUnknown:true} pra forçar.');
    return { ok: false, error: 'Função IA desconhecida: ' + fn };
  }
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const inputHash = opts.skipHash ? null : await sha256Hex(payload);
  const t0 = performance.now();
  let attempt = 0;
  const maxAttempts = opts.retries || 2;
  let lastErr = null;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const resp = await fetch(SB_URL + '/functions/v1/' + fn, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload || {})
      });
      const text = await resp.text();
      let data; try { data = text ? JSON.parse(text) : {}; } catch(_) { data = { raw: text }; }

      if (resp.status === 429 || data?.limit_reached) {
        showQuotaModal({ plan: data.plan, used: data.used, max: data.max });
        await logAudit({ fn, label: opts.event, inputHash, tables: opts.tables }, { error: 'quota', duration_ms: Math.round(performance.now()-t0) });
        return { ok: false, error: data.error || 'Limite mensal atingido', quota: data, status: 429 };
      }

      if (!resp.ok) {
        lastErr = data?.error || ('HTTP ' + resp.status);
        // Retry só pra 502/503/504 (transientes)
        if ([502, 503, 504].includes(resp.status) && attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 500 * attempt));
          continue;
        }
        await logAudit({ fn, label: opts.event, inputHash, tables: opts.tables }, { error: lastErr, duration_ms: Math.round(performance.now()-t0) });
        return { ok: false, error: lastErr, status: resp.status, data };
      }

      const duration_ms = Math.round(performance.now() - t0);
      await logAudit({ fn, label: opts.event, inputHash, tables: opts.tables }, { model: data?.model, duration_ms, cached: !!data?.cached });
      return { ok: true, data, duration_ms, model: data?.model, cached: !!data?.cached };
    } catch (e) {
      lastErr = e?.message || String(e);
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 500 * attempt));
        continue;
      }
    }
  }
  await logAudit({ fn, label: opts.event, inputHash, tables: opts.tables }, { error: lastErr, duration_ms: Math.round(performance.now()-t0) });
  return { ok: false, error: lastErr || 'Falha de rede', status: 0 };
}

// Helper pra base64 (PDF/imagem) — usado por TODAS as IAs multimodal
function fileToBase64(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = String(r.result || '');
      const b64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(b64);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

w.PIAAIRouter = { call, fileToBase64, KNOWN_FUNCTIONS };

} catch(e){ console.error('[ai-router] init falhou:', e); }
})(window, document);
