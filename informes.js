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
if(!Array.isArray(S.fotos)) S.fotos = [];
const foto = () => ({ report: Object.fromEntries(CLIENTE.concat('fecha').map(k => [k, S.report[k] || ''])), meas: S.meas, files: S.files, fotos: S.fotos });
const vacio = () => !S.meas.length && !S.fotos.length && !CLIENTE.some(k => String(S.report[k] || '').trim());
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
  S.fotos.length = 0; (b.fotos || []).forEach(f => S.fotos.push(f));
  limites(); ultimo = JSON.stringify(foto()); DT.renderAll();
})();
setInterval(guardarBorrador, 2000);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') guardarBorrador(); });
window.addEventListener('pagehide', guardarBorrador);

/* ---------- guardar / abrir ---------- */
function guardar(){
  if(vacio()) return msg('Cargá al menos la empresa o una medición antes de guardar.', true), false;
  const rec = Object.assign({ id: actualId }, JSON.parse(JSON.stringify(foto())), { _mod: Date.now(), _dirty: true, n: S.meas.length, nf: S.fotos.length });
  const i = lista.findIndex(x => x.id === actualId);
  if(i >= 0){ rec._driveId = lista[i]._driveId; lista[i] = rec; } else lista.push(rec);
  store.set('bae.inf.lista', lista); return true;
}
function nuevo(){
  actualId = 'i' + Date.now(); S.meas.length = 0; S.files.length = 0; S.fotos.length = 0; ponerReporte({});
  DT.renderAll(); guardarBorrador(); renderFotos();
}
function abrir(x, copia){
  actualId = copia ? 'i' + Date.now() : x.id;
  ponerReporte(copia ? Object.assign({}, x.report, { fecha: '' }) : (x.report || {}));
  S.meas.length = 0; S.files.length = 0; S.fotos.length = 0;
  if(!copia){ (x.meas || []).forEach(m => S.meas.push(JSON.parse(JSON.stringify(m)))); (x.files || []).forEach(f => S.files.push(f)); (x.fotos || []).forEach(f => S.fotos.push(Object.assign({}, f))); }
  limites(); DT.renderAll(); guardarBorrador(); render(); renderFotos(); window.scrollTo(0, 0);
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
    out.push(Object.assign({ titulo: f.titulo, data }, dim));
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
  #infFotos .fx .x{position:absolute;top:6px;right:6px;width:28px;height:28px;padding:0;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;border:none;font-size:14px;line-height:1}
  #infFotos .vacio{font-size:13px;color:var(--muted);margin:6px 0 0}`;
document.head.appendChild(fcss);
const urls = {};
function renderFotos(){
  Object.values(urls).forEach(u => URL.revokeObjectURL(u)); for(const k in urls) delete urls[k];
  fcard.innerHTML = `<div class="fx-top"><h2><span class="step">5</span> Imágenes</h2><div class="fx-btns"><button id="fxTel" title="Desde el teléfono o la PC">+ Agregar</button><button id="fxDrive" title="Desde Google Drive">Drive</button></div></div>
    <input type="file" id="fxIn" accept="image/*" multiple hidden>
    ${S.fotos.length ? '' : '<p class="vacio">Sumá fotos de la obra o capturas de pantalla. Salen en el PDF con su título.</p>'}
    <div class="fx-grid">${S.fotos.map((f, i) => `<div class="fx"><div class="img" data-fimg="${i}">…</div><button class="x" data-fdel="${i}" title="Quitar" aria-label="Quitar">✕</button><input data-ftit="${i}" value="${esc(f.titulo)}" placeholder="Título"></div>`).join('')}</div>`;
  const inp = $('#fxIn', fcard);
  $('#fxTel', fcard).onclick = () => inp.click();
  inp.onchange = () => { const l = [...inp.files]; inp.value = ''; agregarImagenes(l); };
  $('#fxDrive', fcard).onclick = async () => {
    if(!N || !N.email) return;
    try{ const docs = await N.elegirArchivos({ mimes: 'image/png,image/jpeg,image/webp,image/gif,image/heic', titulo: 'Elegí imágenes para el informe' }); if(docs.length) await agregarImagenes(docs); }
    catch(e){ decirCarga('No se pudo cargar desde Drive: ' + e.message + '.', true); }
  };
  $$('[data-ftit]', fcard).forEach(el => el.oninput = () => { S.fotos[+el.dataset.ftit].titulo = el.value; });
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

/* el PDF del informe también lo guarda */
document.addEventListener('click', e => { if(e.target && e.target.id === 'pdfBtn' && !vacio()){ guardarBorrador(); if(guardar()){ render(); sincronizar(true); } } }, true);
window.addEventListener('hashchange', () => { if(location.hash === '#informe'){ render(); sincronizar(false); } });
window.addEventListener('online', () => sincronizar(false));
if(N) N.onCambio(() => { if(location.hash === '#informe') render(); });

render(); renderFotos();
if(location.hash === '#informe') setTimeout(() => sincronizar(false), 300);
window.__informes = { get lista(){ return lista; }, sincronizar, guardar, nuevo };
})();
