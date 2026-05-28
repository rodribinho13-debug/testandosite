/*! PROJECT.IA Security Layer v2 - hardening opt-in
 *  Ativacao via window.__PIA_HARDEN__ = true (default OFF para nao atrapalhar)
 *  Modo SOFT (default): apenas exporta API utilitaria, sem bloquear nada
 *  Modo HARDEN: silencia console, bloqueia F12/right-click, detecta DevTools
 */
(function(w){'use strict';

var HARDEN = w.__PIA_HARDEN__ === true;

// ---- API utilitaria sempre disponivel ----
w.PIASec = {
  isHarden: HARDEN,
  scrub: function(s){
    if(typeof s !== 'string') return s;
    return s.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,'[jwt]')
            .replace(/sb[ps]?_[A-Za-z0-9_]{15,}/g,'[apikey]')
            .replace(/AIza[A-Za-z0-9_-]{30,}/g,'[gkey]');
  },
  esc: function(s){
    if(s==null) return '';
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  },
  setToken: function(k, v){
    try{ sessionStorage.setItem(k, v); }catch(_){
      try{ localStorage.setItem(k, v); }catch(__){}
    }
  },
  getToken: function(k){
    try{ return sessionStorage.getItem(k) || localStorage.getItem(k); }catch(_){ return null; }
  },
  clearToken: function(k){
    try{ sessionStorage.removeItem(k); }catch(_){}
    try{ localStorage.removeItem(k); }catch(_){}
  },
  lockClient: function(){
    try{ if(w.sb && !Object.isFrozen(w.sb)) Object.freeze(w.sb); }catch(_){}
  },
  enableHarden: function(){
    if(HARDEN) return;
    HARDEN = true;
    _applyHarden();
  }
};

function _applyHarden(){
  // Apenas wrap nas funcoes de console que vazam tokens. Mantem log/error funcionais.
  ['log','warn','error','info','debug'].forEach(function(m){
    if(typeof w.console[m] !== 'function') return;
    var orig = w.console[m].bind(w.console);
    w.console[m] = function(){
      var args = Array.prototype.slice.call(arguments).map(function(a){
        if(typeof a === 'string') return w.PIASec.scrub(a);
        return a;
      });
      orig.apply(null, args);
    };
  });
}

if(HARDEN) _applyHarden();

})(window);
