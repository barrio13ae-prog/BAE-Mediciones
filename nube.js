/* Ingreso con Google (solo cuentas del dominio) y acceso a Google Drive — BAE Servicios de Instalaciones */
(function(){
'use strict';
const CLIENT_ID = '1016468287608-ec3tv211ih3bicr7eb1sqj6okh947rqt.apps.googleusercontent.com';
const DOMINIO = 'baeinstalaciones.com.ar';
const API_KEY = 'AIzaSyCFrDSTSzB5qXqjJ8fILeTLTj3C4xjxraU';   // solo Google Picker, restringida a los sitios de la app
const APP_ID = '1016468287608';                              // número del proyecto de Google Cloud
const SCOPES = 'openid email https://www.googleapis.com/auth/drive.file';
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
let tok = ss.get('bae.tok');                  // { t: access_token, exp: ms }
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
      if(r && r.access_token){ tok = { t: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 }; ss.set('bae.tok', tok); cola.forEach(c => c.ok(tok.t)); }
      else cola.forEach(c => c.mal(new Error(r && r.error || 'no autorizado')));
      avisar();
    },
    error_callback: e => { const cola = esperando; esperando = []; cola.forEach(c => c.mal(new Error(e && e.type === 'popup_closed' ? 'cerraste la ventana de Google' : 'no se pudo abrir la ventana de Google'))); avisar(); }
  });
  return client;
}
/* Pide un token. Debe llamarse desde un toque del usuario (si no, el navegador bloquea la ventana). */
function pedirToken(elegirCuenta){
  if(tokenOk()) return Promise.resolve(tok.t);
  if(!(window.google && google.accounts && google.accounts.oauth2)) return cargarGsi().then(() => Promise.reject(new Error('Google recién terminó de cargar: tocá de nuevo')));
  return new Promise((ok, mal) => { esperando.push({ ok, mal }); cliente().requestAccessToken({ prompt: elegirCuenta ? 'select_account' : '' }); });
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
  tok = null; ss.del('bae.tok'); auth = null; ls.del('bae.auth'); client = null; avisar();
}

/* ---------- Google Drive ---------- */
async function api(url, opt = {}, reintento){
  if(!tokenOk()) throw Object.assign(new Error('hay que reconectar Google Drive'), { code: 'TOKEN' });
  const r = await fetch(url, Object.assign({}, opt, { headers: Object.assign({ Authorization: 'Bearer ' + tok.t }, opt.headers || {}) }));
  if(r.status === 401){ tok = null; ss.del('bae.tok'); avisar(); throw Object.assign(new Error('hay que reconectar Google Drive'), { code: 'TOKEN' }); }
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
  let lista = o.lista().slice(), borr = o.borrados().slice(), cambio = false;
  for(const id of borr.slice()){ await papelera(id); borr = borr.filter(x => x !== id); o.setBorrados(borr); }
  rem = rem.filter(f => !borr.includes(f.id));
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
    const otro = rem.find(f => f.appProperties && f.appProperties.id === x.id);
    x._driveId = await subir({ id: x._driveId || (otro && otro.id), name: o.nombre(x) + '.json', mime: 'application/json', carpeta: o.carpeta,
      data: JSON.stringify(limpio), props: { bae: o.tipo, id: x.id, mod: String(x._mod || Date.now()) } });
    x._dirty = false; cambio = true;
  }
  o.setLista(lista);
  return cambio;
}

/* ---------- selector de archivos de Drive (Google Picker) ---------- */
let pickerPromesa = null;
function cargarPicker(){
  if(window.google && google.picker) return Promise.resolve();
  if(pickerPromesa) return pickerPromesa;
  pickerPromesa = new Promise((ok, mal) => {
    const fin = () => gapi.load('picker', { callback: ok, onerror: () => { pickerPromesa = null; mal(new Error('no cargó el selector de Google')); } });
    if(window.gapi && gapi.load) return fin();
    const s = document.createElement('script'); s.src = 'https://apis.google.com/js/api.js'; s.async = true;
    s.onload = fin; s.onerror = () => { pickerPromesa = null; mal(new Error('sin conexión con Google')); };
    document.head.appendChild(s);
  });
  return pickerPromesa;
}
/* Abre el selector y devuelve [{ name, arrayBuffer() }] de los archivos elegidos. Llamar desde un toque del usuario. */
function elegirArchivos({ mimes = 'text/plain', titulo = 'Elegí los archivos' } = {}){
  const tokenP = pedirToken(false);            // primero, dentro del toque, para que no se bloquee la ventana
  return Promise.all([tokenP, cargarPicker()]).then(([t]) => new Promise((ok, mal) => {
    const P = google.picker;
    const vista = new P.DocsView(P.ViewId.DOCS).setMimeTypes(mimes).setIncludeFolders(true).setSelectFolderEnabled(false).setMode(P.DocsViewMode.LIST);
    const recientes = new P.DocsView(P.ViewId.RECENTLY_PICKED);
    new P.PickerBuilder().setTitle(titulo).setLocale('es').addView(vista).addView(recientes)
      .enableFeature(P.Feature.MULTISELECT_ENABLED).setOAuthToken(t).setDeveloperKey(API_KEY).setAppId(APP_ID)
      .setCallback(d => {
        const acc = d[P.Response.ACTION];
        if(acc === P.Action.CANCEL) return ok([]);
        if(acc !== P.Action.PICKED) return;
        ok((d[P.Response.DOCUMENTS] || []).map(doc => ({ name: doc[P.Document.NAME], id: doc[P.Document.ID],
          arrayBuffer: async () => (await api(`${API}/files/${doc[P.Document.ID]}?alt=media`)).arrayBuffer() })));
      }).build().setVisible(true);
  }));
}

window.__nube = {
  get email(){ return auth && auth.email; }, get conectado(){ return tokenOk(); },
  pedirToken, salir, carpeta, listar, bajar, bajarBlob, subir, papelera, onCambio: f => oyentes.add(f),
  olvidarCarpeta(nombre = CARPETA){ delete carpetas[nombre]; ls.set('bae.drive.carpetas', carpetas); ls.del('bae.drive.carpeta'); },
  sincronizarColeccion, elegirArchivos, precargarPicker: () => cargarPicker().catch(() => {})
};
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pantallaIngreso); else pantallaIngreso();
if(auth) cargarGsi().catch(() => {});
})();
