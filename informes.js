/* Informes guardados y sincronizados con Google Drive — BAE Servicios de Instalaciones */
(function(){
'use strict';
const DT = window.__dt, APP = window.__app, N = window.__nube;
if(!DT || !APP || !APP.VIEWS.informe) return;
const v = APP.VIEWS.informe.el, S = DT.state;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store = { get(k, d){ try{ const x = localStorage.getItem(k); return x ? JSON.parse(x) : d; }catch(e){ return d; } },
                set(k, x){ try{ localStorage.setItem(k, JSON.stringify(x)); return true; }catch(e){ return false; } } };
const p2 = n => String(n).padStart(2, '0');
const fmtD = iso => { const p = String(iso || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : (iso || ''); };
const sinAcentos = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const CLIENTE = ['empresa', 'cuit', 'obra', 'direccion', 'observaciones'];
const CARPETA = 'BAE Informes';

let lista = store.get('bae.inf.lista', []);
let borrados = store.get('bae.inf.borrados', []);
let actualId = store.get('bae.inf.actual', null) || ('i' + Date.now());

/* ---------- formulario <-> estado ---------- */
function ponerReporte(rep){
  $$('#reportForm [data-k], textarea[data-k]').forEach(el => {
    const k = el.dataset.k; if(!CLIENTE.includes(k) && k !== 'fecha') return;
    el.value = rep[k] || (k === 'fecha' ? new Date().toISOString().slice(0, 10) : '');
    S.report[k] = el.value;
  });
}
const foto = () => ({ report: Object.fromEntries(CLIENTE.concat('fecha').map(k => [k, S.report[k] || ''])), meas: S.meas, files: S.files });
const vacio = () => !S.meas.length && !CLIENTE.some(k => String(S.report[k] || '').trim());
const titulo = x => [x.report && x.report.empresa || 'Sin empresa', x.report && x.report.obra].filter(Boolean).join(' · ');

function limites(){
  S.meas.forEach(m => { const L = S.limits[m.func];
    if(DT.isRcd(m)){ if(!L || L.x1 === undefined) S.limits[m.func] = { x1: '300', x5: '40', half: 'si' }; }
    else if(!L) S.limits[m.func] = { lim: '', crit: /INS|ISO|RISO|MEG/i.test(m.func) ? 'min' : 'max' }; });
}
/* ---------- borrador automático (no se pierden las mediciones al cerrar) ---------- */
let ultimo = '';
function guardarBorrador(){
  const f = foto(), j = JSON.stringify(f);
  if(j === ultimo) return; ultimo = j;
  store.set('bae.inf.borrador', Object.assign({ id: actualId }, f)); store.set('bae.inf.actual', actualId);
}
(function restaurar(){
  const b = store.get('bae.inf.borrador', null); if(!b) return;
  if(b.id) actualId = b.id;
  ponerReporte(b.report || {});
  if(Array.isArray(b.meas) && b.meas.length){ S.meas.length = 0; b.meas.forEach(m => S.meas.push(m)); S.files.length = 0; (b.files || []).forEach(f => S.files.push(f)); }
  limites(); ultimo = JSON.stringify(foto()); DT.renderAll();
})();
setInterval(guardarBorrador, 2000);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') guardarBorrador(); });
window.addEventListener('pagehide', guardarBorrador);

/* ---------- guardar / abrir ---------- */
function guardar(){
  if(vacio()) return msg('Cargá al menos la empresa o una medición antes de guardar.', true), false;
  const rec = Object.assign({ id: actualId }, JSON.parse(JSON.stringify(foto())), { _mod: Date.now(), _dirty: true, n: S.meas.length });
  const i = lista.findIndex(x => x.id === actualId);
  if(i >= 0){ rec._driveId = lista[i]._driveId; lista[i] = rec; } else lista.push(rec);
  store.set('bae.inf.lista', lista); return true;
}
function nuevo(){
  actualId = 'i' + Date.now(); S.meas.length = 0; S.files.length = 0; ponerReporte({});
  DT.renderAll(); guardarBorrador();
}
function abrir(x, copia){
  actualId = copia ? 'i' + Date.now() : x.id;
  ponerReporte(copia ? Object.assign({}, x.report, { fecha: '' }) : (x.report || {}));
  S.meas.length = 0; S.files.length = 0;
  if(!copia){ (x.meas || []).forEach(m => S.meas.push(JSON.parse(JSON.stringify(m)))); (x.files || []).forEach(f => S.files.push(f)); }
  limites(); DT.renderAll(); guardarBorrador(); render(); window.scrollTo(0, 0);
}

/* ---------- interfaz ---------- */
const card = document.createElement('section'); card.className = 'card'; card.id = 'infGuardados';
v.insertBefore(card, v.firstChild);
const css = document.createElement('style');
css.textContent = `
  #infGuardados .if-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
  #infGuardados .if-top h2{margin:0}
  #infGuardados .if-btns{display:flex;gap:8px}
  #infGuardados .if-btns button{padding:8px 14px}
  #infGuardados .if-nube{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 12px;margin:0 0 10px;border-radius:999px;background:var(--neutral-bg);font-size:13px;color:var(--muted)}
  #infGuardados .if-nube svg{width:18px;height:18px;flex-shrink:0;fill:none;stroke:var(--accent);stroke-width:1.8;stroke-linejoin:round}
  #infGuardados .if-nube .t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #infGuardados .if-nube button{width:32px;height:32px;padding:0;border-radius:50%;font-size:16px;line-height:1;flex-shrink:0}
  #infGuardados .if-nube.err{background:color-mix(in srgb, #d92d20 10%, var(--card))}
  #infGuardados .if-nube.err .t{color:#b42318;white-space:normal}
  #infGuardados .if-nube.err svg{stroke:#b42318}
  #infGuardados input[type=search]{margin:0}
  #infGuardados .if-list{display:grid;gap:8px}
  #infGuardados .if-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 10px 10px 14px;border:1px solid var(--line);border-radius:12px;cursor:pointer;transition:border-color .15s, background .15s}
  #infGuardados .if-row:hover{border-color:var(--accent)}
  #infGuardados .if-row .info{display:grid;gap:1px;min-width:0}
  #infGuardados .if-row .info span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #infGuardados .if-row .meta{font-size:12px}
  #infGuardados .if-row em{margin-left:4px;padding:1px 7px;border-radius:999px;background:var(--accent);color:var(--accent-ink);font-size:11px;vertical-align:1px}
  #infGuardados .if-row.actual{border-color:var(--accent);background:color-mix(in srgb, var(--accent) 5%, var(--card))}
  #infGuardados .if-row b{display:block;font-size:14.5px}
  #infGuardados .if-row em{font-style:normal;font-weight:600}
  #infGuardados .if-row span{font-size:12.5px;color:var(--muted)}
  #infGuardados .acts{display:flex;gap:6px;flex-shrink:0}
  #infGuardados .acts button{padding:6px 10px;font-size:13px}
  #infGuardados .hint{font-size:12.5px;color:var(--muted);margin:6px 0 8px}
  #infGuardados .msg:empty{display:none}
`;
document.head.appendChild(css);

let sinc = { txt: '', err: false };
function nubeHTML(){
  if(!N || !N.email) return '';
  const u = store.get('bae.inf.ult', 0);
  const t = sinc.txt || (u ? 'Drive al día · ' + (new Date(u).toDateString() === new Date().toDateString() ? 'hoy ' + p2(new Date(u).getHours()) + ':' + p2(new Date(u).getMinutes()) : new Date(u).toLocaleDateString('es-AR')) : 'Todavía no se sincronizó.');
  return `<div class="if-nube${sinc.err ? ' err' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 19h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.6 9.6 4.75 4.75 0 0 0 7.5 19z"/></svg><span class="t" id="ifNubeTxt">${esc(t)}</span><button id="ifSync" title="Sincronizar ahora" aria-label="Sincronizar ahora">↻</button></div>`;
}
function filaHTML(x){
  const r = x.report || {}, q = sinAcentos([r.empresa, r.obra, r.direccion, r.cuit, fmtD(r.fecha)].join(' ')), n = x.n ?? (x.meas || []).length;
  return `<div class="if-row${x.id === actualId ? ' actual' : ''}" data-q="${esc(q)}" data-iabrir="${x.id}" role="button" tabindex="0" title="Abrir">
    <div class="info"><b>${esc(r.empresa || 'Sin empresa')}${x.id === actualId ? ' <em>abierto</em>' : ''}</b>${r.obra ? `<span>${esc(r.obra)}</span>` : ''}
    <span class="meta">${esc(fmtD(r.fecha) || 'Sin fecha')} · ${n} medición${n === 1 ? '' : 'es'}</span></div>
    <div class="acts"><button data-idup="${x.id}" title="Nuevo informe para el mismo cliente, sin mediciones">Repetir</button><button data-iborrar="${x.id}" title="Borrar" aria-label="Borrar">✕</button></div></div>`;
}
function render(){
  const orden = lista.slice().sort((a, b) => String((b.report || {}).fecha || '').localeCompare(String((a.report || {}).fecha || '')) || (b._mod || 0) - (a._mod || 0));
  card.innerHTML = `<div class="if-top"><h2>Mis informes</h2><div class="if-btns"><button id="ifGuardar">Guardar</button><button class="primary" id="ifNuevo">+ Nuevo</button></div></div>
    ${nubeHTML()}
    <div class="msg" id="ifMsg"></div>
    ${lista.length ? `<input id="ifBuscar" type="search" placeholder="Buscar informe…"><p class="hint" id="ifCuenta">${lista.length} guardado${lista.length === 1 ? '' : 's'}</p>`
      : '<p class="hint">Lo que cargás se guarda solo mientras trabajás. Tocá <b>Guardar</b> para sumarlo a esta lista y a Drive.</p>'}
    <div class="if-list" id="ifLista">${orden.map(filaHTML).join('')}</div>`;
  $('#ifNuevo', card).onclick = () => { guardarBorrador(); if(!vacio() && !lista.some(x => x.id === actualId)) guardar(); nuevo(); render(); sincronizar(true); msg('Informe nuevo listo. El anterior quedó guardado.'); };
  $('#ifGuardar', card).onclick = () => { if(guardar()){ render(); sincronizar(true); msg('Informe guardado.'); } };
  const b = $('#ifBuscar', card); if(b) b.oninput = () => {
    const q = sinAcentos(b.value.trim()); let n = 0;
    $$('#ifLista .if-row', card).forEach(r => { const ok = !q || q.split(/\s+/).every(w => r.dataset.q.includes(w)); r.hidden = !ok; if(ok) n++; });
    $('#ifCuenta', card).textContent = q ? `${n} de ${lista.length}` : `${lista.length} guardado${lista.length === 1 ? '' : 's'}`;
  };
  $$('[data-iabrir]', card).forEach(x => { const ir = e => { if(e.target.closest('button')) return; const r = lista.find(y => y.id === x.dataset.iabrir); if(r){ guardarBorrador(); abrir(r, false); msg('Abierto: ' + titulo(r) + '.'); } };
    x.onclick = ir; x.onkeydown = e => { if(e.key === 'Enter') ir(e); }; });
  $$('[data-idup]', card).forEach(x => x.onclick = () => { const r = lista.find(y => y.id === x.dataset.idup); if(r){ abrir(r, true); msg('Informe nuevo para ' + titulo(r) + ': cargá la fecha y las mediciones.'); } });
  $$('[data-iborrar]', card).forEach(x => x.onclick = () => {
    if(x.dataset.ok !== '1'){ x.dataset.ok = '1'; x.textContent = '¿Borrar?'; setTimeout(() => { if(x.isConnected){ x.dataset.ok = ''; x.textContent = '✕'; } }, 3000); return; }
    const r = lista.find(y => y.id === x.dataset.iborrar); if(r && r._driveId){ borrados.push(r._driveId); store.set('bae.inf.borrados', borrados); }
    lista = lista.filter(y => y.id !== x.dataset.iborrar); store.set('bae.inf.lista', lista);
    if(x.dataset.iborrar === actualId) nuevo();
    render(); sincronizar(true);
  });
  const s = $('#ifSync', card); if(s) s.onclick = () => sincronizar(true);
}
function msg(t, err){ const m = $('#ifMsg', card); if(m){ m.textContent = t; m.classList.toggle('err', !!err); } }
function estado(t, err){ sinc = { txt: t, err: !!err }; const e = $('#ifNubeTxt', card); if(e){ e.textContent = t; e.closest('.if-nube').classList.toggle('err', !!err); } }

/* ---------- Drive ---------- */
let corriendo = null, otraVez = false;
async function sincronizar(interactivo){
  if(!N || !N.email) return;
  if(corriendo){ otraVez = true; return corriendo; }
  if(!N.conectado){
    if(!interactivo){ estado('Tocá "Sincronizar" para conectar con Google Drive.'); return; }
    corriendo = N.pedirToken(false).then(() => { corriendo = null; return sincronizar(false); }, e => { corriendo = null; estado('No se conectó con Drive: ' + e.message + '.', true); });
    return corriendo;
  }
  corriendo = (async () => {
    let ok = false;
    try{
      estado('Sincronizando…');
      await N.sincronizarColeccion({ tipo: 'inf', carpeta: CARPETA,
        lista: () => lista, setLista: l => { lista = l; store.set('bae.inf.lista', lista); },
        borrados: () => borrados, setBorrados: b => { borrados = b; store.set('bae.inf.borrados', borrados); },
        nombre: x => ('Informe_' + ((x.report || {}).fecha || '') + '_' + titulo(x).replace(/ · /g, ' - ')).replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim() });
      store.set('bae.inf.ult', Date.now()); sinc = { txt: '', err: false }; ok = true;
    }catch(e){
      if(e.code === 'TOKEN') estado('La conexión con Drive venció: tocá "Sincronizar".', true);
      else if(!navigator.onLine) estado('Sin internet: se sube a Drive cuando vuelva la conexión.');
      else estado('No se pudo sincronizar: ' + e.message + '.', true);
    }finally{
      corriendo = null;
      if(ok){ const a = document.activeElement; if(!(a && card.contains(a) && a.id === 'ifBuscar')) render(); else estado(''); }
      if(otraVez){ otraVez = false; sincronizar(false); }
    }
  })();
  return corriendo;
}

/* ---------- fuentes de mediciones: archivos, Drive y Bluetooth ---------- */
(function(){
  const drop = document.getElementById('drop'), card = drop && drop.closest('section.card'); if(!drop) return;
  const decir = (t, err) => { const m = document.getElementById('loadMsg'); if(m){ m.textContent = t; m.classList.toggle('err', !!err); } };
  drop.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); drop.click(); } });
  // se puede soltar archivos en toda la tarjeta
  if(card){
    ['dragenter', 'dragover'].forEach(ev => card.addEventListener(ev, e => { if(e.dataTransfer && [...e.dataTransfer.types].includes('Files')){ e.preventDefault(); card.classList.add('over'); } }));
    ['dragleave', 'drop'].forEach(ev => card.addEventListener(ev, e => { if(ev === 'dragleave' && card.contains(e.relatedTarget)) return; card.classList.remove('over'); }));
    card.addEventListener('drop', e => { if(e.target.closest('#drop')) return; e.preventDefault(); DT.handleFiles([...e.dataTransfer.files]); });
  }
  // Drive
  const bd = document.getElementById('srcDrive');
  if(bd) bd.onclick = async () => {
    if(!N || !N.email){ decir('Ingresá con tu cuenta de Google para usar Drive.', true); return; }
    decir('Abriendo Google Drive…');
    try{
      const docs = await N.elegirArchivos({ mimes: 'text/plain,application/octet-stream', titulo: 'Elegí los .txt del DT-6650' });
      if(!docs.length){ decir(''); return; }
      decir(`Descargando ${docs.length} archivo${docs.length > 1 ? 's' : ''} de Drive…`);
      await DT.handleFiles(docs);
    }catch(e){ decir('No se pudo cargar desde Drive: ' + e.message + '.', true); }
  };
  if(N && N.email) setTimeout(() => N.precargarPicker(), 1500);
  // Bluetooth
  const bb = document.getElementById('srcBt'), sub = document.getElementById('srcBtSub'), con = document.getElementById('btConnect'), des = document.getElementById('btDisconnect');
  if(bb && con){
    const marcar = () => {
      if(con.disabled && des && des.hidden){ bb.disabled = true; sub.textContent = 'solo Chrome'; bb.title = 'Funciona en Chrome de Android o PC, con la app abierta desde su link. En iPhone no es posible.'; return; }
      const conectado = des && !des.hidden; bb.disabled = false; bb.classList.toggle('on', conectado); sub.textContent = conectado ? 'conectado' : 'en vivo';
    };
    bb.onclick = () => { if(des && !des.hidden) des.closest('#btBox').scrollIntoView({ behavior: 'smooth', block: 'center' }); else con.click(); };
    marcar(); new MutationObserver(marcar).observe(des || con, { attributes: true });
    if(des) new MutationObserver(marcar).observe(con, { attributes: true });
  }
})();

/* el PDF del informe también lo guarda */
document.addEventListener('click', e => { if(e.target && e.target.id === 'pdfBtn' && !vacio()){ guardarBorrador(); if(guardar()){ render(); sincronizar(true); } } }, true);
window.addEventListener('hashchange', () => { if(location.hash === '#informe'){ render(); sincronizar(false); } });
window.addEventListener('online', () => sincronizar(false));
if(N) N.onCambio(() => { if(location.hash === '#informe') render(); });

render();
if(location.hash === '#informe') setTimeout(() => sincronizar(false), 300);
window.__informes = { get lista(){ return lista; }, sincronizar, guardar, nuevo };
})();
