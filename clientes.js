/* Agenda de clientes, vencimientos de protocolos SRT y resumen del mes — BAE Servicios de Instalaciones */
(function(){
'use strict';
const APP = window.__app, N = window.__nube; if(!APP) return;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store = { get(k, d){ try{ const x = localStorage.getItem(k); return x ? JSON.parse(x) : d; }catch(e){ return d; } },
                set(k, x){ try{ localStorage.setItem(k, JSON.stringify(x)); }catch(e){} } };
const p2 = n => String(n).padStart(2, '0');
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`; };
const fmtD = iso => { const p = String(iso || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : (iso || ''); };
const clave = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const money = n => Math.round(n || 0).toLocaleString('es-AR');
const num = v => { const n = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const AVISO_DIAS = 45;
const CARPETA = 'BAE Clientes';
const pf = () => (typeof window.__perfil === 'function' ? window.__perfil() : {});

let lista = store.get('bae.cli.lista', []);
let borrados = store.get('bae.cli.borrados', []);
const guardarLista = () => { store.set('bae.cli.lista', lista); actualizarDatalist(); };

/* ---------- datos ---------- */
const venceSrt = c => { if(!c.srt) return null; const d = new Date(c.srt + 'T12:00:00'); d.setFullYear(d.getFullYear() + 1); return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`; };
const diasA = iso => Math.ceil((new Date(iso + 'T12:00:00') - new Date(hoyISO() + 'T12:00:00')) / 864e5);
function estadoSrt(c){
  const v = venceSrt(c); if(!v) return { cls: 'na', txt: 'Sin protocolo SRT' };
  const d = diasA(v);
  if(d < 0) return { cls: 'bad', txt: `SRT vencido hace ${-d} día${d === -1 ? '' : 's'}`, d, v };
  if(d <= AVISO_DIAS) return { cls: 'warn', txt: `SRT vence en ${d} día${d === 1 ? '' : 's'}`, d, v };
  return { cls: 'ok', txt: `SRT al día · vence ${fmtD(v)}`, d, v };
}
function upsert(det, srtFecha){
  const nombre = String(det.nombre || '').trim(); if(!nombre) return null;
  let c = lista.find(x => clave(x.nombre) === clave(nombre)); let cambio = false;
  if(!c){ c = { id: 'c' + Date.now() + Math.random().toString(36).slice(2, 5), nombre }; lista.push(c); cambio = true; }
  ['cuit', 'telefono', 'email', 'direccion', 'localidad'].forEach(k => { const v = String(det[k] || '').trim(); if(v && !c[k]){ c[k] = v; cambio = true; } });
  if(srtFecha && (!c.srt || srtFecha > c.srt)){ c.srt = srtFecha; cambio = true; }
  if(cambio){ c._mod = Date.now(); c._dirty = true; guardarLista(); sincronizar(false); }
  return c;
}
window.addEventListener('bae:cliente', e => { upsert(e.detail || {}); if(location.hash === '#clientes') renderLista(); });
window.addEventListener('bae:srt', e => { const d = e.detail || {}; upsert(d, d.fecha || hoyISO()); renderVencimientos(); });

/* ---------- WhatsApp ---------- */
function waNum(tel){
  let d = String(tel || '').replace(/\D/g, ''); if(!d) return '';
  d = d.replace(/^0+/, ''); if(d.startsWith('54')) d = d.slice(2); if(!d.startsWith('9')) d = '9' + d;
  return '54' + d;
}
const waLink = (tel, texto) => 'https://wa.me/' + waNum(tel) + '?text=' + encodeURIComponent(texto);
function textoSrt(c){
  const st = estadoSrt(c), nom = String(c.nombre || '').trim(), yo = (pf().nombre || '').split(' ')[0];
  const cuando = st.cls === 'bad' ? `venció el ${fmtD(st.v)}` : `vence el ${fmtD(st.v)}`;
  return `Hola${nom ? ' ' + nom : ''}, ¿cómo estás? Te escribe ${yo} de ${pf().empresa || 'BAE Servicios de Instalaciones'}. Te recuerdo que el protocolo de medición de puesta a tierra (Res. SRT 900/15)${c.direccion ? ' de ' + c.direccion : ''} ${cuando}. Es una medición anual obligatoria. ¿Coordinamos una visita para renovarlo?`;
}

/* ---------- datalist en informe, presupuesto y SRT ---------- */
const dl = document.createElement('datalist'); dl.id = 'dlClientes'; document.body.appendChild(dl);
function actualizarDatalist(){ dl.innerHTML = lista.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(c => `<option value="${esc(c.nombre)}">${esc([c.direccion, c.cuit].filter(Boolean).join(' · '))}</option>`).join(''); }
const CAMPOS = '#view-presu [data-p="cliente"], #reportForm [data-k="empresa"], #view-srt [data-p="est.razon"]';
document.addEventListener('focusin', e => { if(e.target.matches && e.target.matches(CAMPOS)) e.target.setAttribute('list', 'dlClientes'); });
const poner = (sel, v) => { const el = $(sel); if(el && v && el.value !== v){ el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
document.addEventListener('change', e => {
  const t = e.target; if(!(t.matches && t.matches(CAMPOS))) return;
  const c = lista.find(x => clave(x.nombre) === clave(t.value)); if(!c) return;
  if(t.matches('#view-presu [data-p="cliente"]')){ poner('#view-presu [data-p="telCliente"]', c.telefono); poner('#view-presu [data-p="direccion"]', [c.direccion, c.localidad].filter(Boolean).join(', ')); }
  else if(t.matches('#reportForm [data-k="empresa"]')){ poner('#reportForm [data-k="cuit"]', c.cuit); poner('#reportForm [data-k="direccion"]', [c.direccion, c.localidad].filter(Boolean).join(', ')); }
  else if(window.__srt) window.__srt.cargarCliente(c);
});

/* ---------- estilos compartidos ---------- */
const css = document.createElement('style');
css.textContent = `
  .cl-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
  .cl-top h2{margin:0}
  .cl-top button{padding:8px 14px}
  .cl-list{display:grid;gap:8px;margin-top:8px}
  .cl-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px 10px 14px;border:1px solid var(--line);border-radius:12px;cursor:pointer;transition:border-color .15s}
  .cl-row:hover{border-color:var(--accent)}
  .cl-row .info{display:grid;gap:2px;min-width:0}
  .cl-row .info b{font-size:14.5px}
  .cl-row .info span{font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cl-chip{display:inline-block;font-style:normal;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--neutral-bg);color:var(--muted)}
  .cl-chip.ok{background:color-mix(in srgb,#0b7a4b 14%,var(--card));color:#0b7a4b}
  .cl-chip.warn{background:#fde68a;color:#7c4a03}
  .cl-chip.bad{background:#fee2e2;color:#991b1b}
  .cl-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  .cl-acts a,.cl-acts button{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);text-decoration:none;font-weight:600;font-size:14px}
  .cl-acts .wa{border-color:#25d366;color:#128c4b}
  .cl-hist{display:grid;gap:6px;margin-top:8px}
  .cl-hist a{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:8px;background:var(--neutral-bg);color:var(--ink);text-decoration:none;font-size:13px}
  .cl-hist a span{color:var(--muted)}
  .cl-hint{font-size:12.5px;color:var(--muted);margin:6px 0}
  .cl-nube{font-size:12.5px;color:var(--muted);display:flex;align-items:center;gap:8px;margin:0 0 8px}
  .cl-nube button{padding:4px 10px;font-size:12.5px}
  #vencCard{border-color:#f5c26b}
  #vencCard h2{margin:0 0 4px}
  .venc{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid var(--line)}
  .venc:first-of-type{border-top:none}
  .venc .info{display:grid;gap:2px;min-width:0}
  .venc .info span{font-size:12.5px;color:var(--muted)}
  .venc a.wa{flex-shrink:0;padding:8px 12px;border-radius:8px;background:#25d366;color:#fff;text-decoration:none;font-weight:600;font-size:13.5px}
  .rs-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
  .rs-nav b{font-size:18px;text-transform:capitalize}
  .rs-nav button{width:40px;height:40px;padding:0;border-radius:50%;font-size:18px}
  .rs-kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
  @media (min-width:700px){.rs-kpis{grid-template-columns:repeat(3,1fr)}}
  .rs-kpi{padding:12px 14px;border-radius:12px;background:var(--neutral-bg);display:grid;gap:2px}
  .rs-kpi span{font-size:12.5px;color:var(--muted)}
  .rs-kpi b{font-size:20px}
  .rs-kpi small{font-size:12px;color:var(--muted)}
  .rs-kpi.acc{background:var(--accent);color:var(--accent-ink)}
  .rs-kpi.acc span,.rs-kpi.acc small{color:inherit;opacity:.85}
  .rs-bars{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;align-items:end;height:150px;margin-top:6px}
  .rs-bar{display:grid;gap:4px;justify-items:center;align-content:end;height:100%}
  .rs-bar .pair{display:flex;gap:3px;align-items:end;height:120px;width:100%;justify-content:center}
  .rs-bar i{display:block;width:40%;max-width:18px;border-radius:4px 4px 0 0;background:color-mix(in srgb,var(--accent) 35%,var(--card))}
  .rs-bar i.c{background:var(--accent)}
  .rs-bar small{font-size:11px;color:var(--muted);text-transform:capitalize}
  .rs-ley{display:flex;gap:14px;font-size:12px;color:var(--muted);margin-top:8px}
  .rs-ley i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px;background:color-mix(in srgb,var(--accent) 35%,var(--card))}
  .rs-ley i.c{background:var(--accent)}
  .rs-rubros{display:grid;gap:8px}
  .rs-rubro{display:grid;grid-template-columns:minmax(90px,140px) 1fr auto 38px;gap:10px;align-items:center;font-size:13.5px}
  .rs-rubro .barra{height:10px;border-radius:5px;background:var(--neutral-bg);overflow:hidden}
  .rs-rubro .barra i{display:block;height:100%;border-radius:5px;background:var(--accent)}
  .rs-rubro small{color:var(--muted);text-align:right}
  .rs-ing-form{display:grid;gap:10px;padding:12px;margin-bottom:10px;border:1px solid var(--line);border-radius:12px;background:var(--neutral-bg)}
  .rs-ops{display:flex;flex-wrap:wrap;gap:6px;margin-top:-4px}
  .rs-ops label{padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);font-size:13.5px;cursor:pointer}
  .rs-ops label.on{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
  .rs-ops input{display:none}
  .rs-pend small{color:var(--muted);font-size:12px}
  .rs-pend{display:grid;gap:6px;margin-top:8px}
  .rs-pend a{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border-radius:8px;background:var(--neutral-bg);color:var(--ink);text-decoration:none;font-size:13.5px}`;
document.head.appendChild(css);

/* ================= AGENDA ================= */
const vCli = document.createElement('div'); vCli.className = 'view'; vCli.id = 'view-clientes'; vCli.hidden = true; APP.main.appendChild(vCli);
APP.VIEWS.clientes = { el: vCli, title: 'Clientes', sub: 'Tus clientes, sus datos y los vencimientos de sus protocolos.' };
let editando = null, sinc = '';
function filaCli(c){
  const st = estadoSrt(c);
  return `<div class="cl-row" data-cli="${c.id}" data-q="${esc(clave([c.nombre, c.direccion, c.localidad, c.cuit, c.telefono].join(' ')))}" role="button" tabindex="0">
    <div class="info"><b>${esc(c.nombre)}</b>${c.direccion || c.localidad ? `<span>${esc([c.direccion, c.localidad].filter(Boolean).join(', '))}</span>` : ''}
    <span>${c.telefono ? esc(c.telefono) + ' · ' : ''}<i class="cl-chip ${st.cls}">${esc(st.txt)}</i></span></div><span style="color:var(--muted)">›</span></div>`;
}
function historial(c){
  const k = clave(c.nombre), out = [];
  const pres = (window.__presu && window.__presu.lista || []).filter(x => clave(x.cliente) === k);
  pres.forEach(x => out.push({ f: x.fecha, html: `<a href="#presu" data-hp="${x.id}"><b>Presupuesto N° ${esc(x.numero)}</b><span>${fmtD(x.fecha)} · $ ${money(x._total)}</span></a>` }));
  const infs = (window.__informes && window.__informes.lista || []).filter(x => clave((x.report || {}).empresa) === k);
  infs.forEach(x => out.push({ f: (x.report || {}).fecha, html: `<a href="#informe" data-hi="${x.id}"><b>Informe ${esc((x.report || {}).obra || '')}</b><span>${fmtD((x.report || {}).fecha)}</span></a>` }));
  return out.sort((a, b) => String(b.f || '').localeCompare(String(a.f || ''))).map(x => x.html).join('');
}
function editorHTML(c){
  const st = estadoSrt(c), f = (k, l, extra = '') => `<label>${l}<input data-c="${k}" value="${esc(c[k] || '')}" ${extra}></label>`;
  const h = historial(c);
  return `<section class="card"><div class="cl-top"><h2>${c.nombre ? esc(c.nombre) : 'Cliente nuevo'}</h2><button id="clCerrar">✕</button></div>
    <div class="grid">${f('nombre', 'Nombre o razón social')}${f('cuit', 'CUIT', 'inputmode="numeric" placeholder="ej. 30-12345678-9"')}${f('telefono', 'Teléfono / WhatsApp', 'inputmode="tel" placeholder="ej. 2942 626704"')}${f('email', 'Email', 'inputmode="email"')}${f('direccion', 'Dirección')}${f('localidad', 'Localidad', 'placeholder="ej. Zapala"')}
      <label>Último protocolo SRT 900/15<input type="date" data-c="srt" value="${esc(c.srt || '')}"></label></div>
    <p class="cl-hint">${esc(st.txt)}${st.v ? '' : ' · Se completa solo cuando descargás un protocolo SRT para este cliente.'}</p>
    <label style="margin-top:6px">Notas<textarea data-c="notas" style="min-height:60px;font-family:inherit">${esc(c.notas || '')}</textarea></label>
    <div class="cl-acts">
      ${c.telefono ? `<a class="wa" href="${waLink(c.telefono, 'Hola ' + String(c.nombre || '').trim() + ', ¿cómo estás?')}" target="_blank" rel="noopener">WhatsApp</a><a href="tel:${esc(String(c.telefono).replace(/[^\d+]/g, ''))}">Llamar</a>` : ''}
      ${st.v && st.cls !== 'ok' && c.telefono ? `<a class="wa" href="${waLink(c.telefono, textoSrt(c))}" target="_blank" rel="noopener">Ofrecer renovación SRT</a>` : ''}
      <button id="clPresu">+ Presupuesto</button><button id="clInf">+ Informe</button><button id="clSrt">+ Protocolo SRT</button><button id="clGas">+ Proyecto de gas</button>
    </div>
    ${h ? `<h3 class="sub" style="margin:16px 0 4px">Historial</h3><div class="cl-hist">${h}</div>` : ''}
    <div class="row" style="margin-top:16px"><button class="primary" id="clGuardar">Guardar</button>${lista.some(x => x.id === c.id) ? '<button id="clBorrar">Borrar cliente</button>' : ''}</div>
    <div class="msg" id="clMsg"></div></section>`;
}
function renderLista(){
  const orden = lista.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
  const nube = N && N.email ? `<p class="cl-nube">☁ ${esc(sinc || (store.get('bae.cli.ult', 0) ? 'Drive al día' : 'Sin sincronizar'))} <button id="clSync">↻</button></p>` : '';
  vCli.innerHTML = (editando ? editorHTML(editando) : '') + `<section class="card"><div class="cl-top"><h2>Mis clientes</h2><button class="primary" id="clNuevo">+ Nuevo</button></div>
    ${nube}${lista.length ? `<input id="clBuscar" type="search" placeholder="Buscar cliente…" style="margin:0"><p class="cl-hint" id="clCuenta">${lista.length} cliente${lista.length === 1 ? '' : 's'}</p>` : '<p class="cl-hint">Los clientes se agregan solos cuando guardás un presupuesto, un informe o un protocolo SRT. También podés cargarlos acá.</p>'}
    <div class="cl-list">${orden.map(filaCli).join('')}</div></section>`;
  $('#clNuevo', vCli).onclick = () => { editando = { id: 'c' + Date.now(), nombre: '' }; renderLista(); window.scrollTo(0, 0); $('[data-c="nombre"]', vCli).focus(); };
  const sb = $('#clSync', vCli); if(sb) sb.onclick = () => sincronizar(true);
  const b = $('#clBuscar', vCli); if(b) b.oninput = () => { const q = clave(b.value); let n = 0; $$('.cl-row', vCli).forEach(r => { const ok = !q || q.split(' ').every(w => r.dataset.q.includes(w)); r.hidden = !ok; if(ok) n++; }); $('#clCuenta', vCli).textContent = q ? `${n} de ${lista.length}` : `${lista.length} cliente${lista.length === 1 ? '' : 's'}`; };
  $$('.cl-row', vCli).forEach(r => { const ir = () => { editando = JSON.parse(JSON.stringify(lista.find(x => x.id === r.dataset.cli))); renderLista(); window.scrollTo(0, 0); }; r.onclick = ir; r.onkeydown = e => { if(e.key === 'Enter') ir(); }; });
  if(editando) bindEditor();
}
function bindEditor(){
  $$('[data-c]', vCli).forEach(el => el.addEventListener('input', () => { editando[el.dataset.c] = el.value; }));
  $('#clCerrar', vCli).onclick = () => { editando = null; renderLista(); };
  const guardarCli = () => {
    if(!String(editando.nombre || '').trim()){ const m = $('#clMsg', vCli); m.textContent = 'Poné el nombre del cliente.'; m.classList.add('err'); return false; }
    const i = lista.findIndex(x => x.id === editando.id), rec = Object.assign({}, editando, { _mod: Date.now(), _dirty: true });
    if(i >= 0){ rec._driveId = lista[i]._driveId; lista[i] = rec; } else lista.push(rec);
    guardarLista(); sincronizar(true); renderVencimientos(); return rec;
  };
  $('#clGuardar', vCli).onclick = () => { if(guardarCli()){ editando = null; renderLista(); } };
  const bb = $('#clBorrar', vCli); if(bb) bb.onclick = () => {
    if(bb.dataset.ok !== '1'){ bb.dataset.ok = '1'; bb.textContent = '¿Seguro? Tocá de nuevo'; return; }
    const c = lista.find(x => x.id === editando.id); if(c && c._driveId){ borrados.push(c._driveId); store.set('bae.cli.borrados', borrados); }
    lista = lista.filter(x => x.id !== editando.id); guardarLista(); editando = null; renderLista(); renderVencimientos(); sincronizar(true);
  };
  const ir = (fn, hash) => () => { const c = String(editando.nombre || '').trim() ? (guardarCli() || editando) : null; if(!c) return; fn(c); location.hash = hash; };
  $('#clPresu', vCli).onclick = ir(c => window.__presu && window.__presu.nuevoPara(c), '#presu');
  $('#clInf', vCli).onclick = ir(c => window.__informes && window.__informes.nuevoPara(c), '#informe');
  $('#clSrt', vCli).onclick = ir(c => window.__srt && window.__srt.cargarCliente(c), '#srt');
  { const g = $('#clGas', vCli); if(g) g.onclick = ir(c => window.__gas && window.__gas.nuevoPara(c), '#gas'); }
  $$('[data-hp]', vCli).forEach(a => a.onclick = e => { e.preventDefault(); const x = (window.__presu.lista || []).find(y => y.id === a.dataset.hp); if(x){ window.__presu.P = JSON.parse(JSON.stringify(x)); location.hash = '#presu'; } });
  $$('[data-hi]', vCli).forEach(a => a.onclick = e => { e.preventDefault(); const r = document.querySelector(`#infGuardados [data-iabrir="${a.dataset.hi}"] .info`); location.hash = '#informe'; setTimeout(() => { const r2 = document.querySelector(`#infGuardados [data-iabrir="${a.dataset.hi}"] .info`); if(r2) r2.click(); }, 80); });
}

/* ---------- Drive ---------- */
let corriendo = null, otra = false;
async function sincronizar(interactivo){
  if(!N || !N.email) return;
  if(corriendo){ otra = true; return corriendo; }
  if(!N.conectado){ if(interactivo) corriendo = N.pedirToken(false).then(() => { corriendo = null; return sincronizar(false); }, () => { corriendo = null; }); return corriendo; }
  corriendo = (async () => {
    try{
      sinc = 'Sincronizando…';
      const cambio = await N.sincronizarColeccion({ tipo: 'cli', carpeta: CARPETA,
        lista: () => lista, setLista: l => { lista = l; guardarLista(); },
        borrados: () => borrados, setBorrados: b => { borrados = b; store.set('bae.cli.borrados', borrados); },
        nombre: x => ('Cliente_' + x.nombre).replace(/[\\/:*?"<>|]+/g, '_') });
      store.set('bae.cli.ult', Date.now()); sinc = 'Drive al día';
      if(cambio){ renderVencimientos(); }
    }catch(e){ sinc = e.code === 'TOKEN' ? 'Tocá ↻ para reconectar Drive' : 'No se pudo sincronizar'; }
    finally{
      corriendo = null;
      const a = document.activeElement; if(location.hash === '#clientes' && !(a && vCli.contains(a) && /INPUT|TEXTAREA/.test(a.tagName))) renderLista();
      if(otra){ otra = false; sincronizar(false); }
    }
  })();
  return corriendo;
}

/* ================= VENCIMIENTOS EN INICIO ================= */
const vHome = APP.VIEWS.inicio.el;
const venc = document.createElement('section'); venc.className = 'card'; venc.id = 'vencCard'; venc.hidden = true;
{ const tiles = vHome.querySelector('.tiles'); if(tiles) tiles.parentNode.insertBefore(venc, tiles); else vHome.prepend(venc); }
venc.style.marginBottom = '14px';
function renderVencimientos(){
  const items = lista.map(c => ({ c, st: estadoSrt(c) })).filter(x => x.st.cls === 'bad' || x.st.cls === 'warn').sort((a, b) => a.st.d - b.st.d);
  venc.hidden = !items.length; if(!items.length){ venc.innerHTML = ''; return; }
  venc.innerHTML = `<h2>Protocolos SRT por vencer</h2><p class="cl-hint" style="margin-top:0">Ofrecé la renovación anual con un mensaje listo.</p>
    ${items.map(({ c, st }) => `<div class="venc"><div class="info"><b>${esc(c.nombre)}</b><span><i class="cl-chip ${st.cls}">${esc(st.txt)}</i> · ${fmtD(st.v)}</span></div>
      ${c.telefono ? `<a class="wa" href="${waLink(c.telefono, textoSrt(c))}" target="_blank" rel="noopener">WhatsApp</a>` : `<a class="cl-chip" href="#clientes" data-vcli="${c.id}" style="text-decoration:none">Cargar teléfono</a>`}</div>`).join('')}`;
  $$('[data-vcli]', venc).forEach(a => a.onclick = () => { editando = JSON.parse(JSON.stringify(lista.find(x => x.id === a.dataset.vcli))); });
}

/* ================= RESUMEN DEL MES ================= */
const vRes = document.createElement('div'); vRes.className = 'view'; vRes.id = 'view-resumen'; vRes.hidden = true; APP.main.appendChild(vRes);
APP.VIEWS.resumen = { el: vRes, title: 'Resumen', sub: 'Cómo viene el mes: presupuestos, ingresos y trabajos.' };
let mesSel = hoyISO().slice(0, 7);
const enMes = (iso, m) => String(iso || '').slice(0, 7) === m;
const ACEPT = ['aceptado', 'obra', 'cobrado'];

/* ---------- ingresos sin presupuesto (emergencias, trabajos sueltos) ---------- */
const RUBROS = [['elec', 'Electricidad'], ['gas', 'Gas'], ['agua', 'Agua / sanitarios'], ['otro', 'Otros (techos, pintura…)']];
const TIPOS_ING = [['emergencia', 'Emergencia'], ['suelto', 'Trabajo sin presupuesto']];
const rubroTxt = k => ({ elec: 'Electricidad', gas: 'Gas', agua: 'Agua / sanitarios', otro: 'Otros trabajos', ambas: 'Electricidad y gas' })[k] || 'Otros trabajos';
const tipoTxt = k => (TIPOS_ING.find(t => t[0] === k) || TIPOS_ING[1])[1];
let ingresos = store.get('bae.ing.lista', []), ingBorr = store.get('bae.ing.borrados', []);
const guardarIng = () => store.set('bae.ing.lista', ingresos);
let ingEdit = null, ingSinc = '';
let ingCorr = null, ingOtra = false;
const escribiendoRes = () => { const a = document.activeElement; return a && vRes.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName); };
async function sincronizarIng(interactivo){
  if(!N || !N.email) return;
  if(ingCorr){ ingOtra = true; return ingCorr; }
  if(!N.conectado){ if(interactivo) ingCorr = N.pedirToken(false).then(() => { ingCorr = null; return sincronizarIng(false); }, () => { ingCorr = null; }); return ingCorr; }
  ingCorr = (async () => {
    let cambio = false;
    try{
      cambio = await N.sincronizarColeccion({ tipo: 'ing', carpeta: 'BAE Ingresos',
        lista: () => ingresos, setLista: l => { ingresos = l; guardarIng(); },
        borrados: () => ingBorr, setBorrados: b => { ingBorr = b; store.set('bae.ing.borrados', ingBorr); },
        nombre: x => ('Ingreso_' + x.fecha + '_' + (x.cliente || rubroTxt(x.rubro))).replace(/[\\/:*?"<>|]+/g, '_') });
      ingSinc = '';
    }catch(e){ ingSinc = e.code === 'TOKEN' ? 'Drive desconectado: tocá ↻ en Clientes o Presupuestos para reconectar.' : navigator.onLine ? 'No se pudieron sincronizar los ingresos con Drive.' : 'Sin internet: los ingresos se suben a Drive cuando vuelva la conexión.'; }
    finally{
      ingCorr = null;
      if(location.hash === '#resumen' && (cambio || ingSinc) && !escribiendoRes()) renderResumen();
      if(ingOtra){ ingOtra = false; sincronizarIng(false); }
    }
  })();
  return ingCorr;
}

function datosMes(m){
  const pres = (window.__presu && window.__presu.lista) || [], infs = (window.__informes && window.__informes.lista) || [];
  const cob = x => (x.cobros || []).reduce((a, c) => a + num(c.monto), 0);
  const pm = pres.filter(x => enMes(x.fecha, m));
  // ingresos del mes por rubro: cobros de presupuestos (según su rubro) + ingresos sin presupuesto
  const porRubro = {};
  pres.forEach(x => (x.cobros || []).filter(c => enMes(c.fecha, m)).forEach(c => { const k = x.rubro || 'elec'; porRubro[k] = (porRubro[k] || 0) + num(c.monto); }));
  const im = ingresos.filter(x => enMes(x.fecha, m));
  im.forEach(x => { const k = x.rubro || 'otro'; porRubro[k] = (porRubro[k] || 0) + num(x.monto); });
  const cobPres = pres.reduce((a, x) => a + (x.cobros || []).filter(c => enMes(c.fecha, m)).reduce((s, c) => s + num(c.monto), 0), 0);
  const sueltos = im.reduce((a, x) => a + num(x.monto), 0);
  return {
    cobPres, sueltos, ingMes: im, porRubro,
    nEmerg: im.filter(x => x.tipo === 'emergencia').length,
    nPres: pm.length, montoPres: pm.reduce((a, x) => a + (x._total || 0), 0),
    nAcep: pm.filter(x => ACEPT.includes(x.estado)).length, montoAcep: pm.filter(x => ACEPT.includes(x.estado)).reduce((a, x) => a + (x._total || 0), 0),
    nRech: pm.filter(x => x.estado === 'rechazado').length,
    cobrado: cobPres + sueltos,
    nInf: infs.filter(x => enMes((x.report || {}).fecha, m)).length,
    nSrt: lista.filter(c => enMes(c.srt, m)).length,
    pendientes: pres.filter(x => ACEPT.includes(x.estado) && (x._total || 0) - cob(x) > 0.5).map(x => ({ x, saldo: (x._total || 0) - cob(x) }))
  };
}
function mesTxt(m){ const [y, mm] = m.split('-'); return MESES[+mm - 1] + ' ' + y; }
function mover(m, k){ const [y, mm] = m.split('-').map(Number); const d = new Date(y, mm - 1 + k, 1); return `${d.getFullYear()}-${p2(d.getMonth()+1)}`; }
function renderResumen(){
  const d = datosMes(mesSel), meses = [-5, -4, -3, -2, -1, 0].map(k => mover(mesSel, k)), serie = meses.map(m => ({ m, ...datosMes(m) }));
  const max = Math.max(1, ...serie.map(s => Math.max(s.montoPres, s.cobrado)));
  const pend = d.pendientes.reduce((a, p) => a + p.saldo, 0), tasa = d.nPres ? Math.round(100 * d.nAcep / d.nPres) : 0;
  vRes.innerHTML = `<section class="card"><div class="rs-nav"><button id="rsPrev" aria-label="Mes anterior">‹</button><b>${mesTxt(mesSel)}</b><button id="rsNext" aria-label="Mes siguiente">›</button></div>
    <div class="rs-kpis">
      <div class="rs-kpi acc"><span>Ingresos del mes</span><b>$ ${money(d.cobrado)}</b><small>${d.sueltos ? `presupuestos $ ${money(d.cobPres)} · sin presupuesto $ ${money(d.sueltos)}` : 'cobros de presupuestos'}</small></div>
      <div class="rs-kpi"><span>Presupuestado</span><b>$ ${money(d.montoPres)}</b><small>${d.nPres} presupuesto${d.nPres === 1 ? '' : 's'}</small></div>
      <div class="rs-kpi"><span>Aceptado</span><b>$ ${money(d.montoAcep)}</b><small>${d.nAcep} de ${d.nPres} · ${tasa}%${d.nRech ? ' · ' + d.nRech + ' rechazado' + (d.nRech > 1 ? 's' : '') : ''}</small></div>
      <div class="rs-kpi"><span>Por cobrar (total)</span><b>$ ${money(pend)}</b><small>${d.pendientes.length} trabajo${d.pendientes.length === 1 ? '' : 's'} con saldo</small></div>
      <div class="rs-kpi"><span>Informes</span><b>${d.nInf}</b><small>con fecha en el mes</small></div>
      <div class="rs-kpi"><span>Protocolos SRT</span><b>${d.nSrt}</b><small>realizados en el mes</small></div>
    </div></section>
    <section class="card"><h2>Últimos 6 meses</h2>
      <div class="rs-bars">${serie.map(s => `<div class="rs-bar"><div class="pair"><i style="height:${Math.round(100 * s.montoPres / max)}%" title="Presupuestado $ ${money(s.montoPres)}"></i><i class="c" style="height:${Math.round(100 * s.cobrado / max)}%" title="Cobrado $ ${money(s.cobrado)}"></i></div><small>${MESES[+s.m.slice(5) - 1].slice(0, 3)}</small></div>`).join('')}</div>
      <div class="rs-ley"><span><i></i>Presupuestado</span><span><i class="c"></i>Ingresos</span></div></section>
    ${rubrosHTML(d)}
    ${ingresosHTML(d)}
    ${d.pendientes.length ? `<section class="card"><h2>Saldos por cobrar</h2><div class="rs-pend">${d.pendientes.sort((a, b) => b.saldo - a.saldo).map(p => `<a href="#presu" data-rp="${p.x.id}"><span><b>${esc(p.x.cliente || 'Sin cliente')}</b> · N° ${esc(p.x.numero)}</span><b>$ ${money(p.saldo)}</b></a>`).join('')}</div></section>` : ''}`;
  $('#rsPrev', vRes).onclick = () => { mesSel = mover(mesSel, -1); renderResumen(); };
  $('#rsNext', vRes).onclick = () => { mesSel = mover(mesSel, 1); renderResumen(); };
  $$('[data-rp]', vRes).forEach(a => a.onclick = e => { e.preventDefault(); const x = (window.__presu.lista || []).find(y => y.id === a.dataset.rp); if(x){ window.__presu.P = JSON.parse(JSON.stringify(x)); location.hash = '#presu'; setTimeout(() => { const s = document.getElementById('pzSeg'); if(s) s.scrollIntoView({ block: 'start' }); }, 80); } });
  bindIngresos();
}
function rubrosHTML(d){
  const filas = Object.entries(d.porRubro).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if(!filas.length) return '';
  const tot = filas.reduce((a, [, v]) => a + v, 0);
  return `<section class="card"><h2>Ingresos por rubro</h2><div class="rs-rubros">${filas.map(([k, v]) => `<div class="rs-rubro">
      <span>${esc(rubroTxt(k))}</span><div class="barra"><i style="width:${Math.max(2, Math.round(100 * v / tot))}%"></i></div><b>$ ${money(v)}</b><small>${Math.round(100 * v / tot)}%</small></div>`).join('')}</div>
    <p class="cl-hint" style="margin:8px 0 0">Incluye los cobros de presupuestos (según el rubro del presupuesto) y los ingresos sin presupuesto.</p></section>`;
}
function ingresosHTML(d){
  const lst = d.ingMes.slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  const e = ingEdit;
  const radios = (name, ops, val) => `<div class="rs-ops">${ops.map(([k, t]) => `<label class="${val === k ? 'on' : ''}"><input type="radio" name="${name}" value="${k}" ${val === k ? 'checked' : ''}>${t}</label>`).join('')}</div>`;
  const form = e ? `<div class="rs-ing-form">
      <div class="grid"><label>Fecha<input type="date" id="igFecha" value="${esc(e.fecha)}"></label>
        <label>Monto cobrado ($)<input id="igMonto" value="${esc(e.monto)}" inputmode="numeric" placeholder="ej. 45000"></label></div>
      <label>Rubro</label>${radios('igRubro', RUBROS, e.rubro)}
      <label>Tipo de trabajo</label>${radios('igTipo', TIPOS_ING, e.tipo)}
      <div class="grid"><label>Cliente (opcional)<input id="igCliente" value="${esc(e.cliente)}" list="dlClientes" placeholder="Nombre"></label>
        <label>Detalle (opcional)<input id="igDetalle" value="${esc(e.detalle)}" placeholder="ej. Cambio de térmica quemada"></label></div>
      <div class="row"><button class="primary" id="igGuardar">Guardar ingreso</button><button id="igCancelar">Cancelar</button>${ingresos.some(x => x.id === e.id) ? '<button id="igBorrar">Borrar</button>' : ''}</div>
      <div class="msg" id="igMsg"></div></div>` : '';
  return `<section class="card" id="rsIng"><div class="cl-top"><h2>Ingresos sin presupuesto</h2>${e ? '' : '<button class="primary" id="igNuevo">+ Registrar ingreso</button>'}</div>
    <p class="cl-hint" style="margin-top:0">Emergencias y trabajos que cobraste sin presupuesto de por medio.${d.nEmerg ? ` Este mes: ${d.nEmerg} emergencia${d.nEmerg === 1 ? '' : 's'}.` : ''}</p>
    ${ingSinc ? `<p class="cl-hint">☁ ${esc(ingSinc)}</p>` : ''}
    ${form}
    ${lst.length ? `<div class="rs-pend">${lst.map(x => `<a href="#resumen" data-ig="${x.id}"><span><b>${esc(x.cliente || x.detalle || tipoTxt(x.tipo))}</b> · ${fmtD(x.fecha)}<br><small>${esc(rubroTxt(x.rubro))} · ${esc(tipoTxt(x.tipo))}${x.cliente && x.detalle ? ' · ' + esc(x.detalle) : ''}</small></span><b>$ ${money(num(x.monto))}</b></a>`).join('')}</div>`
      : e ? '' : `<p class="cl-hint">No hay ingresos sin presupuesto en ${mesTxt(mesSel)}.</p>`}</section>`;
}
function bindIngresos(){
  const nuevo = $('#igNuevo', vRes);
  if(nuevo) nuevo.onclick = () => {
    ingEdit = { id: 'i' + Date.now(), fecha: mesSel === hoyISO().slice(0, 7) ? hoyISO() : mesSel + '-01', monto: '', rubro: 'elec', tipo: 'emergencia', cliente: '', detalle: '' };
    renderResumen(); const m = $('#igMonto', vRes); if(m){ m.scrollIntoView({ block: 'center' }); m.focus(); }
  };
  $$('[data-ig]', vRes).forEach(a => a.onclick = ev => { ev.preventDefault(); const x = ingresos.find(y => y.id === a.dataset.ig); if(!x) return;
    ingEdit = JSON.parse(JSON.stringify(x)); renderResumen(); const f = $('.rs-ing-form', vRes); if(f) f.scrollIntoView({ block: 'center' }); });
  if(!ingEdit) return;
  const leer = () => { ingEdit.fecha = $('#igFecha', vRes).value; ingEdit.monto = $('#igMonto', vRes).value; ingEdit.cliente = $('#igCliente', vRes).value.trim(); ingEdit.detalle = $('#igDetalle', vRes).value.trim(); };
  $$('input[name="igRubro"], input[name="igTipo"]', vRes).forEach(r => r.onchange = () => { leer(); ingEdit[r.name === 'igRubro' ? 'rubro' : 'tipo'] = r.value; renderResumen(); });
  const err = t => { const m = $('#igMsg', vRes); m.textContent = t; m.classList.add('err'); };
  $('#igGuardar', vRes).onclick = () => {
    leer();
    if(!ingEdit.fecha) return err('Poné la fecha del cobro.');
    if(!(num(ingEdit.monto) > 0)) return err('Poné el monto cobrado.');
    const rec = Object.assign({}, ingEdit, { _mod: Date.now(), _dirty: true }), i = ingresos.findIndex(x => x.id === rec.id);
    if(i >= 0){ rec._driveId = ingresos[i]._driveId; ingresos[i] = rec; } else ingresos.push(rec);
    guardarIng();
    if(rec.cliente) window.dispatchEvent(new CustomEvent('bae:cliente', { detail: { nombre: rec.cliente } }));
    mesSel = rec.fecha.slice(0, 7); ingEdit = null; renderResumen(); sincronizarIng(true);
  };
  $('#igCancelar', vRes).onclick = () => { ingEdit = null; renderResumen(); };
  const bb = $('#igBorrar', vRes); if(bb) bb.onclick = () => {
    if(bb.dataset.ok !== '1'){ bb.dataset.ok = '1'; bb.textContent = '¿Seguro? Tocá de nuevo'; return; }
    const x = ingresos.find(y => y.id === ingEdit.id); if(x && x._driveId){ ingBorr.push(x._driveId); store.set('bae.ing.borrados', ingBorr); }
    ingresos = ingresos.filter(y => y.id !== ingEdit.id); guardarIng(); ingEdit = null; renderResumen(); sincronizarIng(false);
  };
}

/* ---------- navegación ---------- */
function alEntrar(){
  const h = location.hash;
  if(h === '#clientes'){ renderLista(); sincronizar(false); }
  if(h === '#resumen'){ renderResumen(); sincronizarIng(false); }
  if(h === '#inicio' || h === '' || h === '#') renderVencimientos();
}
window.addEventListener('hashchange', alEntrar);
actualizarDatalist(); renderVencimientos();
if(N && N.email) setTimeout(() => { sincronizar(false); sincronizarIng(false); }, 1200);
window.__clientes = { get lista(){ return lista; }, upsert, estadoSrt, waLink, sincronizar };
APP.route(); alEntrar();
})();
