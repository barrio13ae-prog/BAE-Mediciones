/* Ingreso con Google (solo cuentas del dominio) y acceso a Google Drive — BAE Servicios de Instalaciones */
(function(){
'use strict';
const CLIENT_ID = '1016468287608-ec3tv211ih3bicr7eb1sqj6okh947rqt.apps.googleusercontent.com';
const DOMINIO = 'baeinstalaciones.com.ar';
const SCOPES = 'openid email https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';
const LECTURA = 'https://www.googleapis.com/auth/drive.readonly';   // para elegir archivos propios de Drive desde la app
const CARPETA = 'BAE Presupuestos';
const API = 'https://www.googleapis.com/drive/v3';
const UP = 'https://www.googleapis.com/upload/drive/v3';

const ls = { get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
             set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
             del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
const ss = { get(k){ try{ const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : null; }catch(e){ return null; } },
             set(k, v){ try{ sessionStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
             del(k){ try{ sessionStorage.removeItem(k); }catch(e){} } };

let auth = ls.get('bae.auth', null);          // { email } de la última cuenta que ingresó en este dispositivo
// { t: access_token, exp: ms } — se guarda en el dispositivo (no solo en la pestaña) para que la app instalada
// siga sincronizando al cerrarla y volver a abrirla mientras el permiso de Google esté vigente (dura 1 hora)
let tok = ls.get('bae.tok', null) || ss.get('bae.tok'); ss.del('bae.tok');
let client = null, esperando = [];
const oyentes = new Set();
const avisar = () => oyentes.forEach(f => { try{ f(); }catch(e){} });
const tokenOk = () => tok && tok.t && tok.exp > Date.now() + 60e3;

/* ---------- librería de Google ---------- */
let gsiPromesa = null;
function cargarGsi(){
  if(window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
  if(gsiPromesa) return gsiPromesa;
  gsiPromesa = new Promise((ok, mal) => {
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => ok(); s.onerror = () => { gsiPromesa = null; mal(new Error('sin conexión con Google')); };
    document.head.appendChild(s);
  });
  return gsiPromesa;
}
function cliente(){
  if(client) return client;
  client = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID, scope: SCOPES, hd: DOMINIO, login_hint: auth && auth.email || undefined,
    callback: r => {
      const cola = esperando; esperando = [];
      if(r && r.access_token){ tok = { t: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000, sc: r.scope || '' }; ls.set('bae.tok', tok); cola.forEach(c => c.ok(tok.t)); setTimeout(pulso, 50); }
      else cola.forEach(c => c.mal(new Error(r && r.error || 'no autorizado')));
      avisar();
    },
    error_callback: e => { const cola = esperando; esperando = []; cola.forEach(c => c.mal(new Error(e && e.type === 'popup_closed' ? 'cerraste la ventana de Google' : 'no se pudo abrir la ventana de Google'))); avisar(); }
  });
  return client;
}
/* Pide un token. Debe llamarse desde un toque del usuario (si no, el navegador bloquea la ventana). */
function pedirToken(elegirCuenta, alcance){
  if(tokenOk() && (!alcance || (tok.sc || '').includes(alcance))) return Promise.resolve(tok.t);
  if(!(window.google && google.accounts && google.accounts.oauth2)) return cargarGsi().then(() => Promise.reject(new Error('Google recién terminó de cargar: tocá de nuevo')));
  return new Promise((ok, mal) => { esperando.push({ ok, mal }); cliente().requestAccessToken({ prompt: elegirCuenta ? 'select_account' : alcance && tokenOk() ? 'consent' : '' }); });
}

/* ---------- pantalla de ingreso ---------- */
function pantallaIngreso(){
  if(auth && auth.email) return;
  const g = document.createElement('div'); g.id = 'baeGate';
  g.innerHTML = `<div class="gate-box">
    ${window.BAE_LOGO ? window.BAE_LOGO.mark.replace('<svg ', '<svg width="84" height="84" aria-hidden="true" ') : ''}
    <h1>BAE Servicios de Instalaciones</h1>
    <p>Ingresá con tu cuenta <b>@${DOMINIO}</b> para usar la app.</p>
    <button class="primary" id="gateBtn">Ingresar con Google</button>
    <p class="gate-msg" id="gateMsg"></p></div>`;
  const css = document.createElement('style');
  css.textContent = `#baeGate{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;background:var(--bg,#eef5f1)}
    #baeGate .gate-box{max-width:360px;width:100%;text-align:center;display:grid;gap:14px;justify-items:center;padding:28px 22px;border-radius:18px;background:var(--card,#fff);border:1px solid var(--line,#cfe0d6)}
    #baeGate h1{font-size:20px;margin:0}
    #baeGate p{margin:0;color:var(--muted,#4c5d54);font-size:15px}
    #baeGate button{width:100%;padding:13px;font-size:16px}
    #baeGate .gate-msg{min-height:1.2em;font-size:14px}
    #baeGate .gate-msg.err{color:#b42318}`;
  document.head.appendChild(css); document.body.appendChild(g);
  document.documentElement.style.overflow = 'hidden';
  const m = g.querySelector('#gateMsg'), btn = g.querySelector('#gateBtn');
  const decir = (t, err) => { m.textContent = t; m.classList.toggle('err', !!err); };
  cargarGsi().catch(() => decir('Sin conexión: la primera vez hace falta internet para ingresar.', true));
  btn.onclick = async () => {
    btn.disabled = true; decir('Abriendo Google…');
    try{
      const t = await pedirToken(true);
      const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + t } });
      const u = r.ok ? await r.json() : {};
      const email = String(u.email || '').toLowerCase();
      if(!email.endsWith('@' + DOMINIO)){ salir(); decir('Esa cuenta no está autorizada. Usá una cuenta @' + DOMINIO + '.', true); btn.disabled = false; return; }
      auth = { email }; ls.set('bae.auth', auth); client = null;
      g.remove(); document.documentElement.style.overflow = ''; avisar();
    }catch(e){ decir('No se pudo ingresar: ' + e.message + '.', true); btn.disabled = false; }
  };
}
function salir(){
  if(tok && tok.t && window.google && google.accounts && google.accounts.oauth2){ try{ google.accounts.oauth2.revoke(tok.t, () => {}); }catch(e){} }
  tok = null; ls.del('bae.tok'); auth = null; ls.del('bae.auth'); client = null; avisar();
}

/* ---------- Google Drive ---------- */
let enCurso = 0, ultOk = ls.get('bae.drive.ultOk', 0), ultErr = '';
async function api(url, opt = {}, reintento){
  if(!tokenOk()) throw Object.assign(new Error('hay que reconectar Google Drive'), { code: 'TOKEN' });
  enCurso++; indicador();
  let r;
  try{ r = await fetch(url, Object.assign({}, opt, { headers: Object.assign({ Authorization: 'Bearer ' + tok.t }, opt.headers || {}) })); }
  catch(e){ ultErr = navigator.onLine === false ? '' : 'sin conexión con Drive'; throw e; }
  finally{ enCurso--; setTimeout(indicador, 400); }
  if(r.ok){ ultOk = Date.now(); ultErr = ''; ls.set('bae.drive.ultOk', ultOk); }
  else if(r.status !== 404) ultErr = 'Drive respondió ' + r.status;
  if(r.status === 401){ tok = null; ls.del('bae.tok'); avisar(); throw Object.assign(new Error('hay que reconectar Google Drive'), { code: 'TOKEN' }); }
  if(!r.ok){
    if(!reintento && (r.status === 429 || r.status >= 500)){ await new Promise(x => setTimeout(x, 1500)); return api(url, opt, true); }
    let det = ''; try{ const j = await r.json(); const e = j.error || {}; const razon = (e.errors && e.errors[0] && e.errors[0].reason) || (e.details && e.details[0] && e.details[0].reason) || e.status || '';
      if(/accessNotConfigured|SERVICE_DISABLED/i.test(razon + ' ' + e.message)) det = 'la API de Google Drive no está habilitada en el proyecto de Google Cloud';
      else if(/insufficient|PERMISSION_DENIED|scope/i.test(razon + ' ' + e.message)) det = 'falta el permiso de Drive: cerrá sesión y volvé a ingresar marcando el permiso de Drive';
      else det = e.message || razon; }catch(x){}
    throw new Error('Drive respondió ' + r.status + (det ? ' (' + det + ')' : ''));
  }
  return r;
}
const carpetas = ls.get('bae.drive.carpetas', {});
{ const vieja = ls.get('bae.drive.carpeta', null); if(vieja && !carpetas[CARPETA]) carpetas[CARPETA] = vieja; }
async function carpeta(nombre = CARPETA){
  if(carpetas[nombre]) return carpetas[nombre];
  const q = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${nombre}' and trashed=false`);
  const r = await (await api(`${API}/files?q=${q}&fields=files(id)&spaces=drive`)).json();
  let id;
  if(r.files && r.files.length) id = r.files[0].id;
  else id = (await (await api(`${API}/files?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nombre, mimeType: 'application/vnd.google-apps.folder' }) })).json()).id;
  carpetas[nombre] = id; ls.set('bae.drive.carpetas', carpetas); return id;
}
async function listar(tipo, nombreCarpeta){
  const c = await carpeta(nombreCarpeta); let out = [], page = '';
  do{
    const q = encodeURIComponent(`'${c}' in parents and trashed=false and appProperties has { key='bae' and value='${tipo}' }`);
    const r = await (await api(`${API}/files?q=${q}&pageSize=1000&fields=nextPageToken,files(id,name,appProperties)${page ? '&pageToken=' + page : ''}`)).json();
    out = out.concat(r.files || []); page = r.nextPageToken || '';
  } while(page);
  return out;
}
async function bajar(id){ return (await api(`${API}/files/${id}?alt=media`)).json(); }
async function bajarBlob(id){ return (await api(`${API}/files/${id}?alt=media`)).blob(); }
async function subir({ id, name, mime, data, props, carpeta: nombreCarpeta }){
  const meta = { name, mimeType: mime, appProperties: props };
  if(!id) meta.parents = [await carpeta(nombreCarpeta)];
  const b = 'bae' + Math.random().toString(36).slice(2);
  const body = new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${mime}\r\n\r\n`, data, `\r\n--${b}--`]);
  const url = id ? `${UP}/files/${id}?uploadType=multipart&fields=id` : `${UP}/files?uploadType=multipart&fields=id`;
  const r = await api(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body });
  return (await r.json()).id;
}
async function papelera(id){
  try{ await api(`${API}/files/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) }); }
  catch(e){ if(!/404/.test(e.message)) throw e; }
}

/* Sincroniza una lista de registros { id, _mod, _dirty, _driveId } con una carpeta de Drive.
   o = { tipo, carpeta, lista(), setLista(arr), borrados(), setBorrados(arr), nombre(x) } → devuelve true si cambió algo */
async function sincronizarColeccion(o){
  let rem;
  try{ rem = await listar(o.tipo, o.carpeta); }
  catch(e){ if(/404/.test(e.message)){ delete carpetas[o.carpeta]; ls.set('bae.drive.carpetas', carpetas); rem = await listar(o.tipo, o.carpeta); } else throw e; }
  // cómo estaba cada registro al empezar: lo que se edite acá mientras sincroniza no se pisa al final
  const modIni = new Map(o.lista().map(x => [x.id, +x._mod || 0]));
  let lista = o.lista().slice(), cambio = false;
  const borr = o.borrados().slice();
  for(const id of borr){ await papelera(id); o.setBorrados(o.borrados().filter(x => x !== id)); }
  rem = rem.filter(f => !borr.includes(f.id) && !o.borrados().includes(f.id));
  for(const f of rem){
    const pid = f.appProperties && f.appProperties.id, mod = +(f.appProperties && f.appProperties.mod) || 0; if(!pid) continue;
    const i = lista.findIndex(x => x.id === pid), loc = lista[i];
    if(!loc || (!loc._dirty && (+loc._mod || 0) < mod)){
      const d = await bajar(f.id); Object.assign(d, { id: pid, _driveId: f.id, _mod: mod, _dirty: false });
      if(i >= 0) lista[i] = d; else lista.push(d); cambio = true;
    } else if(!loc._driveId) loc._driveId = f.id;
  }
  const ids = new Set(rem.map(f => f.id)), antes = lista.length;
  lista = lista.filter(x => !(x._driveId && !x._dirty && !ids.has(x._driveId)));
  if(lista.length !== antes) cambio = true;
  for(const x of lista.filter(y => y._dirty || !y._driveId)){
    const limpio = Object.assign({}, x); delete limpio._dirty; delete limpio._driveId;
    const otro = rem.find(f => f.appProperties && f.appProperties.id === x.id), modSubido = x._mod;
    x._driveId = await subir({ id: x._driveId || (otro && otro.id), name: o.nombre(x) + '.json', mime: 'application/json', carpeta: o.carpeta,
      data: JSON.stringify(limpio), props: { bae: o.tipo, id: x.id, mod: String(x._mod || Date.now()) } });
    if(x._mod === modSubido) x._dirty = false;   // si se volvió a editar mientras subía, queda pendiente para la próxima
    cambio = true;
  }
  // lo que se cargó, editó o borró en este dispositivo durante la sincronización
  const actual = o.lista(), idsAct = new Set(actual.map(x => x.id));
  lista = lista.filter(x => !modIni.has(x.id) || idsAct.has(x.id));
  for(const c of actual){
    const editado = !modIni.has(c.id) || (+c._mod || 0) > modIni.get(c.id);
    if(!editado) continue;
    const i = lista.findIndex(x => x.id === c.id);
    if(i >= 0){ if(lista[i] !== c){ if(!c._driveId) c._driveId = lista[i]._driveId; c._dirty = true; lista[i] = c; } }
    else lista.push(c);
  }
  o.setLista(lista);
  return cambio;
}

/* ---------- sincronización automática ----------
   Avisa a los módulos ("bae:sync") que traigan y suban cambios: al conectar Google, al volver a la app,
   al recuperar internet y cada minuto mientras está abierta. Si el permiso de Google venció, muestra un aviso para reconectar. */
const visible = () => document.visibilityState !== 'hidden';
function pulso(){ revisarAviso(); if(auth && tokenOk() && visible() && navigator.onLine !== false) window.dispatchEvent(new Event('bae:sync')); }
let avisoCerrado = false;
function revisarAviso(){
  let b = document.getElementById('baeDrive');
  const mostrar = auth && auth.email && !tokenOk() && navigator.onLine !== false && !avisoCerrado && !document.getElementById('baeGate');
  if(!mostrar){ if(b) b.remove(); return; }
  if(b) return;
  if(!document.getElementById('baeDriveCss')){
    const c = document.createElement('style'); c.id = 'baeDriveCss';
    c.textContent = `#baeDrive{position:fixed;left:50%;bottom:max(16px, env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9000;width:calc(100% - 32px);max-width:440px;display:flex;align-items:center;gap:10px;padding:10px 10px 10px 16px;background:var(--card,#fff);color:var(--ink,#0f2733);border:1px solid var(--accent,#0f2733);border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.18)}
      #baeDrive span{flex:1;font-size:14px}#baeDrive button:last-child{border:none;background:none;color:var(--muted,#4a5d66);padding:6px 8px}`;
    document.head.appendChild(c);
  }
  b = document.createElement('div'); b.id = 'baeDrive'; b.setAttribute('role', 'status');
  b.innerHTML = '<span>Google Drive se desconectó: los cambios no se están sincronizando.</span><button class="primary" type="button">Reconectar</button><button type="button" aria-label="Más tarde">✕</button>';
  const [ok, x] = b.querySelectorAll('button'), t = b.querySelector('span');
  ok.onclick = () => { ok.disabled = true; t.textContent = 'Conectando con Google…';
    pedirToken(false).then(() => { b.remove(); pulso(); }, e => { ok.disabled = false; t.textContent = 'No se pudo conectar: ' + e.message + '. Probá de nuevo.'; }); };
  x.onclick = () => { avisoCerrado = true; b.remove(); };
  document.body.appendChild(b);
}
oyentes.add(revisarAviso);

/* Indicador en el encabezado de todas las pantallas: al día / sincronizando / cambios sin subir / desconectado */
const LISTAS = ['bae.presu.lista', 'bae.cli.lista', 'bae.ing.lista', 'bae.inf.lista', 'bae.gas.lista'];
// cuenta los registros marcados para subir sin interpretar las listas enteras (los informes pueden pesar bastante)
const pendientes = () => LISTAS.reduce((a, k) => { let t = ''; try{ t = localStorage.getItem(k) || ''; }catch(e){} return a + (t.match(/"_dirty":true/g) || []).length; }, 0);
const hhmm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
function indicador(){
  const brand = document.querySelector('header .brand'); if(!brand) return;
  let el = document.getElementById('baeNube');
  if(!auth || !auth.email){ if(el) el.remove(); return; }
  if(!el){
    if(!document.getElementById('baeNubeCss')){
      const c = document.createElement('style'); c.id = 'baeNubeCss';
      c.textContent = `#baeNube{margin-left:auto;flex:none;display:flex;align-items:center;gap:6px;border:1px solid var(--line,#d5e0e5);background:var(--card,#fff);color:var(--muted,#4a5d66);border-radius:999px;padding:5px 10px 5px 8px;font-size:12.5px;cursor:pointer;max-width:46vw}
        #baeNube svg{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
        #baeNube span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #baeNube.ok{color:#0b7a4b;border-color:color-mix(in srgb,#0b7a4b 35%,transparent)}
        #baeNube.pend{color:#b45309;border-color:color-mix(in srgb,#b45309 40%,transparent)}
        #baeNube.mal{color:#b42318;border-color:color-mix(in srgb,#b42318 40%,transparent)}
        #baeNube.gira svg{animation:baeGira 1.2s linear infinite}@keyframes baeGira{to{transform:rotate(360deg)}}`;
      document.head.appendChild(c);
    }
    el = document.createElement('button'); el.type = 'button'; el.id = 'baeNube';
    el.onclick = () => { if(!tokenOk()) pedirToken(false).then(pulso, () => {}); else pulso(); };
    brand.appendChild(el);
  }
  const p = pendientes(), NUBE = '<path d="M7.5 19h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.6 9.6 4.75 4.75 0 0 0 7.5 19z"/>';
  let cls, txt, ico = NUBE, tit;
  if(navigator.onLine === false){ cls = p ? 'pend' : ''; txt = p ? `Sin internet · ${p} sin subir` : 'Sin internet'; tit = 'Se sube a Drive cuando vuelva la conexión.'; }
  else if(!tokenOk()){ cls = 'mal'; txt = p ? `Desconectado · ${p} sin subir` : 'Drive desconectado'; tit = 'Tocá para reconectar Google Drive.'; }
  else if(enCurso > 0){ cls = 'gira'; txt = 'Sincronizando…'; ico = '<path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5"/>'; tit = 'Trayendo y subiendo cambios.'; }
  else if(ultErr){ cls = 'mal'; txt = 'Error al sincronizar'; tit = ultErr + '. Tocá para reintentar.'; }
  else if(p){ cls = 'pend'; txt = `${p} sin subir`; tit = 'Tocá para sincronizar ahora.'; }
  else { cls = 'ok'; txt = ultOk ? 'Al día · ' + hhmm(ultOk) : 'Drive conectado'; tit = 'Todo sincronizado con Google Drive. Tocá para sincronizar ahora.'; }
  el.className = cls; el.title = tit; el.setAttribute('aria-label', txt + '. ' + tit);
  el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ico}</svg><span>${txt}</span>`;
}
oyentes.add(indicador);
window.addEventListener('storage', indicador);
setInterval(indicador, 5e3);
document.addEventListener('visibilitychange', () => { if(visible()){ avisoCerrado = false; pulso(); } });
window.addEventListener('online', pulso);
window.addEventListener('offline', () => { revisarAviso(); indicador(); });
setInterval(pulso, 60e3);

/* ---------- selector de archivos de Drive (propio, sin Google Picker: funciona en Brave y no abre ventanas) ---------- */
const CARP = 'application/vnd.google-apps.folder';
const fmtTam = n => !n ? '' : n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1).replace('.', ',') + ' MB';
const fmtFecha = d => { try{ return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }catch(e){ return ''; } };
const escH = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let cssSel = false;
function estilosSel(){
  if(cssSel) return; cssSel = true;
  const c = document.createElement('style');
  c.textContent = `.dsel{position:fixed;inset:0;z-index:9998;background:rgba(10,22,28,.55);display:grid;place-items:center;padding:16px}
  .dsel .box{background:var(--card,#fff);color:var(--ink,#0f2733);width:min(640px,100%);max-height:min(720px,100%);display:flex;flex-direction:column;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}
  .dsel header{display:flex;align-items:center;gap:10px;padding:14px 16px 8px}
  .dsel header b{flex:1;font-size:16px}
  .dsel .x{border:0;background:none;font-size:22px;line-height:1;padding:4px 8px;cursor:pointer;color:inherit}
  .dsel .tabs2{display:flex;gap:6px;padding:0 16px 8px;flex-wrap:wrap}
  .dsel .tabs2 button{border:1px solid var(--line,#d5e0e5);background:none;border-radius:999px;padding:6px 12px;font-size:13.5px;cursor:pointer;color:inherit}
  .dsel .tabs2 button.on{background:var(--accent,#0f2733);color:var(--accent-ink,#fff);border-color:var(--accent,#0f2733)}
  .dsel .bus{padding:0 16px 8px}.dsel .bus input{width:100%;margin:0}
  .dsel .ruta{padding:2px 16px 8px;font-size:13px;color:var(--muted,#4a5d66);display:flex;flex-wrap:wrap;gap:4px}
  .dsel .ruta a{color:inherit;cursor:pointer;text-decoration:underline}
  .dsel ul{list-style:none;margin:0;padding:0 8px;overflow:auto;flex:1;min-height:160px;border-top:1px solid var(--line,#d5e0e5);border-bottom:1px solid var(--line,#d5e0e5)}
  .dsel li{display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer}
  .dsel li:hover{background:var(--neutral-bg,#e4ecf0)}
  .dsel li.sel{background:color-mix(in srgb,var(--accent,#0f2733) 14%,transparent)}
  .dsel li .ico{width:34px;height:34px;flex:none;border-radius:8px;display:grid;place-items:center;font-size:18px;background:var(--neutral-bg,#e4ecf0);overflow:hidden}
  .dsel li .ico img{width:100%;height:100%;object-fit:cover}
  .dsel li .nm{flex:1;min-width:0}.dsel li .nm b{display:block;font-weight:600;font-size:14.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dsel li .nm span{font-size:12.5px;color:var(--muted,#4a5d66)}
  .dsel li input{width:20px;height:20px;margin:0;flex:none}
  .dsel .vacio{padding:24px 12px;text-align:center;color:var(--muted,#4a5d66);list-style:none}
  .dsel footer{display:flex;gap:10px;align-items:center;padding:12px 16px}
  .dsel footer span{flex:1;font-size:13.5px;color:var(--muted,#4a5d66)}
  @media (max-width:560px){ .dsel{padding:0} .dsel .box{border-radius:0;height:100%;max-height:none} }`;
  document.head.appendChild(c);
}
/* Abre el selector y devuelve [{ name, id, type, arrayBuffer() }] de los archivos elegidos. Llamar desde un toque del usuario. */
function elegirArchivos({ mimes = 'text/plain', titulo = 'Elegí los archivos' } = {}){
  const tokenP = pedirToken(false, LECTURA);   // primero, dentro del toque, para que no se bloquee la ventana de permisos
  const tipos = mimes.split(',').map(x => x.trim()).filter(Boolean);
  const quiereTxt = tipos.some(t => /text|octet/.test(t)), quiereImg = tipos.some(t => /^image\//.test(t));
  const sirve = f => f.mimeType === CARP || (quiereImg && /^image\//.test(f.mimeType)) || (quiereTxt && (/^text\//.test(f.mimeType) || /\.txt$/i.test(f.name)));
  return tokenP.then(() => new Promise(ok => {
    estilosSel();
    const scrollY = window.scrollY;
    const el = document.createElement('div'); el.className = 'dsel';
    el.innerHTML = `<div class="box" role="dialog" aria-label="${escH(titulo)}">
      <header><b>${escH(titulo)}</b><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></header>
      <div class="tabs2"><button data-v="raiz" class="on">Mi unidad</button><button data-v="rec">Recientes</button><button data-v="comp">Compartidos conmigo</button></div>
      <div class="bus"><input type="search" placeholder="Buscar en Drive por nombre"></div>
      <div class="ruta"></div><ul></ul>
      <footer><span>Tocá para marcar.</span><button data-a="cerrar">Cancelar</button><button class="primary" data-a="ok" disabled>Cargar</button></footer></div>`;
    document.body.appendChild(el); document.documentElement.style.overflow = 'hidden';
    const ul = el.querySelector('ul'), ruta = el.querySelector('.ruta'), bOk = el.querySelector('[data-a="ok"]'), inp = el.querySelector('input');
    const elegidos = new Map(); let pila = [{ id: 'root', name: 'Mi unidad' }], modo = 'raiz', pedido = 0;
    const cerrar = res => { el.remove(); document.documentElement.style.overflow = ''; window.scrollTo(0, scrollY); ok(res); };
    const actualizarBoton = () => { const n = elegidos.size; bOk.disabled = !n; bOk.textContent = n ? `Cargar ${n} archivo${n > 1 ? 's' : ''}` : 'Cargar'; };
    async function cargarLista(){
      const yo = ++pedido; ul.innerHTML = '<li class="vacio">Cargando…</li>';
      const txt = inp.value.trim().replace(/['\\]/g, '');
      let q = 'trashed=false', orden = 'folder,name';
      if(txt){ q += ` and name contains '${txt}'`; orden = 'modifiedTime desc'; }
      else if(modo === 'rec'){ q += ` and mimeType!='${CARP}'`; orden = 'modifiedTime desc'; }
      else if(modo === 'comp'){ q += ' and sharedWithMe'; orden = 'modifiedTime desc'; }
      else q += ` and '${pila[pila.length - 1].id}' in parents`;
      ruta.innerHTML = txt ? `Resultados para “${escH(txt)}”` : modo === 'raiz' ? pila.map((c, i) => i < pila.length - 1 ? `<a data-i="${i}">${escH(c.name)}</a> ›` : `<b>${escH(c.name)}</b>`).join(' ') : modo === 'rec' ? 'Archivos modificados últimamente' : 'Archivos que otros compartieron con vos';
      try{
        const url = `${API}/files?q=${encodeURIComponent(q)}&orderBy=${encodeURIComponent(orden)}&pageSize=200&fields=${encodeURIComponent('files(id,name,mimeType,size,modifiedTime,thumbnailLink)')}&supportsAllDrives=true&includeItemsFromAllDrives=true`;
        const r = await (await api(url)).json(); if(yo !== pedido) return;
        const fs = (r.files || []).filter(sirve);
        ul.innerHTML = fs.length ? fs.map(f => { const dir = f.mimeType === CARP, img = /^image\//.test(f.mimeType);
          return `<li data-id="${escH(f.id)}" data-dir="${dir ? 1 : ''}" class="${elegidos.has(f.id) ? 'sel' : ''}"><div class="ico">${dir ? '📁' : img && f.thumbnailLink ? `<img src="${escH(f.thumbnailLink)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith('🖼️')">` : img ? '🖼️' : '📄'}</div>
          <div class="nm"><b>${escH(f.name)}</b><span>${dir ? 'Carpeta' : [fmtTam(+f.size), fmtFecha(f.modifiedTime)].filter(Boolean).join(' · ')}</span></div>${dir ? '<span aria-hidden="true">›</span>' : `<input type="checkbox" tabindex="-1" ${elegidos.has(f.id) ? 'checked' : ''}>`}</li>`; }).join('')
          : `<li class="vacio">${txt ? 'No encontré archivos con ese nombre.' : 'No hay archivos que se puedan cargar acá.'}</li>`;
        fs.forEach(f => { if(f.mimeType !== CARP) mapa[f.id] = f; });
      }catch(e){ if(yo === pedido) ul.innerHTML = `<li class="vacio">No se pudo leer Drive: ${escH(e.message)}.</li>`; }
    }
    const mapa = {};
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if(a){ if(a.dataset.a === 'cerrar') return cerrar([]);
        const docs = [...elegidos.values()].map(f => ({ name: f.name, id: f.id, type: f.mimeType, arrayBuffer: async () => (await api(`${API}/files/${f.id}?alt=media&supportsAllDrives=true`)).arrayBuffer() }));
        return cerrar(docs); }
      const t = e.target.closest('.tabs2 button'); if(t){ el.querySelectorAll('.tabs2 button').forEach(b => b.classList.toggle('on', b === t)); modo = t.dataset.v; inp.value = ''; if(modo === 'raiz') pila = [pila[0]]; return cargarLista(); }
      const r = e.target.closest('.ruta a'); if(r){ pila = pila.slice(0, +r.dataset.i + 1); return cargarLista(); }
      const li = e.target.closest('li[data-id]'); if(!li) return;
      if(li.dataset.dir){ inp.value = ''; modo = 'raiz'; el.querySelectorAll('.tabs2 button').forEach(b => b.classList.toggle('on', b.dataset.v === 'raiz')); pila.push({ id: li.dataset.id, name: li.querySelector('b').textContent }); return cargarLista(); }
      const f = mapa[li.dataset.id]; if(!f) return;
      if(elegidos.has(f.id)) elegidos.delete(f.id); else elegidos.set(f.id, f);
      li.classList.toggle('sel', elegidos.has(f.id)); const cb = li.querySelector('input'); if(cb) cb.checked = elegidos.has(f.id); actualizarBoton();
    });
    el.addEventListener('mousedown', e => { if(e.target === el) cerrar([]); });
    let tmo; inp.addEventListener('input', () => { clearTimeout(tmo); tmo = setTimeout(cargarLista, 350); });
    document.addEventListener('keydown', function esc(e){ if(e.key === 'Escape' && document.body.contains(el)){ document.removeEventListener('keydown', esc); cerrar([]); } });
    cargarLista();
  }));
}

window.__nube = {
  get email(){ return auth && auth.email; }, get conectado(){ return tokenOk(); },
  pedirToken, salir, carpeta, listar, bajar, bajarBlob, subir, papelera, onCambio: f => oyentes.add(f),
  olvidarCarpeta(nombre = CARPETA){ delete carpetas[nombre]; ls.set('bae.drive.carpetas', carpetas); ls.del('bae.drive.carpeta'); },
  sincronizarColeccion, elegirArchivos, precargarPicker: () => {}
};
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pantallaIngreso); else pantallaIngreso();
if(auth){ cargarGsi().catch(() => {}); setTimeout(revisarAviso, 1500); }
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(indicador, 0)); else setTimeout(indicador, 0);
})();
