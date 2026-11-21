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
const CLIENTE = ['tipo', 'empresa', 'cuit', 'obra', 'direccion', 'observaciones'];
const CARPETA = 'BAE Informes';
var insListo = false;   // el módulo de instrumentos se arma más abajo

let lista = store.get('bae.inf.lista', []);
let borrados = store.get('bae.inf.borrados', []);
let actualId = store.get('bae.inf.actual', null) || ('i' + Date.now());

/* ---------- formulario <-> estado ---------- */
const hoyLocal = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function ponerReporte(rep){
  $$('#reportForm [data-k], textarea[data-k]').forEach(el => {
    const k = el.dataset.k; if(!CLIENTE.includes(k) && k !== 'fecha') return;
    el.value = rep[k] || (k === 'fecha' ? hoyLocal() : '');
    S.report[k] = el.value;
  });
  S.report.instr = Array.isArray(rep.instr) ? rep.instr.map(x => Object.assign({}, x)) : null;   // null = solo el DT-6650
  if(insListo) renderInstr();
}
if(!Array.isArray(S.fotos)) S.fotos = [];
const foto = () => ({ report: Object.assign(Object.fromEntries(CLIENTE.concat('fecha').map(k => [k, S.report[k] || ''])), { instr: S.report.instr || null }), meas: S.meas, files: S.files, fotos: S.fotos, firmaCliente: S.firmaCliente || null });
const vacio = () => !S.meas.length && !S.fotos.length && !CLIENTE.some(k => String(S.report[k] || '').trim());
const titulo = x => [x.report && x.report.empresa || 'Sin cliente', x.report && x.report.obra].filter(Boolean).join(' · ');

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
  S.fotos.length = 0; (b.fotos || []).forEach(f => S.fotos.push(f)); S.firmaCliente = b.firmaCliente || null;
  limites(); ultimo = JSON.stringify(foto()); DT.renderAll();
})();
setInterval(guardarBorrador, 2000);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') guardarBorrador(); });
window.addEventListener('pagehide', guardarBorrador);

/* ---------- guardar / abrir ---------- */
function guardar(){
  if(vacio()) return msg('Cargá al menos el cliente o una medición antes de guardar.', true), false;
  const rec = Object.assign({ id: actualId }, JSON.parse(JSON.stringify(foto())), { _mod: Date.now(), _dirty: true, n: S.meas.length, nf: S.fotos.length });
  const i = lista.findIndex(x => x.id === actualId);
  if(i >= 0){ rec._driveId = lista[i]._driveId; lista[i] = rec; } else lista.push(rec);
  store.set('bae.inf.lista', lista);
  const rp = rec.report || {}; if(String(rp.empresa || '').trim()) window.dispatchEvent(new CustomEvent('bae:cliente', { detail: { nombre: rp.empresa, cuit: rp.cuit, direccion: rp.direccion } }));
  return true;
}
function nuevo(){
  actualId = 'i' + Date.now(); S.meas.length = 0; S.files.length = 0; S.fotos.length = 0; S.firmaCliente = null; ponerReporte({});
  DT.renderAll(); guardarBorrador(); renderFotos(); renderCierre();
}
function abrir(x, copia){
  actualId = copia ? 'i' + Date.now() : x.id;
  ponerReporte(copia ? Object.assign({}, x.report, { fecha: '' }) : (x.report || {}));
  S.meas.length = 0; S.files.length = 0; S.fotos.length = 0; S.firmaCliente = copia ? null : (x.firmaCliente || null);
  if(!copia){ (x.meas || []).forEach(m => S.meas.push(JSON.parse(JSON.stringify(m)))); (x.files || []).forEach(f => S.files.push(f)); (x.fotos || []).forEach(f => S.fotos.push(Object.assign({}, f))); }
  limites(); DT.renderAll(); guardarBorrador(); render(); renderFotos(); renderCierre(); window.scrollTo(0, 0);
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
    <div class="info"><b>${esc(r.empresa || 'Sin cliente')}${x.id === actualId ? ' <em>abierto</em>' : ''}</b>${r.obra ? `<span>${esc(r.obra)}</span>` : ''}
    <span class="meta">${esc(fmtD(r.fecha) || 'Sin fecha')} · ${n} medición${n === 1 ? '' : 'es'}${(x.nf ?? (x.fotos || []).length) ? ' · ' + (x.nf ?? x.fotos.length) + ' imagen' + ((x.nf ?? x.fotos.length) === 1 ? '' : 'es') : ''}</span></div>
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
    if(r) fotosHuerfanas(r);
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
      await sincronizarFotos();
      await N.sincronizarColeccion({ tipo: 'aj', carpeta: CARPETA, lista: () => ajustes, setLista: l => { ajustes = l; store.set('bae.aj.lista', ajustes); },
        borrados: () => [], setBorrados: () => {}, nombre: x => 'bae-ajuste-' + x.id });
      renderMiFirma(); renderCierre();
      store.set('bae.inf.ult', Date.now()); sinc = { txt: '', err: false }; ok = true;
    }catch(e){
      if(e.code === 'TOKEN') estado('La conexión con Drive venció: tocá "Sincronizar".', true);
      else if(!navigator.onLine) estado('Sin internet: se sube a Drive cuando vuelva la conexión.');
      else estado('No se pudo sincronizar: ' + e.message + '.', true);
    }finally{
      corriendo = null;
      if(ok){ const a = document.activeElement; if(!(a && card.contains(a) && a.id === 'ifBuscar')) render(); else estado(''); }
      if(ok && S.fotos.length && $('#infFotos .img:not([style*="background-image"])')) renderFotos();
      if(otraVez){ otraVez = false; sincronizar(false); }
    }
  })();
  return corriendo;
}

/* ---------- imágenes y fotos ---------- */
const MIMES_DRIVE = 'text/plain,application/octet-stream,image/png,image/jpeg,image/webp,image/gif,image/heic';
const esImagen = f => /^image\//.test(f.type || f.mimeType || '') || /\.(png|jpe?g|webp|gif|heic|bmp)$/i.test(f.name || '');
const idb = (() => {
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((ok, mal) => { const r = indexedDB.open('bae-fotos', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); }));
  const tx = (modo, fn) => db().then(d => new Promise((ok, mal) => { const t = d.transaction('f', modo); const q = fn(t.objectStore('f')); t.oncomplete = () => ok(q && q.result); t.onerror = () => mal(t.error); }));
  return { get: k => tx('readonly', s => s.get(k)), put: (k, v) => tx('readwrite', s => s.put(v, k)), del: k => tx('readwrite', s => s.delete(k)) };
})();
let fotosDrive = store.get('bae.fotos.drive', {});        // id de foto -> id de archivo en Drive
async function achicar(blob){
  const max = 1600;
  try{
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.82));
  }catch(e){ throw new Error('no se pudo abrir la imagen (formato no compatible)'); }
}
async function agregarImagenes(lista0){
  let n = 0;
  for(const f of lista0){
    try{
      const blob = f instanceof Blob ? f : new Blob([await f.arrayBuffer()], { type: f.mimeType || 'image/*' });
      const j = await achicar(blob), id = 'f' + Date.now() + Math.random().toString(36).slice(2, 6);
      await idb.put(id, j);
      S.fotos.push({ id, titulo: String(f.name || 'Imagen').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') }); n++;
    }catch(e){ decirCarga(`No pude cargar "${f.name}": ${e.message}.`, true); }
  }
  if(n){ guardarBorrador(); renderFotos(); DT.renderAll(); decirCarga(`${n} imagen${n > 1 ? 'es agregadas' : ' agregada'} al informe.`); }
}
function decirCarga(t, err){ const m = document.getElementById('loadMsg'); if(m){ m.textContent = t; m.classList.toggle('err', !!err); } }
async function cargar(list){
  const imgs = [], txts = [];
  [...list].forEach(f => (esImagen(f) ? imgs : txts).push(f));
  if(txts.length) await DT.handleFiles(txts);
  if(imgs.length) await agregarImagenes(imgs);
}
DT.cargar = cargar;
async function blobFoto(id){
  let b = await idb.get(id).catch(() => null); if(b) return b;
  if(!(N && N.conectado)) return null;
  let did = fotosDrive[id];
  if(!did){ const fs = await N.listar('foto', CARPETA); fs.forEach(f => { if(f.appProperties && f.appProperties.id) fotosDrive[f.appProperties.id] = f.id; }); store.set('bae.fotos.drive', fotosDrive); did = fotosDrive[id]; }
  if(!did) return null;
  b = await N.bajarBlob(did); await idb.put(id, b); return b;
}
async function sincronizarFotos(){
  const ids = new Set(); lista.concat([{ fotos: S.fotos }]).forEach(x => (x.fotos || []).forEach(f => ids.add(f.id)));
  if(!ids.size) return;
  const rem = await N.listar('foto', CARPETA); rem.forEach(f => { if(f.appProperties && f.appProperties.id) fotosDrive[f.appProperties.id] = f.id; });
  for(const id of ids){
    if(fotosDrive[id]) continue;
    const b = await idb.get(id).catch(() => null); if(!b) continue;
    fotosDrive[id] = await N.subir({ name: 'Imagen_' + id + '.jpg', mime: 'image/jpeg', data: b, props: { bae: 'foto', id }, carpeta: CARPETA });
  }
  store.set('bae.fotos.drive', fotosDrive);
}
function fotosHuerfanas(r){
  const usadas = new Set(); lista.filter(x => x.id !== r.id).concat([{ fotos: S.fotos }]).forEach(x => (x.fotos || []).forEach(f => usadas.add(f.id)));
  (r.fotos || []).forEach(f => { if(usadas.has(f.id)) return; if(fotosDrive[f.id]){ borrados.push(fotosDrive[f.id]); delete fotosDrive[f.id]; } idb.del(f.id).catch(() => {}); });
  store.set('bae.inf.borrados', borrados); store.set('bae.fotos.drive', fotosDrive);
}
DT.fotosParaPdf = async () => {
  const out = [];
  for(const f of S.fotos){
    const b = await blobFoto(f.id).catch(() => null); if(!b) continue;
    const data = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
    const dim = await new Promise(ok => { const im = new Image(); im.onload = () => ok({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => ok({ w: 4, h: 3 }); im.src = data; });
    out.push(Object.assign({ titulo: f.titulo, med: f.med || '', data }, dim));
  }
  return out;
};
// tarjeta "Imágenes y fotos", antes de "Descargar"
const fcard = document.createElement('section'); fcard.className = 'card'; fcard.id = 'infFotos';
{ const pdf = document.getElementById('pdfBtn'), desc = pdf && pdf.closest('section.card'); if(desc) desc.parentNode.insertBefore(fcard, desc); else v.appendChild(fcard); }
const fcss = document.createElement('style');
fcss.textContent = `
  #infFotos .fx-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
  #infFotos .fx-top h2{margin:0}
  #infFotos .fx-btns{display:flex;gap:8px}
  #infFotos .fx-btns button{padding:8px 12px;white-space:nowrap}
  #infFotos .fx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:10px}
  #infFotos .fx{position:relative;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--card)}
  #infFotos .fx .img{aspect-ratio:4/3;background:var(--neutral-bg) center/cover no-repeat;display:grid;place-items:center;color:var(--muted);font-size:12px}
  #infFotos .fx input{border:none;border-top:1px solid var(--line);border-radius:0;margin:0;padding:8px 10px;font-size:13px;width:100%;box-sizing:border-box}
  #infFotos .fx select{border:none;border-top:1px solid var(--line);border-radius:0;margin:0;padding:7px 8px;font-size:12.5px;width:100%;background:var(--neutral-bg);color:var(--ink)}
  #infFotos .fx .x{position:absolute;top:6px;right:6px;width:28px;height:28px;padding:0;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;border:none;font-size:14px;line-height:1}
  #infFotos .vacio{font-size:13px;color:var(--muted);margin:6px 0 0}`;
document.head.appendChild(fcss);
const urls = {};
function renderFotos(){
  Object.values(urls).forEach(u => URL.revokeObjectURL(u)); for(const k in urls) delete urls[k];
  fcard.innerHTML = `<div class="fx-top"><h2><span class="step">5</span> Imágenes</h2><div class="fx-btns"><button id="fxTel" title="Desde el teléfono o la PC">+ Agregar</button><button id="fxDrive" title="Desde Google Drive">Drive</button></div></div>
    <input type="file" id="fxIn" accept="image/*" multiple hidden>
    ${S.fotos.length ? '' : '<p class="vacio">Sumá fotos de la obra o capturas de pantalla. Salen en el PDF con su título.</p>'}
    <div class="fx-grid">${S.fotos.map((f, i) => `<div class="fx"><div class="img" data-fimg="${i}">…</div><button class="x" data-fdel="${i}" title="Quitar" aria-label="Quitar">✕</button><input data-ftit="${i}" value="${esc(f.titulo)}" placeholder="Título">${S.meas.length ? `<select data-fmed="${i}" title="Medición asociada"><option value="">Sin medición asociada</option>${S.meas.map((m, k) => `<option value="${esc(m.id)}" ${f.med === m.id ? 'selected' : ''}>Con la medición ${k + 1}: ${esc(m.func)}${m.ubic ? ' – ' + esc(m.ubic) : ''}</option>`).join('')}</select>` : ''}</div>`).join('')}</div>`;
  const inp = $('#fxIn', fcard);
  $('#fxTel', fcard).onclick = () => inp.click();
  inp.onchange = () => { const l = [...inp.files]; inp.value = ''; agregarImagenes(l); };
  $('#fxDrive', fcard).onclick = async () => {
    if(!N || !N.email) return;
    try{ const docs = await N.elegirArchivos({ mimes: 'image/png,image/jpeg,image/webp,image/gif,image/heic', titulo: 'Elegí imágenes para el informe' }); if(docs.length) await agregarImagenes(docs); }
    catch(e){ decirCarga('No se pudo cargar desde Drive: ' + e.message + '.', true); }
  };
  $$('[data-ftit]', fcard).forEach(el => el.oninput = () => { S.fotos[+el.dataset.ftit].titulo = el.value; });
  $$('[data-fmed]', fcard).forEach(el => el.onchange = () => { S.fotos[+el.dataset.fmed].med = el.value; guardarBorrador(); });
  $$('[data-fdel]', fcard).forEach(b => b.onclick = () => { S.fotos.splice(+b.dataset.fdel, 1); guardarBorrador(); renderFotos(); DT.renderAll(); });
  S.fotos.forEach(async (f, i) => {
    const el = $(`[data-fimg="${i}"]`, fcard); if(!el) return;
    const b = await blobFoto(f.id).catch(() => null);
    if(!el.isConnected) return;
    if(b){ urls[f.id] = URL.createObjectURL(b); el.style.backgroundImage = `url("${urls[f.id]}")`; el.textContent = ''; }
    else el.textContent = '☁ Sincronizá para verla';
  });
}
// renumerar el paso "Descargar" (pasa a 6)
{ const st = document.getElementById('pdfBtn'); const h = st && st.closest('section.card').querySelector('.step'); if(h) h.textContent = '6'; }

/* ---------- fuentes de mediciones: archivos, Drive y Bluetooth ---------- */
(function(){
  const drop = document.getElementById('drop'), card = drop && drop.closest('section.card'); if(!drop) return;
  const decir = (t, err) => { const m = document.getElementById('loadMsg'); if(m){ m.textContent = t; m.classList.toggle('err', !!err); } };
  drop.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); drop.click(); } });
  // se puede soltar archivos en toda la tarjeta
  if(card){
    ['dragenter', 'dragover'].forEach(ev => card.addEventListener(ev, e => { if(e.dataTransfer && [...e.dataTransfer.types].includes('Files')){ e.preventDefault(); card.classList.add('over'); } }));
    ['dragleave', 'drop'].forEach(ev => card.addEventListener(ev, e => { if(ev === 'dragleave' && card.contains(e.relatedTarget)) return; card.classList.remove('over'); }));
    card.addEventListener('drop', e => { if(e.target.closest('#drop')) return; e.preventDefault(); cargar([...e.dataTransfer.files]); });
  }
  // Drive
  const bd = document.getElementById('srcDrive');
  if(bd) bd.onclick = async () => {
    if(!N || !N.email){ decir('Ingresá con tu cuenta de Google para usar Drive.', true); return; }
    decir('Abriendo Google Drive…');
    try{
      const docs = await N.elegirArchivos({ mimes: MIMES_DRIVE, titulo: 'Elegí los .txt del DT-6650 o imágenes' });
      if(!docs.length){ decir(''); return; }
      decir(`Descargando ${docs.length} archivo${docs.length > 1 ? 's' : ''} de Drive…`);
      await cargar(docs);
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


/* ---------- firma (pad de dibujo) ---------- */
function firmar(titulo){
  return new Promise(ok => {
    const ov = document.createElement('div'); ov.className = 'bae-modal';
    ov.innerHTML = `<div class="bm-box"><div class="bm-top"><b>${esc(titulo)}</b><button class="bm-x" aria-label="Cerrar">✕</button></div>
      <canvas class="pad" width="900" height="360"></canvas><p class="bm-hint">Firmá con el dedo o el mouse dentro del recuadro.</p>
      <div class="row"><button class="bm-borrar">Borrar</button><span style="flex:1"></span><button class="bm-cancel">Cancelar</button><button class="primary bm-ok">Listo</button></div></div>`;
    document.body.appendChild(ov); document.documentElement.style.overflow = 'hidden';
    const cv = ov.querySelector('canvas'), cx = cv.getContext('2d'); let dib = false, trazos = 0, last = null;
    cx.lineWidth = 4.5; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = '#0d1b3a';
    const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.addEventListener('pointerdown', e => { dib = true; last = pt(e); cv.setPointerCapture(e.pointerId); trazos++; cx.beginPath(); cx.arc(last[0], last[1], 2, 0, 7); cx.fillStyle = '#0d1b3a'; cx.fill(); });
    cv.addEventListener('pointermove', e => { if(!dib) return; const p = pt(e); cx.beginPath(); cx.moveTo(last[0], last[1]); cx.lineTo(p[0], p[1]); cx.stroke(); last = p; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => cv.addEventListener(t, () => { dib = false; }));
    const cerrar = v => { ov.remove(); document.documentElement.style.overflow = ''; ok(v); };
    ov.querySelector('.bm-borrar').onclick = () => { cx.clearRect(0, 0, cv.width, cv.height); trazos = 0; };
    ov.querySelector('.bm-cancel').onclick = ov.querySelector('.bm-x').onclick = () => cerrar(null);
    ov.querySelector('.bm-ok').onclick = () => {
      if(!trazos) return cerrar(null);
      // recortar al contenido
      const d = cx.getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
      for(let y = 0; y < cv.height; y += 2) for(let x = 0; x < cv.width; x += 2) if(d[(y * cv.width + x) * 4 + 3] > 0){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
      const pad = 10; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(cv.width, x1 + pad); y1 = Math.min(cv.height, y1 + pad);
      const w = x1 - x0, hh = y1 - y0, k = Math.max(w / 54, hh / 24), c2 = document.createElement('canvas');
      c2.width = Math.round(54 * k); c2.height = Math.round(24 * k);
      c2.getContext('2d').drawImage(cv, x0, y0, w, hh, (c2.width - w) / 2, (c2.height - hh) / 2, w, hh);
      cerrar(c2.toDataURL('image/png'));
    };
  });
}
const mcss = document.createElement('style');
mcss.textContent = `
  .bae-modal{position:fixed;inset:0;z-index:9000;background:rgba(10,20,15,.55);display:grid;place-items:center;padding:14px}
  .bae-modal .bm-box{width:min(720px,100%);max-height:100%;overflow:auto;background:var(--card);border-radius:16px;padding:16px;display:grid;gap:10px}
  .bae-modal .bm-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
  .bae-modal .bm-x{width:34px;height:34px;padding:0;border-radius:50%}
  .bae-modal .pad{width:100%;aspect-ratio:5/2;background:#fff;border:1.5px dashed var(--line);border-radius:12px;touch-action:none}
  .bae-modal .bm-hint{margin:0;font-size:12.5px;color:var(--muted)}
  .bae-modal .mapa{width:100%;height:min(70vh,520px);border-radius:12px;overflow:hidden}
  .pin-num{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#0F2733;color:#fff;font:700 13px system-ui;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)}
  .pin-num.bad{background:#b42318}
  #infCierre .ci-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  #infCierre .firma-img{height:56px;background:#fff;border:1px solid var(--line);border-radius:8px;padding:2px 8px}
  #infCierre .dic{padding:10px 14px;border-radius:12px;font-size:14px;font-weight:600;margin-bottom:12px}
  #infCierre .dic.ok{background:color-mix(in srgb, #0b7a4b 12%, var(--card));color:#0b7a4b}
  #infCierre .dic.bad{background:color-mix(in srgb, #b42318 10%, var(--card));color:#b42318}
  #infCierre .dic small{display:block;font-weight:400;color:var(--muted);margin-top:2px}
  #infCierre label{margin:0}
  .mapa-btn{padding:6px 12px;font-size:13px}`;
document.head.appendChild(mcss);

/* ---------- firma del técnico (una vez, sincronizada) ---------- */
let ajustes = store.get('bae.aj.lista', []);
const firmaTec = () => { const f = ajustes.find(x => x.id === 'firma'); return f && f.data || null; };
DT.firmaTecnico = firmaTec;
function setFirmaTec(data){
  ajustes = ajustes.filter(x => x.id !== 'firma');
  const prev = store.get('bae.aj.lista', []).find(x => x.id === 'firma');
  if(data) ajustes.push({ id: 'firma', data, _mod: Date.now(), _dirty: true, _driveId: prev && prev._driveId });
  else if(prev && prev._driveId){ borrados.push(prev._driveId); store.set('bae.inf.borrados', borrados); }
  store.set('bae.aj.lista', ajustes); renderMiFirma(); renderCierre(); sincronizar(true);
}
function renderMiFirma(){
  const box = document.querySelector('#perfilCard details'); if(!box) return;
  let el = document.getElementById('miFirma');
  if(!el){ el = document.createElement('div'); el.id = 'miFirma'; el.style.marginTop = '14px'; const ref = box.querySelector('#pfMsg'); box.insertBefore(el, ref || null); }
  const f = firmaTec();
  el.innerHTML = `<h3 class="sub" style="margin:0 0 6px">Mi firma</h3><div class="row" style="align-items:center">${f ? `<img src="${f}" alt="Tu firma" style="height:56px;background:#fff;border:1px solid var(--line);border-radius:8px;padding:2px 8px">` : '<span class="hint" style="margin:0">Todavía no cargaste tu firma. Sale en los informes PDF.</span>'}
    <button id="mfDib">${f ? 'Cambiar' : 'Dibujar mi firma'}</button>${f ? '<button id="mfBor">Quitar</button>' : ''}</div>`;
  el.querySelector('#mfDib').onclick = async () => { const d = await firmar('Tu firma'); if(d) setFirmaTec(d); };
  const b = el.querySelector('#mfBor'); if(b) b.onclick = () => setFirmaTec(null);
}

/* ---------- cierre del informe: dictamen + conformidad del cliente ---------- */
const cierre = document.createElement('section'); cierre.className = 'card'; cierre.id = 'infCierre';
{ const desc = document.getElementById('pdfBtn').closest('section.card'); desc.parentNode.insertBefore(cierre, desc); }
function renderCierre(){
  const dic = DT.dictamen ? DT.dictamen() : { ok: 0, bad: [], na: 0, total: 0 };
  const ev = dic.ok + dic.bad.length, fc = S.firmaCliente || {};
  cierre.innerHTML = `<h2><span class="step">6</span> Dictamen y firmas</h2>
    ${ev ? `<div class="dic ${dic.bad.length ? 'bad' : 'ok'}">${dic.bad.length ? `✗ NO CUMPLE en ${dic.bad.length} de ${ev} mediciones` : `✓ CUMPLE · ${ev} de ${ev} mediciones evaluadas`}
      ${dic.na ? `<small>${dic.na} sin límite definido (no se evalúan). Cargalos en "Límites".</small>` : ''}${dic.bad.length ? `<small>${dic.bad.map(x => 'N° ' + (x.i + 1) + ' ' + esc(x.m.func) + (x.m.ubic ? ' – ' + esc(x.m.ubic) : '')).join(' · ')}</small>` : ''}</div>`
      : `<p class="hint" style="margin:0 0 12px">${dic.total ? 'Definí los límites para que la app arme el dictamen (cumple / no cumple).' : 'El dictamen se arma solo cuando cargás mediciones con límites.'}</p>`}
    <div class="ci-row"><b style="font-size:14px">Tu firma</b>${firmaTec() ? `<img class="firma-img" src="${firmaTec()}" alt="Tu firma">` : '<span class="hint" style="margin:0">sin cargar</span>'}<button id="ciTec">${firmaTec() ? 'Cambiar' : 'Dibujar'}</button></div>
    <div class="ci-row" style="margin-top:12px"><b style="font-size:14px">Conformidad del cliente</b>${fc.data ? `<img class="firma-img" src="${fc.data}" alt="Firma del cliente">` : ''}<button id="ciCli">${fc.data ? 'Volver a firmar' : 'Firmar en pantalla'}</button>${fc.data ? '<button id="ciCliBor">Quitar</button>' : ''}</div>
    <label style="margin-top:10px">Aclaración del cliente<input id="ciAcl" value="${esc(fc.aclaracion || '')}" placeholder="Nombre y DNI de quien firma"></label>`;
  $('#ciTec', cierre).onclick = async () => { const d = await firmar('Tu firma'); if(d) setFirmaTec(d); };
  $('#ciCli', cierre).onclick = async () => { const d = await firmar('Firma del cliente'); if(d){ S.firmaCliente = Object.assign({}, S.firmaCliente, { data: d }); guardarBorrador(); renderCierre(); } };
  const cb = $('#ciCliBor', cierre); if(cb) cb.onclick = () => { S.firmaCliente = Object.assign({}, S.firmaCliente, { data: null }); guardarBorrador(); renderCierre(); };
  $('#ciAcl', cierre).oninput = e => { S.firmaCliente = Object.assign({}, S.firmaCliente, { aclaracion: e.target.value }); };
  const st = document.getElementById('pdfBtn').closest('section.card').querySelector('.step'); if(st) st.textContent = '7';
}
// el dictamen se actualiza cuando cambian mediciones o límites
{ let t = null, nMed = -1; const ob = new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { try{ renderCierre(); }catch(e){} if(S.meas.length !== nMed){ nMed = S.meas.length; try{ renderFotos(); }catch(e){} } }, 120); });
  ['measList', 'limitsBox'].forEach(id => { const el = document.getElementById(id); if(el) ob.observe(el, { childList: true }); }); }
document.addEventListener('input', e => { if(e.target.closest && e.target.closest('#limitsBox, .limits')) setTimeout(renderCierre, 0); });
document.addEventListener('change', e => { if(e.target.closest && e.target.closest('#limitsBox, .limits')) setTimeout(renderCierre, 0); });

/* ---------- mapa de mediciones ---------- */
let leafletP = null;
function cargarLeaflet(){
  if(window.L && L.map) return Promise.resolve();
  if(leafletP) return leafletP;
  leafletP = new Promise((ok, mal) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload = () => ok(); s.onerror = () => { leafletP = null; mal(new Error('sin conexión para cargar el mapa')); }; document.head.appendChild(s);
  });
  return leafletP;
}
async function verMapa(){
  const pts = S.meas.map((m, i) => ({ m, i, c: DT.gpsCoords(m.gps) })).filter(x => x.c);
  const ov = document.createElement('div'); ov.className = 'bae-modal';
  ov.innerHTML = `<div class="bm-box"><div class="bm-top"><b>Mediciones en el mapa (${pts.length})</b><button class="bm-x" aria-label="Cerrar">✕</button></div>
    ${pts.length ? '<div class="mapa" id="mapaMed"></div><p class="bm-hint">Tocá un punto para ver la medición. Verde: cumple · Rojo: no cumple.</p>' : '<p>Ninguna medición tiene ubicación GPS. Guardalas con la casilla "Guardar la ubicación GPS" tildada, o cargá la ubicación con 📍 en cada medición.</p>'}</div>`;
  document.body.appendChild(ov); document.documentElement.style.overflow = 'hidden';
  const cerrar = () => { ov.remove(); document.documentElement.style.overflow = ''; };
  ov.querySelector('.bm-x').onclick = cerrar; ov.addEventListener('click', e => { if(e.target === ov) cerrar(); });
  if(!pts.length) return;
  try{ await cargarLeaflet(); }catch(e){ ov.querySelector('.mapa').outerHTML = '<p>' + esc(e.message) + '.</p>'; return; }
  const mapa = L.map('mapaMed'); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa);
  const b = [];
  pts.forEach(({ m, i, c }) => {
    const ev = DT.evaluate(m), ll = [+c[0], +c[1]]; b.push(ll);
    L.marker(ll, { icon: L.divIcon({ className: '', html: `<div class="pin-num${ev.cls === 'bad' ? ' bad' : ''}">${i + 1}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }) })
      .addTo(mapa).bindPopup(`<b>${i + 1}. ${esc(m.func)}</b>${m.ubic ? '<br>' + esc(m.ubic) : ''}<br>${esc(DT.summaryVals(m)[0])} · ${esc(ev.txt)}<br><a href="https://www.google.com/maps?q=${ll[0]},${ll[1]}" target="_blank" rel="noopener">Abrir en Google Maps</a>`);
  });
  if(b.length === 1) mapa.setView(b[0], 18); else mapa.fitBounds(b, { padding: [30, 30], maxZoom: 19 });
  setTimeout(() => mapa.invalidateSize(), 50);
}
{ const ml = document.getElementById('measList'), h2 = ml && ml.closest('section.card').querySelector('h2');
  if(h2){ const w = document.createElement('div'); w.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px';
    h2.parentNode.insertBefore(w, h2); w.appendChild(h2); h2.style.margin = '0';
    const bt = document.createElement('button'); bt.className = 'mapa-btn'; bt.textContent = '🗺 Mapa'; bt.title = 'Ver las mediciones con GPS en el mapa'; bt.onclick = verMapa; w.appendChild(bt); } }

/* ---------- informe nuevo para un cliente (desde agenda o presupuesto) ---------- */
function nuevoPara(c){
  guardarBorrador(); if(!vacio() && !lista.some(x => x.id === actualId)) guardar();
  nuevo(); ponerReporte({ empresa: c.empresa || c.nombre || '', cuit: c.cuit || '', obra: c.obra || '', direccion: c.direccion || [c.direccion, c.localidad].filter(Boolean).join(', ') });
  guardarBorrador(); render(); renderCierre();
}

/* el PDF del informe también lo guarda */
document.addEventListener('click', e => { if(e.target && e.target.id === 'pdfBtn' && !vacio()){ guardarBorrador(); if(guardar()){ render(); sincronizar(true); } } }, true);
/* ---------- instrumentos utilizados ---------- */
const TIPOS_INS = ['Pinza amperométrica', 'Pinza de fugas', 'Telurímetro', 'Megóhmetro', 'Multímetro', 'Detector de tensión', 'Secuencímetro', 'Termómetro infrarrojo', 'Cámara termográfica', 'Analizador de redes', 'Luxómetro', 'Manómetro', 'Detector de fugas de gas'];
let instrs = store.get('bae.instr.lista', []), instrBorr = store.get('bae.instr.borrados', []);
const guardarInstrs = () => store.set('bae.instr.lista', instrs);
const dtIns = () => { const p = window.__perfil ? window.__perfil() : {}; return { id: 'dt6650', nombre: [p.eqNombre, p.eqModelo].filter(Boolean).join(' ') || 'CEM DT-6650', serie: p.serie || '', cal: p.calibracion ? p.calibracion + (p.calVence ? ' (vence ' + p.calVence + ')' : '') : '' }; };
const catalogo = () => [dtIns(), ...instrs.filter(x => !x._del)];
const seleccion = () => Array.isArray(S.report.instr) ? S.report.instr : [dtIns()];
const detalleIns = x => [x.serie ? 'N° de serie ' + x.serie : '', x.cal ? 'Calibración: ' + x.cal : ''].filter(Boolean).join(' · ');
DT.instrumentos = () => seleccion();
const boxIns = document.createElement('div'); boxIns.id = 'infInstr';
{ const fx = document.getElementById('infFijos'); if(fx) fx.after(boxIns); }
const cssIns = document.createElement('style');
cssIns.textContent = `#infInstr{margin-top:14px}#infInstr h3{margin:0 0 8px;font-size:14px}
  #infInstr .ins{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:8px;cursor:pointer}
  #infInstr .ins.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 6%,transparent)}
  #infInstr .ins input[type=checkbox]{width:20px;height:20px;margin:0;flex:none}
  #infInstr .ins .t{flex:1;min-width:0;display:grid;gap:2px}#infInstr .ins .t span{font-size:12.5px;color:var(--muted)}
  #infInstr .ins button{flex:none;padding:6px 10px;font-size:13px}
  #infInstr .insf{border:1px dashed var(--line);border-radius:12px;padding:12px;display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
  #infInstr .insf .row{grid-column:1/-1;margin:0}`;
document.head.appendChild(cssIns);
let editIns = null;   // id en edición, 'nuevo' o null
function renderInstr(){
  const sel = new Set(seleccion().map(x => x.id));
  const fila = x => `<label class="ins${sel.has(x.id) ? ' on' : ''}"><input type="checkbox" data-ins="${esc(x.id)}" ${sel.has(x.id) ? 'checked' : ''}>
    <span class="t"><b>${esc(x.nombre)}</b><span>${esc(detalleIns(x) || 'Sin datos de serie ni calibración')}</span></span>
    ${x.id === 'dt6650' ? '' : `<button type="button" class="link" data-insed="${esc(x.id)}">Editar</button>`}</label>`;
  const ed = editIns ? (editIns === 'nuevo' ? {} : instrs.find(x => x.id === editIns) || {}) : null;
  boxIns.innerHTML = `<h3>Instrumentos utilizados <span style="font-weight:400;color:var(--muted);font-size:12.5px">· tildá los que salen en el informe</span></h3>
    ${catalogo().map(fila).join('')}
    ${ed ? `<div class="insf"><label>Instrumento<input id="insNom" list="dlTiposIns" value="${esc(ed.nombre || '')}" placeholder="ej. Pinza amperométrica UNI-T UT204+"></label>
      <label>N° de serie<input id="insSer" value="${esc(ed.serie || '')}"></label>
      <label>Calibración<input id="insCal" value="${esc(ed.cal || '')}" placeholder="ej. 03/2026 (vence 03/2027)"></label>
      <div class="row"><button type="button" class="primary" id="insOk">Guardar instrumento</button><button type="button" id="insNo">Cancelar</button>${editIns !== 'nuevo' ? '<button type="button" class="link" id="insDel">Borrar de la lista</button>' : ''}</div>
      <datalist id="dlTiposIns">${TIPOS_INS.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>`
      : '<button type="button" id="insAdd">+ Agregar instrumento</button>'}`;
}
boxIns.addEventListener('change', e => { const c = e.target.closest('[data-ins]'); if(!c) return;
  const cur = seleccion().filter(x => x.id !== c.dataset.ins);
  if(c.checked){ const x = catalogo().find(y => y.id === c.dataset.ins); if(x) cur.push({ id: x.id, nombre: x.nombre, serie: x.serie || '', cal: x.cal || '' }); }
  const orden = catalogo().map(x => x.id); cur.sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id));
  S.report.instr = cur; guardarBorrador(); renderInstr(); });
boxIns.addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return; e.preventDefault();
  if(b.id === 'insAdd'){ editIns = 'nuevo'; renderInstr(); $('#insNom', boxIns).focus(); }
  else if(b.id === 'insNo'){ editIns = null; renderInstr(); }
  else if(b.dataset.insed){ editIns = b.dataset.insed; renderInstr(); }
  else if(b.id === 'insOk'){
    const nombre = $('#insNom', boxIns).value.trim(); if(!nombre){ $('#insNom', boxIns).focus(); return; }
    const datos = { nombre, serie: $('#insSer', boxIns).value.trim(), cal: $('#insCal', boxIns).value.trim() };
    let x; if(editIns === 'nuevo'){ x = Object.assign({ id: 'ins' + Date.now() }, datos); instrs.push(x); }
    else { x = instrs.find(y => y.id === editIns); Object.assign(x, datos); }
    x._mod = Date.now(); x._dirty = true; guardarInstrs();
    // queda tildado en el informe actual, con los datos al día
    S.report.instr = seleccion().filter(y => y.id !== x.id).concat({ id: x.id, nombre: x.nombre, serie: x.serie, cal: x.cal }); guardarBorrador();
    editIns = null; renderInstr(); sincronizarIns();
  }
  else if(b.id === 'insDel'){
    const x = instrs.find(y => y.id === editIns); if(!x || !confirm('¿Borrar "' + x.nombre + '" de tu lista de instrumentos?')) return;
    if(x._driveId){ instrBorr.push(x._driveId); store.set('bae.instr.borrados', instrBorr); }
    instrs = instrs.filter(y => y.id !== x.id); guardarInstrs(); editIns = null; renderInstr(); sincronizarIns();
  }
});
let insCorr = null;
async function sincronizarIns(){
  if(!N || !N.email || !N.conectado || insCorr) return;
  insCorr = N.sincronizarColeccion({ tipo: 'ins', carpeta: CARPETA, lista: () => instrs, setLista: l => { instrs = l; guardarInstrs(); },
    borrados: () => instrBorr, setBorrados: b => { instrBorr = b; store.set('bae.instr.borrados', instrBorr); },
    nombre: x => ('Instrumento_' + x.nombre).replace(/[\\/:*?"<>|]+/g, '_') }).then(() => renderInstr()).catch(() => {}).finally(() => { insCorr = null; });
}
insListo = true; renderInstr();

// borrador vacío de otro día: arranca con la fecha de hoy
function fechaHoy(){ const hoy = hoyLocal(), el = document.querySelector('#reportForm [data-k="fecha"]');
  if(el && vacio() && S.report.fecha !== hoy){ el.value = hoy; S.report.fecha = hoy; guardarBorrador(); } }
fechaHoy();
window.addEventListener('hashchange', () => { if(location.hash === '#informe'){ fechaHoy(); render(); sincronizar(false); sincronizarIns(); } });
window.addEventListener('online', () => sincronizar(false));
if(N) N.onCambio(() => { if(location.hash === '#informe') render(); });

render(); renderFotos(); renderCierre(); renderMiFirma();
if(location.hash === '#informe') setTimeout(() => sincronizar(false), 300);
window.__informes = { get lista(){ return lista; }, sincronizar, guardar, nuevo, nuevoPara, firmar };
})();
