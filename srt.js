/* Módulos: inicio, Protocolo SRT 900/15 y Diseño de PAT (Wenner + selector) */
(function(){
'use strict';
const DT = window.__dt || {};
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const xesc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
const num = v => { if(v === null || v === undefined || v === '') return null; const n = parseFloat(String(v).replace(',', '.').replace(/[<>\s]/g, '')); return isNaN(n) ? null : n; };
const fmt = (v, d = 2) => v === null || v === undefined || isNaN(v) ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } },
  raw(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  setRaw(k, v){ try{ localStorage.setItem(k, v); return true; }catch(e){ return false; } }
};
function setMsg(el, t, err){ if(typeof el === 'string') el = $(el); if(!el) return; el.textContent = t; el.classList.toggle('err', !!err); }
function fmtDate(iso){ if(!iso) return ''; const p = String(iso).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso; }
function addMonths(iso, n){ if(!iso) return ''; const d = new Date(iso + 'T12:00:00'); if(isNaN(d)) return ''; d.setMonth(d.getMonth() + n); return d.toISOString().slice(0,10); }

/* ================= estilos ================= */
const css = document.createElement('style');
css.textContent = `
  .brand{display:flex;gap:12px;align-items:center;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--line)}
  .brand .bname{font-size:18px;font-weight:700;letter-spacing:.01em}
  .brand .bcred{font-size:13px;color:var(--muted)}
  nav.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
  nav.tabs a{font-weight:600;font-size:14px;text-decoration:none;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:20px;padding:6px 14px}
  nav.tabs a.on{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
  .view{display:grid;gap:18px}
  .view[hidden]{display:none}
  .home{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
  .fijos{display:grid;gap:8px}
  .fijos div{display:grid;gap:2px;padding:8px 12px;border-radius:10px;background:var(--neutral-bg)}
  .fijos span{font-size:12px;color:var(--muted)}
  .fijos b{font-weight:600;font-size:14.5px}
  .tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
  @media (min-width:900px){.tiles{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}}
  .tile{display:flex;flex-direction:column;align-items:flex-start;gap:10px;text-decoration:none;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 16px;min-height:170px;transition:transform .12s, box-shadow .12s, border-color .12s}
  .tile:hover,.tile:focus-visible{border-color:var(--accent);box-shadow:0 6px 18px rgba(15,39,51,.16);transform:translateY(-2px);outline:none}
  .tile:active{transform:scale(.98)}
  .tile .ic{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;background:var(--accent);color:var(--accent-ink)}
  .tile .ic svg{width:30px;height:30px}
  .tile b{font-size:16px;line-height:1.2}
  .tile span{font-size:13px;color:var(--muted);line-height:1.35}
  @media (max-width:899px){
    .tiles .tile:last-child:nth-child(odd){grid-column:1 / -1;min-height:0;display:grid;grid-template-columns:52px 1fr;column-gap:14px;row-gap:2px;align-items:center}
    .tiles .tile:last-child:nth-child(odd) .ic{grid-row:span 2}
  }
  #perfilCard summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--ink);font-weight:400;font-size:inherit;margin:0}
  #perfilCard summary::-webkit-details-marker{display:none}
  #perfilCard summary::after{content:'▾';color:var(--muted);transition:transform .2s}
  #perfilCard details[open] summary::after{transform:rotate(180deg)}
  .pf-sum{display:grid;gap:2px;min-width:0}
  .pf-sum b{font-size:16px}
  .pf-sum small{font-size:12.5px;color:var(--muted);font-weight:400;line-height:1.4}
  .aviso-cal{margin:14px 0 0}
  .back{display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-weight:600;font-size:14px;text-decoration:none;color:var(--accent);background:var(--card);border:1px solid var(--line);border-radius:20px;padding:6px 14px}
  nav.tabs{display:none !important}
  .back[hidden]{display:none}
  .home .card{display:flex;flex-direction:column;gap:10px}
  .home h2{font-size:17px;margin:0}
  .home p{margin:0;color:var(--muted);font-size:14px}
  .home ul{margin:0;padding-left:18px;color:var(--muted);font-size:13px}
  .home .go{margin-top:auto;align-self:flex-start;text-decoration:none}
  .tbl-wrap{overflow-x:auto;margin:0 -4px}
  table.ed{border-collapse:collapse;width:100%;min-width:640px}
  table.ed th{font-size:12px;color:var(--muted);font-weight:600;text-align:left;padding:6px 4px;border-bottom:1px solid var(--line);vertical-align:bottom}
  table.ed td{padding:4px;border-bottom:1px solid var(--line);vertical-align:middle}
  table.ed input,table.ed select{padding:6px 7px;font-size:14px;min-width:0}
  table.ed input.n{width:78px;text-align:right}
  table.ed td.calc{font-size:14px;white-space:nowrap}
  table.ed button.x{border:none;background:none;color:var(--muted);font-size:18px;padding:2px 6px}
  .kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px 18px}
  .kv div{font-size:13px;color:var(--muted)}
  .kv b{display:block;font-size:18px;color:var(--ink);font-weight:700}
  .reco{background:var(--neutral-bg);border-radius:10px;padding:14px;font-size:15px;line-height:1.5}
  .chk{display:flex;gap:8px;align-items:center;font-size:14px;color:var(--ink)}
  .chk input{width:auto;margin:0}
  .hint{font-size:13px;color:var(--muted);margin:6px 0 0}
  .verif td:last-child{text-align:right}
  textarea.plain{font-family:inherit;font-size:14px;min-height:90px}
  .pill{display:inline-block;padding:2px 9px;border-radius:12px;font-size:12px;font-weight:700}
  .pill.ok{background:var(--ok-bg);color:var(--ok)} .pill.bad{background:var(--bad-bg);color:var(--bad)} .pill.na{background:var(--neutral-bg);color:var(--muted)}
`;
document.head.appendChild(css);

/* ================= estructura y navegación ================= */
const main = $('main');
const header = $('header');
const vInf = document.createElement('div'); vInf.className = 'view'; vInf.id = 'view-informe';
while(main.firstChild) vInf.appendChild(main.firstChild);
const vHome = document.createElement('div'); vHome.className = 'view'; vHome.id = 'view-inicio';
const vSrt = document.createElement('div'); vSrt.className = 'view'; vSrt.id = 'view-srt';
const vPat = document.createElement('div'); vPat.className = 'view'; vPat.id = 'view-pat';
const vVivo = document.createElement('div'); vVivo.className = 'view'; vVivo.id = 'view-vivo';
vVivo.innerHTML = `<section class="card"><h2>Pantalla del multifunción</h2><div id="vivoSlot"></div></section>`;
[vHome, vVivo, vInf, vSrt, vPat].forEach(v => main.appendChild(v));
// el bloque Bluetooth es uno solo: se muestra en la pestaña activa (en vivo o informe)
const btHome = (() => { const b = document.getElementById('btBox'); return b ? { parent: b.parentNode, next: b.nextSibling } : null; })();
function placeBt(k){
  const b = document.getElementById('btBox'); if(!b || !btHome) return;
  if(k === 'vivo'){ if(b.parentNode !== $('#vivoSlot')) $('#vivoSlot').appendChild(b); b.classList.add('solo'); }
  else if(k === 'informe'){ if(b.parentNode !== btHome.parent) btHome.parent.insertBefore(b, btHome.next); b.classList.remove('solo'); }
}
const VIEWS = {
  inicio: { el: vHome, title: 'Hola, Alexis 👋', sub: '¿Qué hacemos hoy?' },
  vivo: { el: vVivo, title: 'Multifunción CEM en vivo', sub: 'Mirá la pantalla del DT-6650 en el teléfono y capturala, sin armar un informe.' },
  informe: { el: vInf, title: 'Informes', sub: 'Cargá mediciones e imágenes desde tus archivos, Drive o el equipo por Bluetooth, y armá el informe en PDF.' },
  srt: { el: vSrt, title: 'Protocolo de PAT — Res. SRT 900/15', sub: 'Cargá las mediciones y descargá el formulario oficial completo.' },
  pat: { el: vPat, title: 'Diseño de puesta a tierra', sub: 'Resistividad por Wenner (SEW 4235 ER) y selección de la PAT según AEA 90364.' }
};
/* ---------- perfil del profesional ---------- */
const PERFIL_DEF = { empresa: 'BAE Servicios de Instalaciones', servicio: 'Servicios de instalaciones y mantenimiento',
  nombre: 'Alexis Emanuel Barrionuevo', titulo: 'Técnico electromecánico', matTec: 'TECA 01789', tituloGas: 'Gasista matriculado de 1.ª categoría', matGas: '80235899',
  tel: '2942-626704', email: 'contacto@baeinstalaciones.com.ar', localidad: 'Zapala, Neuquén',
  banco: 'Banco Macro', titular: 'Alexis Emanuel Barrionuevo', cuit: '20-37926830-8',
  alias: 'alexis.barrionuevo25', cbu: '2850561940095892689578',
  calAnio: 2026, calMes: 9, // última calibración del DT-6650 (vale 1 año)
  eqNombre: 'CEM Multifunction Installation Tester', eqModelo: 'DT-6650', serie: '2603030240' };
// Datos propios fijos. Solo se cargan una vez (y quedan en este teléfono) los que no van al código público: alias, CBU y la última calibración.
const UNAVEZ_DEF = { alias: '', cbu: '', cuit: '', calibracion: '' };
const unaVez = Object.assign({}, UNAVEZ_DEF, store.get('bae.unavez', {}));
(() => { const old = store.get('bae.presu.cfg', {}) || {}; const rep = store.get('dt6650.report', {}) || {};
  if(!unaVez.alias && old.alias) unaVez.alias = old.alias; if(!unaVez.cbu && old.cbu) unaVez.cbu = old.cbu;
  if(!unaVez.calibracion && rep.calibracion) unaVez.calibracion = rep.calibracion; })();
const MESES_L = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const perfil = Object.assign({}, PERFIL_DEF, {
  calibracion: String(PERFIL_DEF.calMes).padStart(2, '0') + '/' + PERFIL_DEF.calAnio,
  calVence: String(PERFIL_DEF.calMes).padStart(2, '0') + '/' + (PERFIL_DEF.calAnio + 1),
  calTexto: MESES_L[PERFIL_DEF.calMes - 1] + ' de ' + PERFIL_DEF.calAnio,
  calVenceTexto: MESES_L[PERFIL_DEF.calMes - 1] + ' de ' + (PERFIL_DEF.calAnio + 1) });
// días hasta el vencimiento (primer día del mes de vencimiento)
const calDias = () => Math.ceil((new Date(PERFIL_DEF.calAnio + 1, PERFIL_DEF.calMes - 1, 1) - new Date()) / 864e5);
// por ahora la app es de mediciones eléctricas: solo se muestra la matrícula de electricista
const credenciales = () => [perfil.titulo + (perfil.matTec ? ' · Matrícula: ' + perfil.matTec : '')];
const aclaracion = () => [perfil.nombre, perfil.titulo + (perfil.matTec ? ' — Matrícula: ' + perfil.matTec : '')].filter(Boolean).join(' — ');
window.__perfil = () => Object.assign({}, perfil, { credenciales: credenciales(), aclaracion: aclaracion(),
  contacto: [perfil.tel, perfil.email, perfil.localidad].filter(Boolean).join(' · ') });
function syncInforme(){
  const set = (k, v) => { const el = document.querySelector('#reportForm [data-k="' + k + '"]'); if(el){ el.value = v || ''; el.dispatchEvent(new Event('input')); } };
  set('tecnico', perfil.nombre + (perfil.titulo ? ' — ' + perfil.titulo : '')); set('matricula', perfil.matTec);
  set('eqNombre', perfil.eqNombre); set('eqModelo', perfil.eqModelo); set('serie', perfil.serie); set('calibracion', perfil.calibracion + ' (vence ' + perfil.calVence + ')');
  const fx = document.getElementById('infFijos');
  if(fx) fx.innerHTML = `<div><span>Técnico responsable</span><b>${esc(perfil.nombre)} — ${esc(perfil.titulo)} · Matrícula: ${esc(perfil.matTec)}</b></div>
`;
}
const LOGO = (window.BAE_LOGO ? window.BAE_LOGO.mark.replace('<svg ', '<svg width="44" height="44" aria-hidden="true" ') : '');
header.innerHTML = `<div class="brand">${LOGO}<div><div class="bname" id="bName"></div><div class="bcred" id="bCred"></div></div></div>
  <h1 id="appTitle"></h1><p id="appSub"></p>
  <nav class="tabs"><a href="#inicio" data-v="inicio">Inicio</a><a href="#vivo" data-v="vivo">Ver multifunción CEM</a><a href="#informe" data-v="informe">Informes</a><a href="#srt" data-v="srt">Protocolo SRT 900/15</a><a href="#pat" data-v="pat">Diseño de PAT</a><a href="#gas" data-v="gas">Gas NAG-200</a></nav>
  <a class="back" id="backHome" href="#inicio">← Inicio</a>`;
function renderBrand(){ $('#bName').textContent = perfil.empresa || 'BAE Servicios de Instalaciones'; $('#bCred').textContent = [perfil.nombre, ...credenciales()].filter(Boolean).join(' · '); }
renderBrand(); syncInforme();
function route(){
  const h = (location.hash || '').replace('#', '');
  const k = VIEWS[h] ? h : 'inicio';
  Object.entries(VIEWS).forEach(([n, v]) => v.el.hidden = n !== k);
  placeBt(k);
  const bk = document.getElementById('backHome'); if(bk) bk.hidden = k === 'inicio';
  $('#appTitle').textContent = VIEWS[k].title; $('#appSub').textContent = VIEWS[k].sub;
  $('#bCred').textContent = [perfil.nombre, ...(k === 'gas' ? [perfil.tituloGas + ' · Matrícula: ' + perfil.matGas] : credenciales())].filter(Boolean).join(' · ');
  $$('nav.tabs a').forEach(a => a.classList.toggle('on', a.dataset.v === k));
  document.title = VIEWS[k].title;
  if(k === 'srt') renderSrtAll();
  if(k === 'pat') renderPat();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

/* ================= inicio ================= */
vHome.innerHTML = `<nav class="tiles" aria-label="Funciones">
  <a class="tile" href="#vivo"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2.5" width="16" height="19" rx="2.5"/><rect x="7" y="5.5" width="10" height="7" rx="1"/><path d="M9.5 9.5l1.5-2 1.5 3 1.5-2"/><circle cx="9" cy="17" r="1.3"/><circle cx="15" cy="17" r="1.3"/></svg></div><b>Ver multifunción CEM</b><span>Pantalla del DT-6650 en vivo por Bluetooth y captura en imagen.</span></a>
  <a class="tile" href="#informe"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2.5H6.5A2 2 0 0 0 4.5 4.5v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5"/><path d="M8 13h8M8 17h5"/></svg></div><b>Informes</b><span>Mediciones, imágenes, dictamen y PDF.</span></a>
  <a class="tile" href="#srt"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="18" rx="2"/><path d="M9 3.5V2.5h6v1"/><path d="M8.5 11l2 2 4-4"/><path d="M8.5 17h7"/></svg></div><b>Protocolo SRT 900/15</b><span>PAT, continuidad y diferenciales. Formulario oficial.</span></a>
  <a class="tile" href="#pat"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5v11"/><path d="M5 13.5h14"/><path d="M7.5 17h9"/><path d="M10 20.5h4"/></svg></div><b>Diseño de PAT</b><span>Resistividad Wenner y selección de la puesta a tierra.</span></a>
  <a class="tile" href="#presu"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg></div><b>Presupuestos</b><span>Mano de obra, materiales y condiciones, en PDF.</span></a>
  <a class="tile" href="#clientes"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/></svg></div><b>Clientes</b><span>Agenda, contactos y vencimientos de protocolos.</span></a>
  <a class="tile" href="#gas"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5c-3 4-6.5 7-6.5 11.5a6.5 6.5 0 0 0 13 0c0-3-1.8-5.2-3-7.2-.4 2-1.6 3.2-3.2 3.4 1.2-3 1.2-5.2-.3-7.7z"/></svg></div><b>Gas NAG-200</b><span>Cálculo de cañerías, isométrica, ventilaciones y memoria técnica.</span></a>
  <a class="tile" href="#calc"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M8.5 6.5h7M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5"/></svg></div><b>Calculadoras</b><span>Cables, protecciones y grado de electrificación.</span></a>
  <a class="tile" href="#resumen"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg></div><b>Resumen</b><span>Presupuestado, cobrado y trabajos del mes.</span></a>
</nav>
${calDias() <= 0 ? `<p class="msg err aviso-cal">La calibración del DT-6650 está vencida desde ${esc(perfil.calVenceTexto)}. Cuando lo recalibres, avisá para actualizar la fecha en la app.</p>`
  : calDias() <= 60 ? `<p class="msg err aviso-cal">La calibración del DT-6650 vence en ${calDias()} días (${esc(perfil.calVenceTexto)}). Programá la recalibración.</p>` : ''}
<section class="card" id="perfilCard"><details><summary><span class="pf-sum"><b>Mis datos</b><small>${esc(perfil.nombre)} · Matrícula ${esc(perfil.matTec)} · Calibración hasta ${esc(perfil.calVenceTexto)}</small></span></summary>
  <p class="hint" style="margin-top:10px">Son fijos y salen iguales en informes, protocolo SRT y presupuestos.</p>
  <div class="fijos">
    <div><span>Empresa</span><b>${esc(perfil.empresa)}</b></div>
    <div><span>Técnico responsable</span><b>${esc(perfil.nombre)} — ${esc(perfil.titulo)}</b></div>
    <div><span>Matrícula</span><b>${esc(perfil.matTec)}</b></div>
    <div><span>Matrícula de gas</span><b>${esc(perfil.tituloGas || '')} · ${esc(perfil.matGas || '')}</b></div>
    <div><span>Contacto</span><b>${esc(perfil.tel)} · ${esc(perfil.email)} · ${esc(perfil.localidad)}</b></div>
    <div><span>Equipo</span><b>${esc(perfil.eqNombre)} ${esc(perfil.eqModelo)} · N° ${esc(perfil.serie)}</b></div>
    <div><span>Cuenta para transferencias</span><b>${esc(perfil.banco)} · ${esc(perfil.titular)} · CUIT/CUIL ${esc(perfil.cuit)}<br>Alias: ${esc(perfil.alias)} · CBU: ${esc(perfil.cbu)}</b></div>
  </div>
  <h3 class="sub" style="margin-top:16px">Calibración del equipo</h3>
  <div class="fijos"><div><span>DT-6650</span><b>Última calibración: ${esc(perfil.calTexto)} · Vence: ${esc(perfil.calVenceTexto)}</b></div></div>
  <div class="msg" id="pfMsg"></div>
</details></section>`;
$$('[data-uv]', vHome).forEach(el => { el.value = unaVez[el.dataset.uv] || '';
  el.addEventListener('input', () => { unaVez[el.dataset.uv] = el.value.trim(); perfil[el.dataset.uv] = el.value.trim(); const ok = store.set('bae.unavez', unaVez); syncInforme();
    setMsg('#pfMsg', ok ? 'Guardado.' : 'Este navegador no permite guardar: los datos se pierden al cerrar.', !ok); }); });

/* ================= tablas normativas ================= */
const RA_MAX = [[0.03,40],[0.1,40],[0.3,40],[0.5,24],[1,12],[3,4],[5,2.4],[10,1.2],[20,0.6]]; // Tabla 771.3.1 col. 3
function raMax(idnA){ const r = RA_MAX.find(x => x[0] >= idnA - 1e-9); return r ? r[1] : RA_MAX[RA_MAX.length-1][1]; }
const KTAB = { n:[1,2,3,4,6,8,10], linea:[1,0.85,0.78,0.73,0.66,0.62,0.59], malla:[1,0.85,0.75,0.68,0.60,0.55,0.51] };
const SUELOS = [[0,'Pantanoso / turba húmeda'],[50,'Limo / tierra vegetal húmeda / arcilla'],[100,'Tierra vegetal seca / arcilla compacta / arena húmeda'],[300,'Grava / ripio con tierra húmeda'],[800,'Ripio seco / canto rodado / arena seca (meseta)'],[3000,'Roca / basalto / tosca dura']];
function suelo(rho){ let t = SUELOS[0][1]; SUELOS.forEach(s => { if(rho >= s[0]) t = s[1]; }); return t; }

/* ================= DISEÑO DE PAT ================= */
const patDef = { rhoMan: 150, b: 0.2, wen: [1,2,3,4,6,8,12,16].map(a => ({ a, rho: '', r: '' })),
  robj: 10, L: 2, d: 0.0146, disp: 'malla', idn: 0.03, ul: 24, h: 0.6, dc: 0.0064 };
const pat = Object.assign({}, patDef, store.get('pat.v1', {}));
if(!Array.isArray(pat.wen)) pat.wen = patDef.wen;
const savePat = () => store.set('pat.v1', pat);

function wenRho(w){ const a = num(w.a), rho = num(w.rho), r = num(w.r); if(rho !== null) return rho; if(a !== null && r !== null) return 2 * Math.PI * a * r; return null; }
function wenner(){
  const pts = pat.wen.map(w => ({ a: num(w.a), rho: wenRho(w) })).filter(p => p.a !== null && p.rho !== null).sort((x, y) => x.a - y.a);
  if(!pts.length) return { rho: num(pat.rhoMan) || 0, crit: 'Sin mediciones Wenner: se usa el ρ manual', avg: null, trend: '', pts };
  const L = num(pat.L) || 2;
  const pick = pts.find(p => p.a >= L - 1e-9) || pts[pts.length - 1];
  const avg = pts.reduce((s, p) => s + p.rho, 0) / pts.length;
  let trend = '';
  if(pts.length >= 2){ const q = pts[pts.length-1].rho / pts[0].rho;
    trend = q < 0.7 ? 'Más conductivo en profundidad: conviene jabalinas más largas (acoplables).' : q > 1.3 ? 'Más resistivo en profundidad: conviene más jabalinas en paralelo, malla o contrapeso superficial.' : 'Suelo aproximadamente homogéneo.'; }
  return { rho: pick.rho, crit: `ρ medida con a = ${fmt(pick.a,1)} m (la menor a ≥ L = ${fmt(L,1)} m, o la mayor disponible)`, avg, trend, pts };
}
function calcPat(rho){
  const L = num(pat.L) || 2, d = num(pat.d) || 0.0146, robj = num(pat.robj) || 10, h = num(pat.h) || 0.6, dc = num(pat.dc) || 0.0064, idn = num(pat.idn) || 0.03, ul = num(pat.ul) || 24;
  const kcol = pat.disp === 'linea' ? KTAB.linea : KTAB.malla;
  const R1 = rho / (2 * Math.PI * L) * (Math.log(4 * L / d) - 1);
  let n = null, k = null;
  for(let i = 0; i < KTAB.n.length; i++){ if(R1 / (KTAB.n[i] * kcol[i]) <= robj){ n = KTAB.n[i]; k = kcol[i]; break; } }
  const ne = n || 10; if(k === null) k = kcol[KTAB.n.indexOf(10)];
  const Rs = R1 / (ne * k), s = 2 * L;
  const cond = ne <= 1 ? 0 : (pat.disp === 'linea' ? (ne - 1) * s : ne * s);
  let cp = null; for(const Lc of [10,20,30,50,75,100,150,200,300,400,500]){ const Rc = rho / (Math.PI * Lc) * (Math.log(2 * Lc / Math.sqrt(dc * h)) - 1); if(Rc <= robj){ cp = Lc; break; } }
  const trat = rho > 800 ? 'Recomendado: bentonita sódica o gel mejorador (no usar sal ni carbón).' : rho > 300 ? 'Opcional: usar mejorador si la medición no llega al objetivo.' : 'No necesario.';
  const ra = raMax(idn), re10 = 10 * L / Math.log(L / d);
  const f1 = v => fmt(v, 1), fm = d * 1000;
  let txt;
  if(!n) txt = `Con 10 jabalinas de ${f1(L)} m no se llega al objetivo de ${fmt(robj,0)} Ω. Opciones: jabalinas de mayor largo (acoplables 3 a 6 m), malla de jabalinas + contrapeso horizontal de Cu desnudo 25 mm² (${cp ? cp + ' m' : 'más de 500 m'} de contrapeso solo, como referencia) y mejorador de suelo. Uniones enterradas con soldadura cuproaluminotérmica o compresión irreversible certificada.`;
  else if(n === 1) txt = `1 jabalina simple de ${f1(L)} m × ${f1(fm)} mm (IRAM 2309), con cámara de inspección y tomacable de bronce dentro de la cámara. Conductor de tierra a la barra principal según AEA 90364-5-54.`;
  else if(n <= 3) txt = `${n} jabalinas en paralelo (${pat.disp === 'linea' ? 'en línea' : 'en triángulo'}), separadas ≥ ${f1(s)} m, unidas con Cu desnudo 25 mm² enterrado a ${f1(h)} m. Cámara de inspección en cada jabalina; uniones enterradas con soldadura cuproaluminotérmica o compresión irreversible certificada.`;
  else txt = `Malla de ${n} jabalinas ${pat.disp === 'linea' ? 'en línea' : 'en anillo / cuadrícula'}, separadas ≥ ${f1(s)} m, interconectadas con Cu desnudo 25 mm² enterrado a ${f1(h)} m (≈ ${fmt(cond,0)} m de conductor). Uniones con soldadura cuproaluminotérmica o compresión irreversible certificada; cámara de inspección en la cabeza de cada toma.`;
  txt += ' Prever borne desmontable de medición en la BEP y mantener la PAT independiente de la tierra de servicio del neutro de la distribuidora (TT).';
  return { L, d, robj, idn, ul, R1, n, ne, k, Rs, s, cond, cp, trat, ra, re10, txt,
    verif: [
      ['R ≤ R objetivo de diseño', Rs <= robj, `${fmt(Rs)} Ω vs ${fmt(robj,0)} Ω`],
      [`R ≤ Ra máx. Tabla 771.3.1 (IΔn ${fmt(idn*1000,0)} mA)`, Rs <= ra, `${fmt(Rs)} Ω vs ${fmt(ra,1)} Ω`],
      ['R·IΔn ≤ U_L (corte automático TT)', Rs * idn <= ul, `${fmt(Rs * idn)} V vs ${ul} V`],
      ['Jabalina ≥ mínimo IRAM 2309 (1/2" × 1,5 m)', L >= 1.5 && d >= 0.0126 - 1e-9, `${f1(L)} m × ${f1(fm)} mm`]
    ] };
}
function renderPat(){
  if(!vPat.dataset.built){ buildPat(); vPat.dataset.built = '1'; }
  updatePat();
}
function buildPat(){
  const opt = (v, cur, label) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${label}</option>`;
  vPat.innerHTML = `
  <section class="card"><h2><span class="step">1</span> Resistividad del suelo — Wenner (SEW 4235 ER)</h2>
    <div class="grid">
      <label>ρ manual, si no hay mediciones (Ω·m)<input id="pRhoMan" inputmode="decimal" value="${esc(pat.rhoMan)}"></label>
      <label>Profundidad de hincado de las picas b (m)<input id="pB" inputmode="decimal" value="${esc(pat.b)}"></label>
    </div>
    <p class="hint">Cargá el ρ que muestra el SEW (ρ = 2π·a·R) o la R medida. Picas en línea y equidistantes, a entre 1 y 50 m. La profundidad explorada es ≈ a.</p>
    <div class="tbl-wrap"><table class="ed" id="wenTbl"><thead><tr><th>a (m)</th><th>ρ en pantalla (Ω·m)</th><th>o R medida (Ω)</th><th>ρ (Ω·m)</th><th>Control</th><th></th></tr></thead><tbody></tbody></table></div>
    <div class="row" style="margin-top:8px"><button id="wenAdd">Agregar separación</button><button class="link" id="wenClear">Borrar mediciones</button></div>
    <div class="kv" style="margin-top:14px" id="wenRes"></div>
  </section>
  <section class="card"><h2><span class="step">2</span> Datos de diseño</h2>
    <div class="grid">
      <label>R objetivo (Ω)<input id="pRobj" inputmode="decimal" value="${esc(pat.robj)}"></label>
      <label>Largo de jabalina L (m)<select id="pL">${[1.5,2,3,4.5,6].map(v => opt(v, pat.L, String(v).replace('.', ',') + ' m')).join('')}</select></label>
      <label>Diámetro de jabalina<select id="pD">${opt(0.0126, pat.d, '1/2" — 12,6 mm')}${opt(0.0146, pat.d, '5/8" — 14,6 mm')}${opt(0.0173, pat.d, '3/4" — 17,3 mm')}</select></label>
      <label>Disposición<select id="pDisp">${opt('malla', pat.disp, 'Malla / anillo')}${opt('linea', pat.disp, 'En línea')}</select></label>
      <label>IΔn del diferencial que protege las masas<select id="pIdn">${[0.03,0.1,0.3,0.5,1].map(v => opt(v, pat.idn, v < 1 ? (v*1000) + ' mA' : '1 A')).join('')}</select></label>
      <label>Tensión límite U_L<select id="pUl">${opt(24, pat.ul, '24 V — húmedo / intemperie')}${opt(50, pat.ul, '50 V — seco')}</select></label>
      <label>Profundidad del conductor desnudo h (m)<input id="pH" inputmode="decimal" value="${esc(pat.h)}"></label>
      <label>Diámetro del conductor desnudo (m)<input id="pDc" inputmode="decimal" value="${esc(pat.dc)}"></label>
    </div>
    <p class="hint">R objetivo: 10 Ω recomendado · 5 Ω instalaciones críticas · el máximo reglamentario depende del IΔn (Tabla 771.3.1). Cu desnudo 25 mm² ≈ 0,0064 m.</p>
  </section>
  <section class="card"><h2><span class="step">3</span> PAT recomendada</h2>
    <div class="kv" id="patKv"></div>
    <h3 class="sub">Configuración</h3>
    <div class="reco" id="patTxt"></div>
    <div class="row" style="margin-top:8px"><button id="patCopy">Copiar texto</button><span class="msg" id="patMsg" style="margin:0"></span></div>
    <h3 class="sub">Verificación normativa</h3>
    <table class="limits verif" id="patVer"></table>
  </section>
  <section class="card"><h2><span class="step">4</span> Tabla rápida</h2>
    <p class="hint" style="margin-top:0">Con los datos de diseño de arriba, para distintos valores de ρ.</p>
    <div class="tbl-wrap"><table class="limits" id="patQuick"></table></div>
  </section>`;
  const bind = (id, key) => $('#' + id).addEventListener('input', e => { pat[key] = e.target.value; savePat(); updatePat(); });
  [['pRhoMan','rhoMan'],['pB','b'],['pRobj','robj'],['pL','L'],['pD','d'],['pDisp','disp'],['pIdn','idn'],['pUl','ul'],['pH','h'],['pDc','dc']].forEach(x => bind(...x));
  ['pL','pD','pDisp','pIdn','pUl'].forEach(id => $('#' + id).addEventListener('change', e => e.target.dispatchEvent(new Event('input'))));
  $('#wenAdd').onclick = () => { const last = pat.wen.length ? num(pat.wen[pat.wen.length-1].a) || 0 : 0; pat.wen.push({ a: last ? last * 2 : 1, rho: '', r: '' }); savePat(); renderWen(); updatePat(); };
  $('#wenClear').onclick = () => { pat.wen.forEach(w => { w.rho = ''; w.r = ''; }); savePat(); renderWen(); updatePat(); };
  $('#patCopy').onclick = async () => { try { await navigator.clipboard.writeText($('#patTxt').textContent); setMsg('#patMsg', 'Copiado.'); } catch(e){ setMsg('#patMsg', 'No se pudo copiar: seleccioná el texto y copialo a mano.', true); } };
  renderWen();
}
function renderWen(){
  const tb = $('#wenTbl tbody');
  tb.innerHTML = pat.wen.map((w, i) => `<tr data-i="${i}">
    <td><input class="n" data-k="a" inputmode="decimal" value="${esc(w.a)}"></td>
    <td><input class="n" data-k="rho" inputmode="decimal" value="${esc(w.rho)}"></td>
    <td><input class="n" data-k="r" inputmode="decimal" value="${esc(w.r)}"></td>
    <td class="calc" data-out="rho"></td><td class="calc" data-out="ctl"></td>
    <td><button class="x" title="Quitar">×</button></td></tr>`).join('');
  $$('tr', tb).forEach(tr => {
    const i = +tr.dataset.i;
    $$('input', tr).forEach(inp => inp.addEventListener('input', () => { pat.wen[i][inp.dataset.k] = inp.value; savePat(); updatePat(); }));
    $('button.x', tr).onclick = () => { pat.wen.splice(i, 1); savePat(); renderWen(); updatePat(); };
  });
}
function updatePat(){
  const b = num(pat.b) || 0;
  $$('#wenTbl tbody tr').forEach(tr => { const w = pat.wen[+tr.dataset.i]; const r = wenRho(w), a = num(w.a);
    $('[data-out="rho"]', tr).textContent = r === null ? '' : fmt(r, 1);
    $('[data-out="ctl"]', tr).innerHTML = r === null ? '' : (a !== null && b > a / 20 ? '<span class="pill na">b > a/20: aproximado</span>' : '<span class="pill ok">OK</span>'); });
  const W = wenner();
  $('#wenRes').innerHTML = `<div>ρ de diseño<b>${fmt(W.rho,1)} Ω·m</b></div><div>Tipo de suelo estimado<b style="font-size:15px">${esc(suelo(W.rho))}</b></div>
    <div>ρ promedio<b>${W.avg === null ? '—' : fmt(W.avg,1) + ' Ω·m'}</b></div><div style="grid-column:1/-1">${esc(W.crit)}${W.trend ? '<br><b style="font-size:15px">' + esc(W.trend) + '</b>' : ''}</div>`;
  const P = calcPat(W.rho);
  $('#patKv').innerHTML = [
    ['R de 1 jabalina (Dwight)', fmt(P.R1) + ' Ω'], ['Jabalinas necesarias', P.n ? String(P.n) : 'Más de 10'], ['Coeficiente k', fmt(P.k)],
    ['R del sistema' + (P.n ? '' : ' (con 10)'), fmt(P.Rs) + ' Ω'], ['Separación mínima s = 2L', fmt(P.s,1) + ' m'], ['Cu desnudo 25 mm² de interconexión', fmt(P.cond,0) + ' m'],
    ['Contrapeso solo (alternativa)', P.cp ? P.cp + ' m' : 'Más de 500 m'], ['Distancia mín. a la PAT de servicio (10·Re)', fmt(P.re10,1) + ' m'], ['Tratamiento de suelo', P.trat]
  ].map(([k, v]) => `<div>${esc(k)}<b${v.length > 20 ? ' style="font-size:14px"' : ''}>${esc(v)}</b></div>`).join('');
  $('#patTxt').textContent = P.txt;
  $('#patVer').innerHTML = P.verif.map(([k, ok, d]) => `<tr><td>${esc(k)}</td><td style="color:var(--muted)">${esc(d)}</td><td><span class="badge ${ok ? 'ok' : 'bad'}">${ok ? 'Cumple' : 'No cumple'}</span></td></tr>`).join('');
  $('#patQuick').innerHTML = '<thead><tr><th>ρ (Ω·m)</th><th>PAT recomendada</th><th>Jabalinas</th><th>R sistema (Ω)</th><th>R 1 jabalina (Ω)</th></tr></thead><tbody>' +
    [20,50,100,150,200,300,500,800,1000,1500,2000,3000].map(r => { const q = calcPat(r);
      const t = !q.n ? 'Malla + contrapeso / jabalinas profundas + mejorador' : q.n === 1 ? '1 jabalina simple' : q.n <= 3 ? q.n + ' jabalinas en paralelo' : 'Malla de ' + q.n + ' jabalinas + Cu desnudo';
      return `<tr><td>${r}</td><td>${t}</td><td>${q.n || 'Más de 10'}</td><td>${fmt(q.Rs)}</td><td>${fmt(q.R1)}</td></tr>`; }).join('') + '</tbody>';
}

/* ================= PROTOCOLO SRT 900/15 ================= */
const SRT_INST = { equipo: 'CEM DT-6650 — N° de serie 2603030240', calib: '2026-09-24', cert: 'Baldor S.R.L. N° 26B00019779' };
const METODO = 'PAT: caída de potencial con 3 picas (regla del 62 %, verificación al 52 y 72 %), CEM DT-6650 función RE. Continuidad de masas: función LOW OHM con cables compensados. Diferenciales: función RCD (IEC 61557-6).';
const newToma = () => ({ sector: '', r52: '', r62: '', r72: '', terreno: '', uso: 'Seguridad de las masas', cont: 'auto', cap: 'SI', prot: 'DD', desc: 'auto' });
const newSrt = (keep) => ({
  est: keep ? keep.est : { razon: '', cuit: '', dir: '', loc: '', prov: 'Neuquén', cp: '' },
  inst: keep ? keep.inst : Object.assign({}, SRT_INST),
  med: { fecha: new Date().toISOString().slice(0,10), hini: '', hfin: '', metodo: METODO, ect: 'TT', idn: 0.3, ul: 24, obs: '', croquis: false },
  tomas: [newToma()], cont: [], dif: [], concl: '', recom: '', conclEdited: false, imported: []
});
let srt = store.get('srt.v1', null) || newSrt();
const saveSrt = () => store.set('srt.v1', srt);

function tomaEval(t){
  const a = num(t.r52), b = num(t.r62), c = num(t.r72);
  const desv = (a !== null && b !== null && c !== null && b > 0) ? (Math.max(a,b,c) - Math.min(a,b,c)) / b : null;
  const ra = raMax(num(srt.med.idn) || 0.3);
  return { R: b, desv, valida: desv === null ? null : desv <= 0.10, cumple: b === null ? null : b <= ra, ra };
}
function contEval(c){ const r = num(c.r); return r === null ? null : r <= 1; }
function difEval(d){
  const idn = num(d.idn), t1raw = String(d.t1 ?? '').trim();
  if(idn === null || !d.half || t1raw === '') return null;
  const gt = v => /^>/.test(String(v ?? '').trim());
  const S = d.tipo === 'S';
  const inR = (v, lo, hi) => { if(String(v ?? '').trim() === '') return true; if(gt(v)) return false; const n = num(v); return n !== null && n >= lo && n <= hi; };
  const ok = d.half === 'NO' &&
    inR(d.t1, S ? 130 : 0, S ? 500 : 300) && inR(d.t2, S ? 60 : 0, S ? 200 : 150) && inR(d.t5, S ? 50 : 0, S ? 150 : 40) &&
    (String(d.ramp ?? '').trim() === '' || (num(d.ramp) !== null && num(d.ramp) >= 0.5 * idn && num(d.ramp) <= idn)) &&
    (String(d.uf ?? '').trim() === '' || (num(d.uf) !== null && num(d.uf) <= (num(srt.med.ul) || 24)));
  return ok;
}
function autoCont(i){
  const rows = srt.cont.filter(c => contEval(c) !== null);
  const mine = rows.filter(c => num(c.toma) === i + 1);
  const use = mine.length ? mine : rows.filter(c => String(c.toma ?? '').trim() === '');
  if(!use.length) return '';
  return use.every(c => contEval(c)) ? 'SI' : 'NO';
}
function autoDesc(){ const ev = srt.dif.map(difEval).filter(v => v !== null); if(!ev.length) return ''; return ev.every(Boolean) ? 'SI' : 'NO'; }
const resolveCont = (t, i) => t.cont === 'auto' ? autoCont(i) : t.cont;
const resolveDesc = t => t.desc === 'auto' ? autoDesc() : t.desc;
function summary(){
  const te = srt.tomas.map(tomaEval);
  const ce = srt.cont.map(contEval).filter(v => v !== null);
  const de = srt.dif.map(difEval).filter(v => v !== null);
  return { tomas: te.filter(e => e.R !== null).length, tomasNo: te.filter(e => e.cumple === false).length, ra: raMax(num(srt.med.idn) || 0.3),
    masas: ce.length, masasNo: ce.filter(v => !v).length, difs: de.length, difsNo: de.filter(v => !v).length,
    noCont: srt.tomas.some((t, i) => resolveCont(t, i) === 'NO'), noDesc: srt.tomas.some(t => resolveDesc(t) === 'NO') };
}
function genConcl(){
  const s = summary();
  if(!s.tomas) return { c: '', r: '' };
  const ok = !s.tomasNo && !s.masasNo && !s.difsNo && !s.noCont && !s.noDesc;
  const c = ok ? `La instalación CUMPLE con la Reglamentación AEA 90364: ${s.tomas === 1 ? 'la toma de tierra medida tiene' : 'las ' + s.tomas + ' tomas de tierra medidas tienen'} una resistencia ≤ ${fmt(s.ra,0)} Ω (Tabla 771.3.1, esquema ${srt.med.ect})${s.masas ? (s.masas === 1 ? ', la masa verificada presenta' : ', las ' + s.masas + ' masas verificadas presentan') + ' continuidad con la PAT' : ''}${s.difs ? (s.difs === 1 ? ' y el interruptor diferencial ensayado actúa' : ' y los ' + s.difs + ' interruptores diferenciales ensayados actúan') + ' dentro de los tiempos de IEC 61008' : ''}.`
    : `La instalación NO CUMPLE con la Reglamentación AEA 90364: ${[s.tomasNo ? s.tomasNo + ' toma(s) de tierra superan ' + fmt(s.ra,0) + ' Ω' : '', s.masasNo ? s.masasNo + ' masa(s) sin continuidad adecuada' : '', s.difsNo ? s.difsNo + ' diferencial(es) fuera de tolerancia' : ''].filter(Boolean).join(', ') || 'hay ítems observados en la grilla'}. Corresponde un plan de acción según el Art. 3° de la Res. SRT 900/15.`;
  const r = [s.tomasNo ? 'Mejorar la PAT de las tomas que no cumplen (agregar jabalinas, malla o mejorador de suelo) y volver a medir.' : '',
    s.masasNo ? 'Reconectar o reemplazar los conductores de protección o equipotenciales de las masas observadas.' : '',
    s.difsNo ? 'Reemplazar los diferenciales que no cumplen y volver a ensayarlos.' : '',
    'Probar mensualmente el botón de prueba de los interruptores diferenciales.',
    srt.med.fecha ? `Repetir la medición antes del ${fmtDate(addMonths(srt.med.fecha, 12))} (validez de 12 meses, Art. 2°).` : 'Repetir la medición dentro de los 12 meses (Art. 2°).'].filter(Boolean).join(' ');
  return { c, r };
}

function buildSrt(){
  const f = (label, path, extra = '') => `<label>${label}<input data-p="${path}" ${extra}></label>`;
  vSrt.innerHTML = `
  <section class="card"><h2><span class="step">1</span> Establecimiento (ítems 1 a 6)</h2>
    <div class="grid">${f('Razón social','est.razon')}${f('CUIT','est.cuit','inputmode="numeric" placeholder="ej. 30-12345678-9"')}${f('Dirección','est.dir')}${f('Localidad','est.loc')}${f('Provincia','est.prov')}${f('Código postal','est.cp','inputmode="numeric"')}</div>
  </section>
  <section class="card"><h2><span class="step">2</span> Instrumento y medición (ítems 7 a 15 y 26)</h2>
    <div class="grid">${f('Marca, modelo y N° de serie (7)','inst.equipo')}${f('Fecha de última calibración (8)','inst.calib','type="date"')}${f('Certificado de calibración (14)','inst.cert')}
      <div><label>Estado de la calibración</label><div id="calEstado" style="margin-top:8px"></div></div></div>
    <div class="grid" style="margin-top:12px">${f('Fecha de la medición (9)','med.fecha','type="date"')}${f('Hora de inicio (10)','med.hini','type="time"')}${f('Hora de finalización (11)','med.hfin','type="time"')}
      <label>Esquema de conexión a tierra (26)<select data-p="med.ect">${['TT','TN-S','TN-C','TN-C-S','IT'].map(v => `<option>${v}</option>`).join('')}</select></label>
      <label>Mayor IΔn de los diferenciales<select data-p="med.idn">${[[0.03,'30 mA'],[0.1,'100 mA'],[0.3,'300 mA'],[0.5,'500 mA'],[1,'1 A'],[3,'3 A']].map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
      <label>Tensión límite U_L<select data-p="med.ul"><option value="24">24 V</option><option value="50">50 V</option></select></label></div>
    <p class="hint" id="raInfo"></p>
    <label style="margin-top:10px">Metodología (12)<textarea class="plain" data-p="med.metodo"></textarea></label>
    <label style="margin-top:10px">Observaciones (13)<textarea class="plain" data-p="med.obs" style="min-height:60px"></textarea></label>
    <label class="chk" style="margin-top:10px"><input type="checkbox" data-p="med.croquis"> Se adjunta plano o croquis con las tomas numeradas (15)</label>
  </section>
  <section class="card"><h2><span class="step">3</span> Importar del DT-6650</h2>
    <p class="hint" style="margin-top:0">Toma las mediciones cargadas en <a href="#informe">Informes</a>: cada EARTH pasa como toma de tierra (al 62 %), cada RCD como diferencial y cada LOW OHM como continuidad. Las ya importadas no se repiten.</p>
    <div class="row" style="margin-top:10px"><button id="srtImport">Importar mediciones</button><span class="msg" id="impMsg" style="margin:0"></span></div>
  </section>
  <section class="card"><h2><span class="step">4</span> Tomas de tierra (ítems 22 a 32)</h2>
    <p class="hint" style="margin-top:0">CEM función RE, picas en línea y electrodo desconectado. R al 62 % es la informada; con 52 y 72 % se controla que el desvío sea ≤ 10 %. "Auto" toma el resultado de continuidad y de diferenciales.</p>
    <div class="tbl-wrap"><table class="ed" id="tomaTbl" style="min-width:1250px"><thead><tr><th>N°</th><th>Sector (23)</th><th>R 52 % (Ω)</th><th>R 62 % (Ω) (27)</th><th>R 72 % (Ω)</th><th>Desvío</th><th>Cumple (28)</th><th>Terreno (24)</th><th>Uso (25)</th><th>Continuo (29)</th><th>Capacidad (30)</th><th>Protección (31)</th><th>Desconecta (32)</th><th></th></tr></thead><tbody></tbody></table></div>
    <div class="row" style="margin-top:8px"><button id="tomaAdd">Agregar toma</button><span class="hint" style="margin:0">El formulario oficial tiene 11 filas.</span></div>
  </section>
  <section class="card"><h2><span class="step">5</span> Continuidad de las masas (ítem 29)</h2>
    <p class="hint" style="margin-top:0">CEM función LOW OHM con cables compensados. Criterio ≤ 1 Ω entre la barra de tierra y cada masa. La Res. pide un circuito "continuo y permanente".</p>
    <div class="tbl-wrap"><table class="ed" id="contTbl"><thead><tr><th>Toma N°</th><th>Sector</th><th>Masa o elemento</th><th>Tipo</th><th>R (Ω)</th><th>Resultado</th><th></th></tr></thead><tbody></tbody></table></div>
    <div class="row" style="margin-top:8px"><button id="contAdd">Agregar masa</button></div>
  </section>
  <section class="card"><h2><span class="step">6</span> Interruptores diferenciales (ítems 31 y 32)</h2>
    <p class="hint" style="margin-top:0">IEC 61008 — tipo G: 1× ≤ 300 ms, 2× ≤ 150 ms, 5× ≤ 40 ms; tipo S: 1× 130–500 ms, 2× 60–200 ms, 5× 50–150 ms; rampa entre 0,5 y 1× IΔn; a ½× no debe disparar. Los ensayos que el CEM no hace (5× desde 300 mA, 2× desde 500 mA) se dejan vacíos.</p>
    <div class="tbl-wrap"><table class="ed" id="difTbl" style="min-width:980px"><thead><tr><th>Tablero / circuito</th><th>IΔn (mA)</th><th>Tipo</th><th>¿Disparó a ½×?</th><th>t 1× (ms)</th><th>t 2× (ms)</th><th>t 5× (ms)</th><th>Rampa (mA)</th><th>Uf (V)</th><th>Resultado</th><th></th></tr></thead><tbody></tbody></table></div>
    <div class="row" style="margin-top:8px"><button id="difAdd">Agregar diferencial</button></div>
  </section>
  <section class="card"><h2><span class="step">7</span> Conclusiones y recomendaciones (ítems 40 y 41)</h2>
    <div class="kv" id="srtKv"></div>
    <label style="margin-top:14px">Conclusiones (40)<textarea class="plain" id="srtConcl"></textarea></label>
    <label style="margin-top:10px">Recomendaciones (41)<textarea class="plain" id="srtRecom"></textarea></label>
    <div class="row" style="margin-top:8px"><button class="link" id="srtRegen">Volver a redactar automáticamente</button></div>
  </section>
  <section class="card"><h2><span class="step">8</span> Formulario oficial</h2>
    <p class="hint" style="margin-top:0" id="tplInfo"></p>
    <div class="row" style="margin-top:10px">
      <button class="primary" id="srtXlsx">Descargar formulario SRT (.xlsx)</button>
      <button id="tplLoad">Cargar formulario oficial</button><input type="file" id="tplFile" accept=".xlsx" hidden>
      <button class="link" id="srtNew">Nuevo protocolo</button>
    </div>
    <div class="msg" id="xlsxMsg"></div>
  </section>`;

  // campos simples
  $$('[data-p]', vSrt).forEach(el => {
    const [g, k] = el.dataset.p.split('.');
    const set = () => { srt[g][k] = el.type === 'checkbox' ? el.checked : el.value; saveSrt(); updateSrt(); };
    el.addEventListener('input', set); el.addEventListener('change', set);
  });
  $('#srtImport').onclick = importDT;
  $('#tomaAdd').onclick = () => { if(srt.tomas.length >= 11){ setMsg('#xlsxMsg', 'El formulario oficial admite 11 tomas por hoja.', true); return; } srt.tomas.push(newToma()); saveSrt(); renderTomas(); updateSrt(); };
  $('#contAdd').onclick = () => { srt.cont.push({ toma: srt.tomas.length === 1 ? '1' : '', sector: '', masa: '', tipo: 'Masa eléctrica', r: '' }); saveSrt(); renderCont(); updateSrt(); };
  $('#difAdd').onclick = () => { srt.dif.push({ circ: '', idn: '30', tipo: 'G', half: 'NO', t1: '', t2: '', t5: '', ramp: '', uf: '' }); saveSrt(); renderDif(); updateSrt(); };
  $('#srtConcl').addEventListener('input', e => { srt.concl = e.target.value; srt.conclEdited = true; saveSrt(); });
  $('#srtRecom').addEventListener('input', e => { srt.recom = e.target.value; srt.conclEdited = true; saveSrt(); });
  $('#srtRegen').onclick = () => { srt.conclEdited = false; updateSrt(); saveSrt(); };
  $('#tplLoad').onclick = () => $('#tplFile').click();
  $('#tplFile').onchange = async () => { const f = $('#tplFile').files[0]; $('#tplFile').value = ''; if(f) await loadTemplate(f); };
  $('#srtXlsx').onclick = downloadXlsx;
  let armed = 0;
  $('#srtNew').onclick = () => {
    if(Date.now() - armed > 4000){ armed = Date.now(); $('#srtNew').textContent = 'Tocá de nuevo para borrar las mediciones'; setTimeout(() => { $('#srtNew').textContent = 'Nuevo protocolo'; }, 4000); return; }
    armed = 0; srt = newSrt(srt); saveSrt(); $('#srtNew').textContent = 'Nuevo protocolo'; renderSrtAll();
  };
}
function fillFields(){
  $$('[data-p]', vSrt).forEach(el => { const [g, k] = el.dataset.p.split('.'); const v = srt[g][k];
    if(el.type === 'checkbox') el.checked = !!v; else if(el.value !== String(v ?? '')) el.value = v ?? ''; });
}
const sel = (k, cur, opts) => `<select data-k="${k}">${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(cur ?? '') ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
const inp = (k, v, cls = '', extra = '') => `<input data-k="${k}" class="${cls}" value="${esc(v)}" ${extra}>`;
function bindRows(tb, arr, rerender){
  $$('tr', tb).forEach(tr => { const i = +tr.dataset.i;
    $$('[data-k]', tr).forEach(el => { const h = () => { arr()[i][el.dataset.k] = el.value; saveSrt(); updateSrt(); }; el.addEventListener('input', h); el.addEventListener('change', h); });
    const x = $('button.x', tr); if(x) x.onclick = () => { arr().splice(i, 1); saveSrt(); rerender(); updateSrt(); };
  });
}
const TERRENOS = ['', 'Seco', 'Ripio / canto rodado seco', 'Arenoso seco', 'Arenoso húmedo', 'Húmedo', 'Lluvias recientes', 'Turba / limo / pantanoso'];
const USOS = ['Seguridad de las masas', 'Neutro de transformador', 'Equipos electrónicos / informática', 'Iluminación', 'Pararrayos', 'Otro'];
function renderTomas(){
  const tb = $('#tomaTbl tbody');
  tb.innerHTML = srt.tomas.map((t, i) => `<tr data-i="${i}"><td>${i+1}</td>
    <td>${inp('sector', t.sector, '', 'style="min-width:130px"')}</td>
    <td>${inp('r52', t.r52, 'n', 'inputmode="decimal"')}</td><td>${inp('r62', t.r62, 'n', 'inputmode="decimal"')}</td><td>${inp('r72', t.r72, 'n', 'inputmode="decimal"')}</td>
    <td class="calc" data-o="desv"></td><td class="calc" data-o="cumple"></td>
    <td>${sel('terreno', t.terreno, TERRENOS)}</td><td>${sel('uso', t.uso, USOS)}</td>
    <td>${sel('cont', t.cont, [['auto','Auto'],'SI','NO'])}</td><td>${sel('cap', t.cap, ['SI','NO'])}</td>
    <td>${sel('prot', t.prot, [['DD','DD (diferencial)'],['IA','IA (interruptor aut.)'],['Fus','Fus (fusible)']])}</td>
    <td>${sel('desc', t.desc, [['auto','Auto'],'SI','NO'])}</td>
    <td>${srt.tomas.length > 1 ? '<button class="x" title="Quitar">×</button>' : ''}</td></tr>`).join('');
  bindRows(tb, () => srt.tomas, renderTomas);
}
function renderCont(){
  const tb = $('#contTbl tbody');
  tb.innerHTML = srt.cont.length ? srt.cont.map((c, i) => `<tr data-i="${i}">
    <td>${inp('toma', c.toma, 'n', 'inputmode="numeric" style="width:60px"')}</td><td>${inp('sector', c.sector)}</td><td>${inp('masa', c.masa, '', 'style="min-width:170px"')}</td>
    <td>${sel('tipo', c.tipo, ['Masa eléctrica','Borne de tomacorriente','Masa extraña'])}</td><td>${inp('r', c.r, 'n', 'inputmode="decimal"')}</td>
    <td class="calc" data-o="res"></td><td><button class="x" title="Quitar">×</button></td></tr>`).join('') : '<tr><td colspan="7" class="empty">Sin masas cargadas.</td></tr>';
  if(srt.cont.length) bindRows(tb, () => srt.cont, renderCont);
}
function renderDif(){
  const tb = $('#difTbl tbody');
  tb.innerHTML = srt.dif.length ? srt.dif.map((d, i) => `<tr data-i="${i}">
    <td>${inp('circ', d.circ, '', 'style="min-width:150px"')}</td><td>${sel('idn', d.idn, ['10','30','100','300','500','1000'])}</td>
    <td>${sel('tipo', d.tipo, [['G','G (general)'],['S','S (selectivo)']])}</td><td>${sel('half', d.half, [['NO','NO (correcto)'],['SI','SI']])}</td>
    <td>${inp('t1', d.t1, 'n', 'inputmode="decimal"')}</td><td>${inp('t2', d.t2, 'n', 'inputmode="decimal"')}</td><td>${inp('t5', d.t5, 'n', 'inputmode="decimal"')}</td>
    <td>${inp('ramp', d.ramp, 'n', 'inputmode="decimal"')}</td><td>${inp('uf', d.uf, 'n', 'inputmode="decimal"')}</td>
    <td class="calc" data-o="res"></td><td><button class="x" title="Quitar">×</button></td></tr>`).join('') : '<tr><td colspan="11" class="empty">Sin diferenciales cargados.</td></tr>';
  if(srt.dif.length) bindRows(tb, () => srt.dif, renderDif);
}
const pill = (v, yes, no) => v === null || v === '' ? '' : `<span class="pill ${v ? 'ok' : 'bad'}">${v ? yes : no}</span>`;
function updateSrt(){
  // calibración
  const venc = addMonths(srt.inst.calib, 12), med = srt.med.fecha;
  $('#calEstado').innerHTML = !srt.inst.calib ? '<span class="pill na">Sin fecha</span>' :
    `<span class="pill ${!med || med <= venc ? 'ok' : 'bad'}">${!med || med <= venc ? 'Vigente' : 'Vencida'}</span> <span class="hint">vence el ${fmtDate(venc)}</span>`;
  const ra = raMax(num(srt.med.idn) || 0.3);
  $('#raInfo').textContent = `Ra máxima admisible: ${fmt(ra,1)} Ω (Tabla 771.3.1, columna 3, para IΔn hasta ${num(srt.med.idn) >= 1 ? srt.med.idn + ' A' : Math.round(num(srt.med.idn) * 1000) + ' mA'}).`;
  // tomas
  $$('#tomaTbl tbody tr').forEach(tr => { const i = +tr.dataset.i, t = srt.tomas[i], e = tomaEval(t);
    $('[data-o="desv"]', tr).innerHTML = e.desv === null ? '' : `${fmt(e.desv * 100, 1)} % ${pill(e.valida, 'OK', 'Repetir')}`;
    $('[data-o="cumple"]', tr).innerHTML = pill(e.cumple, 'SI', 'NO');
    const c = $('[data-k="cont"]', tr), dd = $('[data-k="desc"]', tr);
    if(c) c.options[0].textContent = 'Auto' + (autoCont(i) ? ' (' + autoCont(i) + ')' : '');
    if(dd) dd.options[0].textContent = 'Auto' + (autoDesc() ? ' (' + autoDesc() + ')' : ''); });
  $$('#contTbl tbody tr[data-i]').forEach(tr => { const v = contEval(srt.cont[+tr.dataset.i]); $('[data-o="res"]', tr).innerHTML = pill(v, 'Continuo', 'Revisar'); });
  $$('#difTbl tbody tr[data-i]').forEach(tr => { const v = difEval(srt.dif[+tr.dataset.i]); $('[data-o="res"]', tr).innerHTML = pill(v, 'Cumple', 'No cumple'); });
  // resumen
  const s = summary();
  $('#srtKv').innerHTML = [['Tomas medidas', s.tomas], ['Tomas que no cumplen', s.tomasNo], ['Masas verificadas', s.masas], ['Masas sin continuidad', s.masasNo], ['Diferenciales ensayados', s.difs], ['Diferenciales que no cumplen', s.difsNo]]
    .map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('');
  if(!srt.conclEdited){ const g = genConcl(); srt.concl = g.c; srt.recom = g.r; }
  if(document.activeElement !== $('#srtConcl')) $('#srtConcl').value = srt.concl;
  if(document.activeElement !== $('#srtRecom')) $('#srtRecom').value = srt.recom;
  updateTplInfo();
}
function renderSrtAll(){
  if(!vSrt.dataset.built){ buildSrt(); vSrt.dataset.built = '1'; }
  fillFields(); renderTomas(); renderCont(); renderDif(); updateSrt();
}

/* importación desde el informe DT-6650 */
function importDT(){
  const meas = (DT.state && DT.state.meas) || [];
  if(!meas.length){ setMsg('#impMsg', 'No hay mediciones cargadas en "Informes".', true); return; }
  let nt = 0, nc = 0, nd = 0;
  const done = new Set(srt.imported || []);
  meas.forEach(m => {
    if(done.has(m.id)) return;
    const where = m.ubic || String(m.file || '').replace(/\.txt$/i, '');
    const isR = DT.isRcd ? DT.isRcd(m) : (m.D || []).some(d => d.mult);
    if(isR){
      const vals = mult => (m.D || []).filter(d => d.mult === mult && d.value).map(d => String(d.value).trim());
      const worst = arr => { if(!arr.length) return ''; const g = arr.find(v => /^>/.test(v)); if(g) return g; return String(Math.max(...arr.map(v => num(v)).filter(v => v !== null))); };
      const half = vals('1/2'); const set = [...(m.F || []).map(x => x.value + ' ' + x.name), ...(m.X || []).map(x => x.label + ' ' + x.value)].join(' ');
      const mA = set.match(/(\d+)\s*mA/i); const uf = DT.xval ? DT.xval(m, 'UF') : '';
      srt.dif.push({ circ: where, idn: mA ? mA[1] : '30', tipo: /\bS\b|SELECT/i.test((m.F || []).map(x => x.value).join(' ')) ? 'S' : 'G',
        half: half.length ? (half.every(v => /^>/.test(v)) ? 'NO' : 'SI') : 'NO', t1: worst(vals('1')), t2: worst(vals('2')), t5: worst(vals('5')), ramp: '', uf: uf ? String(num(uf) ?? '') : '' });
      nd++;
    } else if(/EARTH|^RE$|TIERRA/i.test(m.func)){
      const r = (m.D && m.D[0]) ? num(m.D[0].value) : null; if(r === null) return;
      const empty = srt.tomas.find(t => !t.r62 && !t.r52 && !t.r72);
      if(empty){ empty.r62 = String(r); if(!empty.sector) empty.sector = where; }
      else if(srt.tomas.length < 11){ const t = newToma(); t.sector = where; t.r62 = String(r); srt.tomas.push(t); }
      else return;
      nt++;
    } else if(/LOW|OHM|CONT/i.test(m.func)){
      const r = (m.D && m.D[0]) ? num(m.D[0].value) : null; if(r === null) return;
      srt.cont.push({ toma: srt.tomas.length === 1 ? '1' : '', sector: '', masa: where, tipo: 'Masa eléctrica', r: String(r) }); nc++;
    } else return;
    done.add(m.id);
  });
  srt.imported = [...done]; saveSrt(); renderSrtAll();
  setMsg('#impMsg', nt + nc + nd ? `Importé ${nt} toma(s), ${nc} masa(s) y ${nd} diferencial(es).` : 'No había mediciones nuevas para importar (EARTH, RCD o LOW OHM).', !(nt + nc + nd));
}

/* ================= formulario oficial (.xlsx) ================= */
const TPL_KEY = 'srt.tpl.b64';
function updateTplInfo(){
  const has = !!store.raw(TPL_KEY);
  $('#tplInfo').textContent = has ? 'Formulario oficial cargado: se completa con los datos de arriba y se descarga.' : 'Cargá una vez el formulario editable oficial de la Res. SRT 900/15 (.xlsx). Queda guardado en este navegador.';
  $('#tplLoad').textContent = has ? 'Cambiar formulario oficial' : 'Cargar formulario oficial';
}
function b64(buf){ let s = ''; const b = new Uint8Array(buf); for(let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
async function loadTemplate(file){
  try{
    if(!window.JSZip) throw new Error('nozip');
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const sheets = await sheetMap(zip);
    if(!sheets['GRILLA'] || !sheets['DATOS (2)']) throw new Error('notpl');
    if(!store.setRaw(TPL_KEY, b64(buf))) setMsg('#xlsxMsg', 'Formulario leído, pero este navegador no permite guardarlo: vas a tener que cargarlo cada vez.', true);
    else setMsg('#xlsxMsg', 'Formulario oficial cargado.');
    tplMem = buf; updateTplInfo();
  } catch(e){ setMsg('#xlsxMsg', e.message === 'notpl' ? 'Ese archivo no parece el formulario editable de la Res. SRT 900/15 (faltan las hojas DATOS y GRILLA).' : 'No pude leer el archivo.', true); }
}
let tplMem = null;
function tplBytes(){
  if(tplMem) return tplMem;
  const s = store.raw(TPL_KEY); if(!s) return null;
  const bin = atob(s), u = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u;
}
async function sheetMap(zip){
  const wb = await zip.file('xl/workbook.xml').async('string');
  const rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const map = {};
  for(const m of wb.matchAll(/<sheet\b[^>]*?name="([^"]+)"[^>]*?r:id="([^"]+)"[^>]*>/g)){
    const name = m[1].replace(/&amp;/g, '&'), id = m[2];
    const r = rels.match(new RegExp('<Relationship\\b[^>]*?Id="' + id + '"[^>]*?Target="([^"]+)"')) || rels.match(new RegExp('<Relationship\\b[^>]*?Target="([^"]+)"[^>]*?Id="' + id + '"'));
    if(r) map[name] = 'xl/' + r[1].replace(/^\/?xl\//, '').replace(/^\.\//, '');
  }
  return map;
}
function setCell(xml, ref, val, sNew){
  const re = new RegExp('<c r="' + ref + '"((?:\\s[^>]*?)?)(?:/>|>[\\s\\S]*?</c>)');
  const m = xml.match(re); if(!m) return xml;
  let attrs = m[1].replace(/\/$/, '').replace(/\s+t="[^"]*"/, '');
  if(sNew !== undefined) attrs = /\ss="\d+"/.test(attrs) ? attrs.replace(/\ss="\d+"/, ' s="' + sNew + '"') : attrs + ' s="' + sNew + '"';
  let cell;
  if(val === '' || val === null || val === undefined) cell = `<c r="${ref}"${attrs}/>`;
  else if(typeof val === 'number' && isFinite(val)) cell = `<c r="${ref}"${attrs}><v>${val}</v></c>`;
  else cell = `<c r="${ref}"${attrs} t="inlineStr"><is><t xml:space="preserve">${xesc(val)}</t></is></c>`;
  return xml.replace(re, () => cell);
}
function cellStyle(xml, ref){ const m = xml.match(new RegExp('<c r="' + ref + '"[^>]*?\\ss="(\\d+)"')); return m ? +m[1] : 0; }
function wrapXf(st, idx, top){
  const ck = idx + (top ? 't' : '');
  if(st.cache[ck] !== undefined) return st.cache[ck];
  const m = st.xml.match(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/); if(!m) return idx;
  const xfs = m[2].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g) || []; let xf = xfs[idx];
  if(!xf){ st.cache[ck] = idx; return idx; }
  if(/<alignment\b/.test(xf)){ xf = xf.replace(/<alignment\b([^>]*?)(\/?)>/, (a, at, sl) => '<alignment' + at.replace(/\s(wrapText|vertical)="[^"]*"/g, '') + ' wrapText="1"' + (top ? ' vertical="top"' : (/vertical=/.test(at) ? ' ' + at.match(/vertical="[^"]*"/)[0] : '')) + sl + '>'); }
  else if(/\/>$/.test(xf)) xf = xf.replace(/\/>$/, '><alignment wrapText="1" vertical="top"/></xf>');
  else xf = xf.replace(/<\/xf>$/, '<alignment wrapText="1" vertical="top"/></xf>');
  if(!/applyAlignment=/.test(xf)) xf = xf.replace('<xf ', '<xf applyAlignment="1" ');
  const n = xfs.length;
  st.xml = st.xml.replace(m[0], () => `<cellXfs count="${n + 1}">${m[2]}${xf}</cellXfs>`);
  st.cache[ck] = n; return n;
}
const WRAP = { 'DATOS (2)': ['A15','A18','A20'], 'GRILLA': [...[...Array(11)].flatMap((_, k) => ['B','E','G'].map(c => c + (9 + k)))], 'GRILLA(1)': ['A8','H8'] };
const L_ = (label, v) => v ? label + ' ' + v : label;
function srtCells(){
  const e = srt.est, i = srt.inst, md = srt.med;
  const datos = {
    A4: L_('(1) Razón Social:', e.razon), A6: L_('(2) Dirección:', e.dir), A8: L_('(3) Localidad:', e.loc), A10: L_('(4) Provincia:', e.prov),
    A12: L_('(5) CP:', e.cp), C12: L_('(6) C.U.I.T.:', e.cuit),
    A15: L_('(7) Marca, modelo y número de serie del instrumento utilizado:', i.equipo),
    A16: L_('(8) Fecha de Calibración del Instrumental utilizado:', fmtDate(i.calib)),
    A17: L_('(9) Fecha de la medición:', fmtDate(md.fecha)), D17: L_('(10) Hora de inicio:', md.hini), F17: L_('(11) Hora finalización:', md.hfin),
    A18: L_('(12) Metodologia utilizada:', md.metodo), A20: L_('(13) Observaciones:', md.obs),
    A23: L_('(14) Certificado de Calibración.', i.cert ? '— Se adjunta: ' + i.cert : ''),
    A24: L_('(15) Plano o croquis.', md.croquis ? '— Se adjunta.' : '— No se adjunta.')
  };
  const head = { razon: e.razon, cuit: e.cuit, dir: e.dir, loc: e.loc, cp: e.cp, prov: e.prov };
  const grilla = { A3: L_('       Razón Social:', head.razon), I3: L_(' C.U.I.T.:', head.cuit), A4: L_('       Dirección:', head.dir), G4: L_('Localidad:', head.loc), K4: L_('CP:', head.cp), L4: L_('Provincia:', head.prov) };
  const ra = raMax(num(md.idn) || 0.3);
  for(let r = 0; r < 11; r++){
    const t = srt.tomas[r], row = 9 + r;
    if(!t){ ['B','E','G','J','K','L','M','N','O','P'].forEach(c => grilla[c + row] = ''); continue; }
    const ev = tomaEval(t);
    Object.assign(grilla, { ['B' + row]: t.sector, ['E' + row]: t.terreno, ['G' + row]: t.uso, ['J' + row]: md.ect,
      ['K' + row]: ev.R === null ? '' : ev.R, ['L' + row]: ev.cumple === null ? '' : (ev.cumple ? 'SI' : 'NO'),
      ['M' + row]: resolveCont(t, r), ['N' + row]: t.cap, ['O' + row]: t.prot, ['P' + row]: resolveDesc(t) });
  }
  const extra = [`Ra máx. admisible ${fmt(ra,1)} Ω (Tabla 771.3.1, col. 3, AEA 90364).`];
  srt.tomas.forEach((t, k) => { const ev = tomaEval(t); if(ev.desv !== null) extra.push(`Toma ${k+1}: 52 % ${t.r52} Ω / 62 % ${t.r62} Ω / 72 % ${t.r72} Ω (desvío ${fmt(ev.desv * 100, 1)} %).`); });
  const s = summary(); if(s.masas) extra.push(`Continuidad: ${s.masas} masa(s) verificadas, ${s.masasNo} observada(s).`); if(s.difs) extra.push(`Diferenciales: ${s.difs} ensayado(s), ${s.difsNo} fuera de tolerancia.`);
  grilla.A20 = '         Información adicional: ' + extra.join(' ');
  const g1 = { A3: L_('       Razón Social:', head.razon), I3: L_('C.U.I.T.:', head.cuit), A4: L_('       Dirección:', head.dir), H4: L_('Localidad:', head.loc), J4: L_('CP:', head.cp), K4: L_('Provincia:', head.prov),
    A8: srt.concl, H8: srt.recom };
  const firma = aclaracion() + ' (Firma, aclaración y registro del profesional interviniente)';
  datos.C28 = firma; grilla.I23 = firma; g1.I12 = firma;
  return { 'DATOS (2)': datos, 'GRILLA': grilla, 'GRILLA(1)': g1 };
}
async function buildXlsx(){
  const bytes = tplBytes(); if(!bytes) throw new Error('notpl');
  if(!window.JSZip) throw new Error('nozip');
  const zip = await JSZip.loadAsync(bytes);
  const map = await sheetMap(zip), cells = srtCells();
  const st = { xml: zip.file('xl/styles.xml') ? await zip.file('xl/styles.xml').async('string') : '', cache: {} };
  for(const [name, vals] of Object.entries(cells)){
    const path = map[name]; if(!path || !zip.file(path)) continue;
    let xml = await zip.file(path).async('string');
    const wr = WRAP[name] || [];
    for(const [ref, v] of Object.entries(vals)) xml = setCell(xml, ref, v, st.xml && wr.includes(ref) && v ? wrapXf(st, cellStyle(xml, ref), name !== 'GRILLA') : undefined);
    zip.file(path, xml);
  }
  if(st.xml) zip.file('xl/styles.xml', st.xml);
  // que Excel recalcule al abrir y no use una cadena de cálculo vieja
  if(zip.file('xl/calcChain.xml')) zip.remove('xl/calcChain.xml');
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
async function downloadXlsx(){
  try{
    setMsg('#xlsxMsg', 'Generando formulario…');
    const u8 = await buildXlsx();
    const blob = new Blob([u8], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const name = ('BAE_Protocolo_PAT_SRT900_' + (srt.est.razon || 'establecimiento') + '_' + (srt.med.fecha || '')).replace(/[^\w\-]+/g, '_') + '.xlsx';
    if(DT.save){ const ok = await DT.save(name, blob); setMsg('#xlsxMsg', ok ? 'Listo: ' + name : (document.querySelector('#dlMsg') || {}).textContent || 'No se pudo descargar.', !ok);
      if(ok) window.dispatchEvent(new CustomEvent('bae:srt', { detail: { nombre: srt.est.razon, cuit: srt.est.cuit, direccion: srt.est.dir, localidad: srt.est.loc, fecha: srt.med.fecha } })); }
    else setMsg('#xlsxMsg', 'No se pudo descargar en esta vista.', true);
  } catch(e){
    setMsg('#xlsxMsg', e.message === 'notpl' ? 'Primero cargá el formulario editable oficial (.xlsx) con el botón de al lado.' : e.message === 'nozip' ? 'No se cargó el componente ZIP. Recargá la página.' : 'No se pudo generar el formulario.', true);
  }
}
window.__srtTest = { buildXlsx, setCell, srtCells, get srt(){ return srt; }, set srt(v){ srt = v; }, calcPat, wenner, pat };
window.__srt = { cargarCliente(c){ Object.assign(srt.est, { razon: c.nombre || '', cuit: c.cuit || '', dir: c.direccion || '', loc: c.localidad || srt.est.loc }); saveSrt(); try{ fillFields(); updateSrt(); }catch(e){} } };

window.__app = { VIEWS, main, route };
route();
})();
