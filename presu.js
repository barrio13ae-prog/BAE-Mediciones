/* Módulo Presupuestos — BAE Servicios de Instalaciones */
(function(){
'use strict';
const APP = window.__app; if(!APP) return;
const DT = window.__dt || {};
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
const num = v => { const n = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
const money = n => Math.round(n).toLocaleString('es-AR');
const p2 = n => String(n).padStart(2, '0');
const isoHoy = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`; };
const fmtD = iso => { const p = String(iso || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso; };
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`; };
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

/* ---------- número a letras (pesos) ---------- */
function letras(n){
  n = Math.round(n);
  if(n === 0) return 'cero';
  const U = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
  const D = ['','','','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
  const C = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
  const dos = x => x < 30 ? U[x] : D[Math.floor(x/10)] + (x % 10 ? ' y ' + U[x % 10] : '');
  const tres = x => x === 100 ? 'cien' : (C[Math.floor(x/100)] + (x % 100 ? (x >= 100 ? ' ' : '') + dos(x % 100) : '')).trim();
  const apoc = t => t.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');
  const miles = x => { const m = Math.floor(x/1000), r = x % 1000; let s = m ? (m === 1 ? 'mil' : apoc(tres(m)) + ' mil') : ''; return (s + (r ? ' ' + tres(r) : '')).trim(); };
  const mill = Math.floor(n / 1e6), rest = n % 1e6;
  let s = mill ? (mill === 1 ? 'un millón' : apoc(miles(mill)) + ' millones') : '';
  if(rest) s += (s ? ' ' : '') + miles(rest);
  return s;
}
const enPesos = n => { const l = letras(n).replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un'); return l + (/(millón|millones)$/.test(l) ? ' de pesos' : ' pesos'); };

/* ---------- datos ---------- */
const CFG_DEF = { ultimo: 38 }; // el primero que arma la app es el N° 039
let cfg = Object.assign({}, CFG_DEF, store.get('bae.presu.cfg', {}));
if((+cfg.ultimo || 0) < CFG_DEF.ultimo) cfg.ultimo = CFG_DEF.ultimo;
let lista = store.get('bae.presu.lista', []);
const COND_SIMPLE = [
  'Precios en pesos argentinos, sin IVA (monotributo). Incluyen sólo mano de obra.',
  'No incluye: materiales, artefactos de iluminación, albañilería (cierre de canaletas), visado del CPTN ni tasas municipales o de la CEEZ.',
  'Forma de pago: 30% de anticipo; 30% al finalizar canalizaciones; 40% a la puesta en servicio y entrega del certificado.',
  'Cambios respecto del plano se cotizarán como adicional al mismo valor unitario por boca.',
  'Plazo de ejecución: a convenir según avance de obra.'
].join('\n');
const PRECIOS_DEF = [
  ['Boca de iluminación en cielorraso de placa de yeso (canalización en entretecho, cableado y conexión)', 110500],
  ['Boca de iluminación en pared — apliques interiores y exteriores (canalización embutida, cableado y conexión)', 123300],
  ['Caja de comando de 1 efecto (canalización, cableado y conexión)', 123300],
  ['Caja de comando de 2 o más efectos / combinación', 125000],
  ['Boca de tomacorriente de uso general (TUG)', 123300],
  ['Boca para aire acondicionado con circuito independiente (ACU) desde tablero', 123300],
  ['Caja para termostato de calefacción', 123300],
  ['Previsión de canalización con guía: portero eléctrico y TV satelital', 70200],
  ['Tramo adicional de cañería (cada 5 m excedentes entre cajas)', 100900],
  ['Pase de viga y/o columna', 66700],
  ['Línea seccional pilar–tablero seccional: caño R25 (12 m) y cableado', 294400],
  ['Puesta a tierra: jabalina IRAM 2309, cámara de inspección, cable de PAT y medición (Ra ≤ 40 Ω)', 187400],
  ['Tablero seccional: amurado, armado y conexionado', 1574400],
  ['Proyecto eléctrico: planos, memoria técnica y de cálculo según AEA 90364-7-770 (Anexo 770-A)', 1290200],
  ['Certificado de Aptitud de la Instalación Eléctrica (Ord. 2173/25 Zapala)', 503500]
].map(([desc, precio]) => ({ desc, precio }));
let precios = store.get('bae.presu.precios', null) || PRECIOS_DEF;
let preciosMod = store.get('bae.presu.preciosMod', 0);
const guardarPrecios = () => { store.set('bae.presu.precios', precios); preciosMod = Date.now(); store.set('bae.presu.preciosMod', preciosMod); };
const COND_DEF = [
  'Plazo estimado: a convenir según disponibilidad de materiales.',
  'Un cambio en las cantidades o en el tipo de trabajo modifica el presupuesto.',
  'Trabajos no detallados en este presupuesto se cotizan por separado.'
].join('\n');
function nuevoNumero(){ const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${String((+cfg.ultimo || 0) + 1).padStart(3, '0')}`; }
function nuevo(){
  return { id: 'p' + Date.now(), formato: 'simple', numero: nuevoNumero(), fecha: isoHoy(), validez: 15, anticipo: '',
    cliente: '', telCliente: '', direccion: '', obra: '', totalTxt: 'Total mano de obra', alcance: '', extraTitulo: '', extraTexto: '', moIntro: true,
    mo: [{ desc: '', cant: 1, precio: '' }], mat: [], matTotal: '', matIncluidos: true,
    condiciones: COND_SIMPLE };
}
let P = store.get('bae.presu.actual', null) || nuevo();
if(!P.formato) P.formato = 'completo';
const simple = () => P.formato === 'simple';
const guardarActual = () => store.set('bae.presu.actual', P);
const totMO = () => P.mo.reduce((s, r) => s + num(r.cant) * num(r.precio), 0);
const totMatItems = () => P.mat.reduce((s, r) => s + (r.precio !== '' && r.precio != null ? num(r.cant || 1) * num(r.precio) : 0), 0);
const totMat = () => simple() ? 0 : String(P.matTotal).trim() !== '' ? num(P.matTotal) : totMatItems();
const total = () => totMO() + totMat();

/* ---------- vista ---------- */
const v = document.createElement('div'); v.className = 'view'; v.id = 'view-presu'; v.hidden = true;
APP.main.appendChild(v);
APP.VIEWS.presu = { el: v, title: 'Presupuestos', sub: 'Armá el presupuesto, guardalo y descargalo en PDF con el membrete de BAE.' };
const css = document.createElement('style');
css.textContent = `
  #view-presu .card{margin-bottom:16px}
  #view-presu textarea{min-height:110px;font-family:inherit;font-size:15px}
  .pz-items{display:grid;gap:10px}
  .pz-item{display:grid;grid-template-columns:1fr 70px 120px 34px;gap:8px;align-items:start;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--neutral-bg)}
  .pz-item textarea{min-height:44px;font-size:14px;margin:0}
  .pz-item input{margin:0}
  .pz-item .sub{grid-column:1 / -1;font-size:13px;color:var(--muted);text-align:right}
  .pz-item .del{padding:6px 0;font-size:16px}
  @media (max-width:560px){.pz-item{grid-template-columns:1fr 1fr 34px}.pz-item textarea{grid-column:1 / -1}}
  .pz-tot{display:flex;justify-content:space-between;align-items:center;font-weight:700;margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--neutral-bg)}
  .pz-big{font-size:22px;color:var(--accent)}
  .pz-list{display:grid;gap:8px}
  .pz-fmt{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .pz-fmt label{display:block;padding:12px;border:1.5px solid var(--line);border-radius:12px;cursor:pointer}
  .pz-fmt label.on{border-color:var(--accent);background:var(--neutral-bg)}
  .pz-fmt input{display:none}
  .pz-fmt b{display:block;margin-bottom:4px}
  .pz-fmt span{font-size:13px;color:var(--muted);font-weight:400}
  .pz-conds{display:grid;gap:8px}
  .pz-cond{display:grid;grid-template-columns:1fr 34px;gap:8px;align-items:start}
  #view-presu .pz-cond textarea{min-height:44px;font-size:14px;margin:0;field-sizing:content;resize:vertical}
  .pz-cond .del{padding:8px 0;font-size:16px}
  .pz-sticky{transition:transform .25s ease, opacity .25s ease}
  .pz-sticky.oculta{transform:translateY(130%);opacity:0;pointer-events:none}
  .pz-banco{margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:12px;display:grid;gap:8px}
  .pz-banco-datos{font-size:14px;line-height:1.5;padding:8px 10px;border-radius:8px;background:var(--neutral-bg)}
  .pz-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
  .pz-top h2{margin:0}
  .pz-top button{padding:8px 14px}
  .pz-nube{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 12px;margin:0 0 10px;border-radius:999px;background:var(--neutral-bg);font-size:13px;color:var(--muted)}
  .pz-nube svg{width:18px;height:18px;flex-shrink:0;fill:none;stroke:var(--accent);stroke-width:1.8;stroke-linejoin:round}
  .pz-nube .t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pz-nube button{width:32px;height:32px;padding:0;border-radius:50%;font-size:16px;line-height:1;flex-shrink:0}
  .pz-nube.err{background:color-mix(in srgb, #d92d20 10%, var(--card))}
  .pz-nube.err .t{color:#b42318;white-space:normal}
  .pz-nube.err svg{stroke:#b42318}
  #pzMsgTop:empty{display:none}
  #pzBuscar{margin:0}
  .pz-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 10px 10px 14px;border:1px solid var(--line);border-radius:12px;cursor:pointer;transition:border-color .15s, background .15s}
  .pz-row:hover{border-color:var(--accent)}
  .pz-row.actual{border-color:var(--accent);background:color-mix(in srgb, var(--accent) 5%, var(--card))}
  .pz-row .info{display:grid;gap:1px;min-width:0}
  .pz-row .info > b{font-size:14.5px}
  .pz-row .info span{font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pz-row .meta{font-size:12px !important;white-space:normal !important}
  .pz-row .monto{color:var(--ink);font-weight:600}
  .pz-row em{font-style:normal;font-weight:600;margin-left:4px;padding:1px 7px;border-radius:999px;background:var(--accent);color:var(--accent-ink);font-size:11px;vertical-align:1px}
  .pz-row .acts{display:flex;gap:6px;flex-shrink:0}
  .pz-row .acts button{padding:6px 10px;font-size:13px}
  .pz-sesion{margin-top:12px;text-align:center}
  .pz-precio{cursor:default}
  .pz-sesion a{color:var(--accent)}
  .pz-hint{font-size:12.5px;color:var(--muted);margin:4px 0 8px}
  .pz-sticky{position:sticky;bottom:0;z-index:5;display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:0 -4px 16px rgba(0,0,0,.12)}
`;
document.head.appendChild(css);

function itemsHTML(kind){
  const arr = kind === 'mo' ? P.mo : P.mat;
  return arr.map((r, i) => {
    const sub = (r.precio !== '' && r.precio != null) ? num(kind === 'mat' ? (r.cant || 1) : r.cant) * num(r.precio) : null;
    return `<div class="pz-item">
      <textarea data-k="${kind}" data-i="${i}" data-f="desc" placeholder="${kind === 'mo' ? 'ej. Instalación de tablero seccional con térmicas y diferencial' : 'ej. Cable unipolar 2,5 mm² x 100 m'}">${esc(r.desc)}</textarea>
      <input data-k="${kind}" data-i="${i}" data-f="cant" value="${esc(r.cant)}" placeholder="Cant." inputmode="decimal">
      <input data-k="${kind}" data-i="${i}" data-f="precio" value="${esc(r.precio)}" placeholder="${kind === 'mo' ? 'Precio c/u' : 'Precio (opc.)'}" inputmode="numeric">
      <button class="del" data-del="${kind}" data-i="${i}" title="Quitar">✕</button>
      ${sub !== null ? `<div class="sub">Subtotal: $ ${money(sub)}</div>` : ''}
    </div>`;
  }).join('');
}
function listaHTML(){
  if(!lista.length) return '<p class="pz-hint">Todavía no guardaste presupuestos.</p>';
  return lista.slice().reverse().map(x => `<div class="pz-row${x.id === P.id ? ' actual' : ''}" data-q="${esc([x.numero, x.cliente, x.obra, x.direccion, fmtD(x.fecha)].join(' ').toLowerCase())}" data-abrir="${x.id}" role="button" tabindex="0" title="Abrir">
    <div class="info"><b>${esc(x.cliente || 'Sin cliente')}${x.id === P.id ? ' <em>abierto</em>' : ''}</b>${x.obra ? `<span>${esc(x.obra)}</span>` : ''}
    <span class="meta"><b class="monto">$ ${money(x._total || 0)}</b> · N° ${esc(x.numero)} · ${fmtD(x.fecha)}</span></div>
    <div class="acts"><button data-dup="${x.id}" title="Nuevo presupuesto usando este como base">Duplicar</button><button data-borrar="${x.id}" title="Borrar" aria-label="Borrar">✕</button></div></div>`).join('');
}
const condLista = () => Array.isArray(P.condArr) ? P.condArr.slice() : (String(P.condiciones || '') === '' ? [] : String(P.condiciones).split('\n'));
const condGuardar = arr => { P.condArr = arr; P.condiciones = arr.join('\n'); guardarActual(); };
const PF = () => typeof window.__perfil === 'function' ? window.__perfil() : {};
const fmtCuit = c => { const d = String(c || '').replace(/\D/g, ''); return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : String(c || '').trim(); };
const textoCuenta = () => { const pf = PF(); return [`${pf.banco || 'Cuenta'}${pf.titular ? ' – Titular: ' + pf.titular : ''}`, pf.cuit ? 'CUIT/CUIL: ' + fmtCuit(pf.cuit) : '', pf.alias ? 'Alias: ' + pf.alias : '', pf.cbu ? 'CBU: ' + pf.cbu : ''].filter(Boolean).join('\n'); };
function bancoHTML(){
  const pf = PF(), hay = pf.alias || pf.cbu;
  return `<div class="pz-banco">
    <h3 class="sub" style="margin:0 0 6px">Datos para transferencia</h3>
    ${hay ? `<label class="chk-gps"><input type="checkbox" data-p="incluirBanco" ${P.incluirBanco !== false ? 'checked' : ''}> Incluir en este presupuesto</label>
      <div class="pz-banco-datos">${esc(pf.banco || '')}${pf.titular ? ' · ' + esc(pf.titular) : ''}<br>${pf.cuit ? 'CUIT/CUIL: ' + esc(fmtCuit(pf.cuit)) + '<br>' : ''}${pf.alias ? 'Alias: <b>' + esc(pf.alias) + '</b>' : ''}${pf.alias && pf.cbu ? '<br>' : ''}${pf.cbu ? 'CBU: <b>' + esc(pf.cbu) + '</b>' : ''}</div>
      <div class="row"><button id="pzCompartirCuenta">Compartir datos de cuenta</button></div>`
    : `<p class="pz-hint" style="margin:0">Todavía no cargaste alias ni CBU. Cargalos una vez en <a href="#inicio">Inicio → Mis datos</a> y van a salir acá y en el PDF.</p>`}
  </div>`;
}
const REF = window.BAE_PRECIOS_REF || { fuentes: {}, items: [] };
const corto = t => t.length > 64 ? t.slice(0, 62) + '…' : t;
function catOptions(){
  let h = '<option value="">+ Agregar desde mis precios o referencias…</option>';
  h += `<optgroup label="Mis precios">${precios.map((x, i) => `<option value="m${i}">${esc(corto(x.desc))} — $ ${money(num(x.precio))}</option>`).join('')}</optgroup>`;
  const grupos = {};
  REF.items.forEach((it, i) => { const k = it[0] + '|' + it[1]; (grupos[k] = grupos[k] || []).push(i); });
  Object.entries(grupos).forEach(([k, idx]) => { const [f, g] = k.split('|'); const fu = REF.fuentes[f] || { nombre: f };
    h += `<optgroup label="${esc(fu.nombre)} · ${esc(g)}">${idx.map(i => `<option value="r${i}">${esc(corto(REF.items[i][2]))} — $ ${money(conAjuste(REF.items[i][3]))}</option>`).join('')}</optgroup>`; });
  return h;
}
const conAjuste = p => { const a = num(cfg.ajusteRef); return a ? Math.round(p * (1 + a / 100) / 100) * 100 : p; };
const refNota = () => 'Referencias: ' + Object.values(REF.fuentes).map(f => `${f.nombre} (${f.fecha}${f.nota ? ' – ' + f.nota : ''})`).join(' · ') + '. Solo mano de obra; son orientativas.';
function render(){
  const ALCCARD = `  <section class="card"><h2><span class="step">${simple() ? 3 : 2}</span> ${simple() ? 'Alcance técnico y normativa (opcional)' : 'Objeto y alcance'}</h2>
    <p class="pz-hint">Describí el trabajo. Línea en blanco = párrafo nuevo · empezá con "- " para viñetas · **texto** sale en negrita.</p>
    <textarea data-p="alcance" placeholder="${simple() ? 'ej. Instalación según Reglamentación AEA 90364-7-770, circuitos con diferencial de 30 mA…' : 'Se presupuestan la mano de obra y los materiales de…'}">${esc(P.alcance)}</textarea>
    ${simple() ? '' : `<details ${P.extraTitulo || P.extraTexto ? 'open' : ''} style="margin-top:12px"><summary>Agregar una sección extra (ej. "Por qué conviene este trabajo")</summary>
      <label style="margin-top:8px">Título<input data-p="extraTitulo" value="${esc(P.extraTitulo)}" placeholder="ej. Por qué una restauración completa"></label>
      <label style="margin-top:8px">Texto<textarea data-p="extraTexto">${esc(P.extraTexto)}</textarea></label>
    </details>`}
  </section>

`;
  const MOCARD = `  <section class="card"><h2><span class="step">${simple() ? 2 : 3}</span> ${simple() ? 'Detalle de servicios / productos' : 'Mano de obra'}</h2>
    <div class="pz-items" id="pzMo">${itemsHTML('mo')}</div>
    <div class="row" style="margin-top:10px"><button data-add="mo">+ Ítem vacío</button>
      <select id="pzCat" style="flex:1;min-width:200px">${catOptions()}</select></div>
    <div class="grid" style="margin-top:8px"><label>Ajuste sobre precios de referencia (%)<input id="pzAjuste" value="${esc(cfg.ajusteRef || '')}" inputmode="decimal" placeholder="ej. 10 para sumar 10%"></label></div>
    <p class="pz-hint">${refNota()}</p>
    <details style="margin-top:10px"><summary>Mis precios (${precios.length})</summary>
      <p class="pz-hint">Al guardar un presupuesto, sus ítems se agregan o actualizan acá con el último precio. Tocá ✕ para quitar uno.</p>
      <div class="pz-list">${precios.map((x, i) => `<div class="pz-row pz-precio"><div class="info"><b style="font-weight:500;white-space:normal">${esc(x.desc)}</b><span>$ ${money(num(x.precio))}</span></div><div class="acts"><button data-pdel="${i}">✕</button></div></div>`).join('')}</div>
    </details>
    ${simple() ? `<label style="margin-top:12px">Texto de la fila de total<input data-p="totalTxt" value="${esc(P.totalTxt || 'Total mano de obra')}"></label>` : ''}
    <div class="pz-tot"><span>Total ${simple() ? '' : 'mano de obra'}</span><span>$ ${money(totMO())}</span></div>
  </section>

`;
  const MATCARD = `  <section class="card"><h2><span class="step">4</span> Materiales</h2>
    <label class="chk-gps" style="margin-bottom:8px"><input type="checkbox" data-p="matIncluidos" ${P.matIncluidos ? 'checked' : ''}> Incluir sección de materiales en el presupuesto</label>
    <div class="pz-items" id="pzMat">${itemsHTML('mat')}</div>
    <div class="row" style="margin-top:10px"><button data-add="mat">+ Agregar material</button></div>
    <label style="margin-top:12px">Total materiales ($)<input data-p="matTotal" value="${esc(P.matTotal)}" inputmode="numeric" placeholder="${totMatItems() ? 'Se calcula: ' + money(totMatItems()) : 'ej. 1000000'}"></label>
    <p class="pz-hint">Podés poner precio a cada material o dejar los precios vacíos y cargar solo el total, como un ítem aparte.</p>
    <div class="pz-tot"><span>Total materiales</span><span>$ ${money(totMat())}</span></div>
  </section>

`;
  v.innerHTML = `
  <section class="card"><div class="pz-top"><h2>Mis presupuestos</h2><button class="primary" id="pzNuevo">+ Nuevo</button></div>
    ${nubeHTML()}
    <div class="msg" id="pzMsgTop"></div>
    ${lista.length ? `<input id="pzBuscar" type="search" placeholder="Buscar presupuesto…">
    <p class="pz-hint" id="pzCuenta">${lista.length} guardado${lista.length === 1 ? '' : 's'}</p>` : ''}
    <div class="pz-list" id="pzLista">${listaHTML()}</div>
    ${N && N.email ? `<p class="pz-hint pz-sesion">Sesión: ${esc(N.email)} · <a href="#" id="pzSalir">cerrar sesión</a></p>` : ''}</section>

  <section class="card"><h2>Formato</h2>
    <div class="pz-fmt">
      <label class="${simple() ? 'on' : ''}"><input type="radio" name="pzFmt" value="simple" ${simple() ? 'checked' : ''}><b>Simple</b><span>Una tabla de ítems, alcance, condiciones y datos de pago. El del día a día.</span></label>
      <label class="${simple() ? '' : 'on'}"><input type="radio" name="pzFmt" value="completo" ${simple() ? '' : 'checked'}><b>Completo</b><span>Secciones numeradas, mano de obra y materiales por separado, total en letras.</span></label>
    </div>
  </section>

  <section class="card"><h2><span class="step">1</span> Presupuesto y cliente</h2>
    <div class="grid">
      <label>N° de presupuesto<input data-p="numero" value="${esc(P.numero)}"></label>
      <label>Fecha de emisión<input type="date" data-p="fecha" value="${esc(P.fecha)}"></label>
      <label>Validez (días corridos)<input data-p="validez" value="${esc(P.validez)}" inputmode="numeric"></label>
      <label>Cliente<input data-p="cliente" value="${esc(P.cliente)}" placeholder="Nombre o empresa"></label>
      <label>Teléfono del cliente (opcional)<input data-p="telCliente" value="${esc(P.telCliente)}" inputmode="tel"></label>
      <label>Dirección de la obra<input data-p="direccion" value="${esc(P.direccion)}" placeholder="ej. 25 de Mayo 1520, Zapala"></label>
    </div>
    <label style="margin-top:12px">Obra / trabajo<input data-p="obra" value="${esc(P.obra)}" placeholder="ej. Instalación eléctrica en vivienda unifamiliar nueva (120 m²) — mano de obra"></label>
  </section>

  ${simple() ? MOCARD + ALCCARD : ALCCARD + MOCARD + MATCARD}
  <section class="card"><h2><span class="step">5</span> Condiciones y pago</h2>
    <div class="grid"><label>Anticipo al aceptar (%, opcional)<input data-p="anticipo" value="${esc(P.anticipo)}" inputmode="numeric" placeholder="vacío = no se agrega"></label></div>
    <p class="pz-hint">Tocá ✕ para sacar una condición de este presupuesto; al crear uno nuevo vuelven todas. La validez sale sola${simple() ? ' junto a la fecha' : ''}; si cargás un anticipo, se agrega una línea con el monto.</p>
    <div class="pz-conds" id="pzConds">${condLista().map((c, i) => `<div class="pz-cond"><textarea data-cond="${i}" rows="2" placeholder="Escribí la condición…">${esc(c)}</textarea><button class="del" data-cdel="${i}" title="Quitar esta condición">✕</button></div>`).join('') || '<p class="pz-hint">Sin condiciones: no se agrega esa sección al PDF.</p>'}</div>
    <div class="row" style="margin-top:10px"><button id="pzCondAdd">+ Agregar condición</button><button id="pzCondReset">Volver a las predeterminadas</button></div>
    ${bancoHTML()}
  </section>

  <div class="pz-sticky">
    <div><span class="pz-hint" style="margin:0">Total del presupuesto</span><div class="pz-big" id="pzTotal">$ ${money(total())}</div></div>
    <div class="row"><button id="pzGuardar">Guardar</button><button class="primary" id="pzPdf">Descargar PDF</button></div>
    <div class="msg" id="pzMsg" style="flex-basis:100%;margin:0"></div>
  </div>`;
  bind(); setTimeout(barraTotal, 0);
}
function refreshTotals(){
  const t = $('#pzTotal', v); if(t) t.textContent = '$ ' + money(total());
  $$('.pz-tot', v).forEach((el, k) => el.lastElementChild.textContent = '$ ' + money(k === 0 ? totMO() : totMat()));
}
function bind(){
  $$('[data-p]', v).forEach(el => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
    P[el.dataset.p] = el.type === 'checkbox' ? el.checked : el.value; guardarActual(); refreshTotals();
  }));
  $$('[data-c]', v).forEach(el => el.addEventListener('input', () => { cfg[el.dataset.c] = el.value; store.set('bae.presu.cfg', cfg); }));
  $$('[data-k]', v).forEach(el => el.addEventListener('input', () => {
    const arr = el.dataset.k === 'mo' ? P.mo : P.mat; arr[+el.dataset.i][el.dataset.f] = el.value; guardarActual(); refreshTotals();
    if(el.dataset.f !== 'desc'){
      const r = arr[+el.dataset.i], box = el.closest('.pz-item'); let s = box.querySelector('.sub');
      const has = r.precio !== '' && r.precio != null;
      if(has){ if(!s){ s = document.createElement('div'); s.className = 'sub'; box.appendChild(s); } s.textContent = 'Subtotal: $ ' + money(num(el.dataset.k === 'mat' ? (r.cant || 1) : r.cant) * num(r.precio)); }
      else if(s) s.remove();
    }
  }));
  $$('[data-add]', v).forEach(b => b.onclick = () => { (b.dataset.add === 'mo' ? P.mo : P.mat).push({ desc: '', cant: b.dataset.add === 'mo' ? 1 : '', precio: '' }); guardarActual(); render(); });
  $$('[data-del]', v).forEach(b => b.onclick = () => { (b.dataset.del === 'mo' ? P.mo : P.mat).splice(+b.dataset.i, 1); guardarActual(); render(); });
  $$('input[name="pzFmt"]', v).forEach(r => r.onchange = () => {
    const was = P.formato; P.formato = r.value;
    if(was !== P.formato && (P.condiciones === COND_SIMPLE || P.condiciones === COND_DEF)) { P.condiciones = P.formato === 'simple' ? COND_SIMPLE : COND_DEF; delete P.condArr; }
    guardarActual(); render();
  });
  const aj = $('#pzAjuste', v); if(aj) aj.onchange = () => { cfg.ajusteRef = aj.value.trim(); store.set('bae.presu.cfg', cfg); render(); };
  const cat = $('#pzCat', v); if(cat) cat.onchange = () => { const val = cat.value; let x = null;
    if(val[0] === 'm') x = precios[+val.slice(1)];
    else if(val[0] === 'r'){ const it = REF.items[+val.slice(1)]; if(it) x = { desc: it[2], precio: conAjuste(it[3]) }; }
    if(!x) return;
    const empty = P.mo.findIndex(r => !String(r.desc).trim() && !num(r.precio));
    const row = { desc: x.desc, cant: 1, precio: String(x.precio) }; if(empty >= 0) P.mo[empty] = row; else P.mo.push(row);
    guardarActual(); render(); const t = $$('#pzMo .pz-item', v).pop(); if(t){ const c = t.querySelector('[data-f="cant"]'); t.scrollIntoView({ block: 'center' }); c.focus(); c.select(); } };
  $$('[data-pdel]', v).forEach(b => b.onclick = () => { precios.splice(+b.dataset.pdel, 1); guardarPrecios(); render(); const d = $$('details', v).find(x => /Mis precios/.test(x.textContent)); if(d) d.open = true; });
  $$('[data-cond]', v).forEach(t => t.addEventListener('input', () => { const a = condLista(); a[+t.dataset.cond] = t.value.replace(/\n/g, ' '); condGuardar(a); }));
  $$('[data-cdel]', v).forEach(b => b.onclick = () => { const a = condLista(); a.splice(+b.dataset.cdel, 1); condGuardar(a); render(); });
  $('#pzCondAdd', v).onclick = () => { const a = condLista(); a.push(''); condGuardar(a); render(); const ts = $$('[data-cond]', v); ts[ts.length - 1].focus(); };
  $('#pzCondReset', v).onclick = () => { condGuardar((simple() ? COND_SIMPLE : COND_DEF).split('\n')); render(); };
  const bus = $('#pzBuscar', v); if(bus) bus.oninput = () => {
    const q = bus.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); let n = 0;
    $$('#pzLista .pz-row', v).forEach(r => { const ok = !q || q.split(/\s+/).every(w => r.dataset.q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(w)); r.hidden = !ok; if(ok) n++; });
    $('#pzCuenta', v).textContent = q ? `${n} de ${lista.length}` : `${lista.length} guardado${lista.length === 1 ? '' : 's'}`;
  };
  const cc = $('#pzCompartirCuenta', v); if(cc) cc.onclick = async () => {
    const t = textoCuenta();
    try{ if(navigator.share){ await navigator.share({ title: 'Datos para transferencia', text: t }); return; } }catch(e){ if(e && e.name === 'AbortError') return; }
    try{ await navigator.clipboard.writeText(t); msg('Datos de cuenta copiados: pegalos en WhatsApp o en un mail.'); }
    catch(e){ msg('No se pudo compartir. Datos: ' + t.replace(/\n/g, ' · '), true); }
  };
  $('#pzNuevo', v).onclick = () => { P = nuevo(); guardarActual(); render(); msg('Presupuesto nuevo N° ' + P.numero + '.'); };
  $('#pzGuardar', v).onclick = guardarClick;
  $('#pzPdf', v).onclick = pdf;
  bindLista();
}
function bindLista(){
  $$('[data-abrir]', v).forEach(b => { const ir = e => { if(e.target.closest('button')) return; const x = lista.find(y => y.id === b.dataset.abrir); if(x){ P = JSON.parse(JSON.stringify(x)); guardarActual(); render(); window.scrollTo(0, 0); msg('Abierto el N° ' + P.numero + '.'); } };
    b.onclick = ir; b.onkeydown = e => { if(e.key === 'Enter') ir(e); }; });
  $$('[data-dup]', v).forEach(b => b.onclick = () => { const x = lista.find(y => y.id === b.dataset.dup); if(x){ P = JSON.parse(JSON.stringify(x)); delete P._driveId; delete P._dirty; delete P._mod; P.id = 'p' + Date.now(); P.numero = nuevoNumero(); P.fecha = isoHoy(); guardarActual(); render(); msg('Copia lista como N° ' + P.numero + '. Ajustá cliente y montos.'); } });
  $$('[data-borrar]', v).forEach(b => b.onclick = () => {
    if(b.dataset.ok !== '1'){ b.dataset.ok = '1'; b.textContent = '¿Borrar?'; setTimeout(() => { if(b.isConnected){ b.dataset.ok = ''; b.textContent = '✕'; } }, 3000); return; }
    const x = lista.find(y => y.id === b.dataset.borrar); if(x && x._driveId){ borrados.push(x._driveId); if(x._pdfId) borrados.push(x._pdfId); store.set('bae.presu.borrados', borrados); }
    lista = lista.filter(y => y.id !== b.dataset.borrar); store.set('bae.presu.lista', lista); render(); sincronizar(true);
  });
}
function msg(t, err){ ['#pzMsg', '#pzMsgTop'].forEach(id => { const m = $(id, v); if(m){ m.textContent = t; m.classList.toggle('err', !!err); } }); }
const vacio = () => !String(P.cliente).trim() && !P.mo.some(r => String(r.desc).trim() || num(r.precio));
function terminarYLimpiar(texto){
  P = nuevo(); guardarActual(); render(); window.scrollTo(0, 0);
  msg(texto + ' Ya podés armar el siguiente (N° ' + P.numero + '). Lo guardado está en "Mis presupuestos".');
}
function guardarClick(){
  if(vacio()){ msg('Completá al menos el cliente o un ítem antes de guardar.', true); return; }
  const num0 = P.numero; guardar(true); sincronizar(true); terminarYLimpiar('Guardado el N° ' + num0 + '.');
}
function guardar(silencioso){
  const rec = JSON.parse(JSON.stringify(P)); rec._total = total(); rec._mod = Date.now(); rec._dirty = true;
  const i = lista.findIndex(y => y.id === P.id); if(i >= 0){ rec._driveId = rec._driveId || lista[i]._driveId; rec._pdfId = rec._pdfId || lista[i]._pdfId; lista[i] = rec; } else lista.push(rec);
  const n = parseInt(String(P.numero).split('-').pop(), 10); if(!isNaN(n) && n > (+cfg.ultimo || 0)){ cfg.ultimo = n; store.set('bae.presu.cfg', cfg); }
  P.mo.forEach(r => { const d = String(r.desc).trim(); if(!d || !num(r.precio)) return;
    const i = precios.findIndex(x => x.desc.trim().toLowerCase() === d.toLowerCase());
    if(i >= 0) precios[i].precio = num(r.precio); else precios.push({ desc: d, precio: num(r.precio) }); });
  guardarPrecios();
  store.set('bae.presu.lista', lista); if(!silencioso){ render(); msg('Guardado: presupuesto N° ' + P.numero + '.'); }
}

/* ---------- PDF ---------- */
const SAFE = s => String(s ?? '').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/Ω/g, 'ohm').replace(/[—–]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[^\x00-\xFF]/g, '');
async function pdf(){
  if(!window.jspdf){ msg('No se cargó el generador de PDF. Abrí la app con internet una vez.', true); return; }
  if(vacio()){ msg('Completá al menos el cliente o un ítem antes de descargar.', true); return; }
  guardar(true); sincronizar(true); const idPdf = P.id;
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, M = 15, CW = PW - 2*M, BOT = simple() ? 286 : 284; let y = 14;
  const VERDE = [11,122,75], CLARO = [220,239,228], TXT = [25,30,28];
  const pf = typeof window.__perfil === 'function' ? window.__perfil() : {};
  const need = h => { if(y + h > BOT){ doc.addPage(); y = 16; } };
  // texto con **negrita** y ajuste de línea
  function rich(text, x, w, size = simple() ? 9 : 10, lh = simple() ? 4.1 : 4.7){
    doc.setFontSize(size);
    const toks = []; String(text).split(/(\*\*[^*]+\*\*)/).forEach(part => {
      if(!part) return; const b = /^\*\*.+\*\*$/.test(part); const t = b ? part.slice(2, -2) : part;
      t.split(/(\s+)/).forEach(w => { if(w) toks.push({ w: SAFE(w), b }); });
    });
    let line = [], lw = 0; const lines = [];
    const width = tk => { doc.setFont('helvetica', tk.b ? 'bold' : 'normal'); return doc.getTextWidth(tk.w); };
    toks.forEach(tk => { const tw = width(tk); if(/^\s+$/.test(tk.w) && !line.length) return;
      if(lw + tw > w && line.length && !/^\s+$/.test(tk.w)){ lines.push(line); line = []; lw = 0; }
      if(/^\s+$/.test(tk.w) && !line.length) return; line.push(tk); lw += tw; });
    if(line.length) lines.push(line);
    lines.forEach(l => { need(lh); let cx = x; l.forEach(tk => { doc.setFont('helvetica', tk.b ? 'bold' : 'normal'); doc.setTextColor(...TXT); doc.text(tk.w, cx, y); cx += doc.getTextWidth(tk.w); }); y += lh; });
  }
  function bloque(text){
    String(text || '').replace(/\r/g, '').split(/\n\s*\n/).forEach(par => {
      const ls = par.split('\n');
      if(ls.every(l => /^\s*[-•]\s+/.test(l) || !l.trim())){
        ls.filter(l => l.trim()).forEach(l => { need(5); doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(...TXT); doc.text('•', M + 2, y); rich(l.replace(/^\s*[-•]\s+/, ''), M + 6, CW - 6); y += 0.6; });
      } else {
        const mixed = ls.some(l => /^\s*[-•]\s+/.test(l));
        if(mixed){ ls.forEach(l => { if(/^\s*[-•]\s+/.test(l)){ need(5); doc.setFont('helvetica','normal'); doc.text('•', M + 2, y); rich(l.replace(/^\s*[-•]\s+/, ''), M + 6, CW - 6); } else if(l.trim()) rich(l, M, CW); }); }
        else rich(ls.join(' '), M, CW);
      }
      y += simple() ? 1.2 : 2.2;
    });
  }
  let nSec = 0;
  function barra(t, h = 32, tight){ need(h); y += 1; doc.setFillColor(...VERDE); doc.rect(M, y, CW, 7, 'F'); doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(9.5);
    doc.text(SAFE((simple() ? t : `${++nSec}. ${t}`).toUpperCase()), PW/2, y + 4.8, { align: 'center' }); y += tight ? 7 : 11; }
  function tabla(cols, rows, totalRow, o = {}){
    const FS = o.fs || 9.5, LH = o.lh || 4.3, PAD = o.pad ?? 3, TOP = o.top || 4.8;
    const rh0 = 7; const head = () => { need(rh0 + 8); doc.setFillColor(...VERDE); doc.setDrawColor(40); doc.rect(M, y, CW, rh0, 'F');
      doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(9.5); let x = M;
      cols.forEach(c => { doc.text(SAFE(c.h), c.al === 'r' ? x + c.w - 2 : c.al === 'c' ? x + c.w/2 : x + 2, y + 4.8, { align: c.al === 'r' ? 'right' : c.al === 'c' ? 'center' : 'left' }); x += c.w; }); y += rh0; };
    if(rows.length <= 6) need(rh0 + rows.length * 8.6 + 12);
    head();
    doc.setFont('helvetica','normal'); doc.setFontSize(FS);
    rows.forEach(r => {
      const wrapped = r.map((t, k) => doc.splitTextToSize(SAFE(t), cols[k].w - 4));
      const h = Math.max(...wrapped.map(w => w.length)) * LH + PAD;
      if(y + h > BOT){ doc.addPage(); y = 16; head(); doc.setFont('helvetica','normal'); doc.setFontSize(FS); }
      let x = M; doc.setDrawColor(60); doc.setTextColor(...TXT);
      cols.forEach((c, k) => { doc.rect(x, y, c.w, h); wrapped[k].forEach((ln, j) => doc.text(ln, c.al === 'r' ? x + c.w - 2 : c.al === 'c' ? x + c.w/2 : x + 2, y + TOP + j*LH, { align: c.al === 'r' ? 'right' : c.al === 'c' ? 'center' : 'left' })); x += c.w; });
      y += h;
    });
    if(totalRow){ need(8); doc.setFillColor(...CLARO); doc.setDrawColor(60); const lw = CW - cols[cols.length-1].w;
      doc.rect(M, y, lw, 7, 'FD'); doc.rect(M + lw, y, cols[cols.length-1].w, 7, 'FD');
      doc.setFont('helvetica','bold'); doc.setTextColor(...TXT); doc.text(SAFE(totalRow[0]), M + 2, y + 4.8); doc.text(SAFE(totalRow[1]), PW - M - 2, y + 4.8, { align: 'right' }); y += 10; }
    else y += 3;
  }
  // encabezado
  const L = window.BAE_LOGO;
  if(L && L.lockPng){ doc.addImage(L.lockPng, 'PNG', M, y, 62, 15.3); }
  doc.setTextColor(...TXT); doc.setFont('helvetica','bold'); doc.setFontSize(10.5);
  doc.text(SAFE(pf.servicio || ''), PW - M, y + 4, { align: 'right' });
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
  let hy = y + 9;
  const cred = [pf.titulo, pf.matTec ? 'Matrícula: ' + pf.matTec : ''].filter(Boolean).join(' · ');
  if(cred){ doc.text(SAFE(cred), PW - M, hy, { align: 'right' }); hy += 4.6; }
  if(pf.tel){ doc.text(SAFE('Teléfono: ' + pf.tel), PW - M, hy, { align: 'right' }); hy += 4.6; }
  const mail = pf.email; if(mail){ doc.text(SAFE('Email: ' + mail), PW - M, hy, { align: 'right' }); hy += 4.6; }
  y = Math.max(y + 24, hy + (simple() ? 3 : 5));
  doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(SAFE('PRESUPUESTO N° ' + P.numero), M, y); y += 6;
  const val = parseInt(P.validez, 10) || 0, f = new Date(P.fecha + 'T12:00:00');
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.text(SAFE('FECHA DE EMISIÓN: ' + fmtD(P.fecha) + (simple() && val ? '  ·  VALIDEZ DE LA OFERTA: ' + val + ' DÍAS' : '')), M, y); y += simple() ? 6.5 : 8;
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('DATOS DE CLIENTE', M, y); y += 5;
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
  const CL = simple() ? 4.3 : 4.8;
  doc.text(SAFE('NOMBRE: ' + (P.cliente || '').toUpperCase()), M, y); y += CL;
  if(P.telCliente){ doc.text(SAFE('TELÉFONO: ' + P.telCliente), M, y); y += CL; }
  if(P.direccion){ const ls = doc.splitTextToSize(SAFE('DIRECCIÓN DE LA OBRA: ' + P.direccion), CW); doc.text(ls, M, y); y += ls.length * 4.6; }
  if(P.obra){ const ls = doc.splitTextToSize(SAFE('OBRA: ' + (simple() ? P.obra : P.obra.toUpperCase())), CW); doc.text(ls, M, y); y += ls.length * 4.6; }
  y += 3;
  const banco = (P.incluirBanco !== false && (pf.alias || pf.cbu)) ? [`CUENTA ${pf.banco ? 'DE ' + pf.banco.toUpperCase() + ' ' : ''}${pf.titular ? 'A NOMBRE DE ' + pf.titular.toUpperCase() : ''}`.trim(), pf.cuit ? 'CUIT/CUIL: ' + fmtCuit(pf.cuit) : '', pf.alias ? 'ALIAS: ' + pf.alias : '', pf.cbu ? 'CBU: ' + pf.cbu : ''].filter(Boolean) : [];
  const ant = num(P.anticipo);
  if(simple()){
    const pesos = n => '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const T = totMO();
    const mo = P.mo.filter(r => String(r.desc).trim() || num(r.precio));
    barra('Detalle de servicios / productos', 30, true);
    tabla([{h:'ÍTEM',w:11,al:'c'},{h:'DESCRIPCIÓN',w:CW-11-27-20-31},{h:'P. UNITARIO',w:27,al:'r'},{h:'CANTIDAD',w:20,al:'c'},{h:'SUBTOTAL',w:31,al:'r'}],
      mo.map((r, i) => [(i + 1) + '.', r.desc, pesos(num(r.precio)), String(r.cant), pesos(num(r.cant) * num(r.precio))]), [String(P.totalTxt || 'Total').toUpperCase(), pesos(T)], { fs: 8.2, lh: 3.3, pad: 1.9, top: 3.6 });
    if(String(P.alcance).trim()){ barra('Alcance técnico y normativa', 20); bloque(P.alcance); }
    const conds = String(P.condiciones || '').split('\n').map(x => x.trim()).filter(Boolean).map(x => x.replace(/^[-•]\s*/, ''));
    if(ant) conds.push(`Anticipo del ${ant}% al aceptar el presupuesto: ${pesos(T * ant / 100)}.`);
    if(conds.length){ barra('Condiciones del presupuesto / pago', 20); bloque(conds.map(c => '- ' + c).join('\n')); }
    if(banco.length){ y += 2; need(banco.length * 4.3 + 6); doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...TXT); doc.text('DATOS PARA TRANSFERENCIA', M, y); y += 5;
      doc.setFont('helvetica','normal'); doc.setFontSize(9); banco.forEach(l => { doc.text(SAFE(l), M, y); y += 4.3; }); }
    return terminar();
  }
  const tMO = totMO(), tMat = P.matIncluidos ? totMat() : 0, T = tMO + tMat;
  if(String(P.alcance).trim()){ barra('Objeto y alcance'); bloque(P.alcance); bloque('Valores expresados en pesos argentinos (AR$).'); }
  if(String(P.extraTexto).trim()){ barra(P.extraTitulo || 'Detalle'); bloque(P.extraTexto); }
  const mo = P.mo.filter(r => String(r.desc).trim() || num(r.precio));
  if(mo.length){
    barra('Mano de obra'); bloque(`La mano de obra cotizada suma **$${money(tMO)}**.`);
    tabla([{h:'Descripción',w:CW-14-34-34},{h:'Cant.',w:14,al:'c'},{h:'Precio c/u (AR$)',w:34,al:'r'},{h:'Subtotal (AR$)',w:34,al:'r'}],
      mo.map(r => [r.desc, String(r.cant), money(num(r.precio)), money(num(r.cant) * num(r.precio))]), ['TOTAL MANO DE OBRA', money(tMO)]);
  }
  const mat = P.mat.filter(r => String(r.desc).trim());
  if(P.matIncluidos && (mat.length || tMat)){
    barra('Materiales'); bloque('Los materiales se incluyen en el presupuesto como un ítem aparte de la mano de obra.');
    const conPrecio = mat.some(r => r.precio !== '' && r.precio != null);
    if(mat.length){
      if(conPrecio) tabla([{h:'Material',w:CW-16-32-32},{h:'Cant.',w:16,al:'c'},{h:'Precio c/u (AR$)',w:32,al:'r'},{h:'Subtotal (AR$)',w:32,al:'r'}],
        mat.map(r => { const has = r.precio !== '' && r.precio != null; return [r.desc, String(r.cant || '-'), has ? money(num(r.precio)) : '-', has ? money(num(r.cant || 1) * num(r.precio)) : '-']; }), ['TOTAL MATERIALES (AR$)', money(tMat)]);
      else tabla([{h:'Material',w:CW-34},{h:'Cant.',w:34,al:'c'}], mat.map(r => [r.desc, String(r.cant || '-')]), ['TOTAL MATERIALES (AR$)', money(tMat)]);
    } else tabla([{h:'Concepto',w:CW-40},{h:'AR$',w:40,al:'r'}], [['Materiales', money(tMat)]], null);
  }
  barra('Total del presupuesto', 62);
  bloque(`El total del presupuesto es de **$${money(T)}** (${enPesos(T)})${P.matIncluidos && tMat ? ', con mano de obra y materiales incluidos' : ''}.`);
  const filas = [['Mano de obra', money(tMO)]]; if(P.matIncluidos && tMat) filas.push(['Materiales', money(tMat)]);
  tabla([{h:'Concepto',w:CW-50},{h:'AR$',w:50,al:'r'}], filas, ['TOTAL DEL PRESUPUESTO', money(T)]);
  barra('Condiciones del presupuesto / pago');
  const conds = [];
  if(val) conds.push(`**Validez de la oferta: ${val} días corridos** desde la fecha de emisión (hasta el ${fmtD(addDays(P.fecha, val))}). Precios de mano de obra y materiales a ${MESES[f.getMonth()]} de ${f.getFullYear()}.`);
  String(P.condiciones || '').split('\n').map(s => s.trim()).filter(Boolean).forEach(s => conds.push(s.replace(/^[-•]\s*/, '')));
  conds.push(ant ? `**Forma de pago y anticipo: a convenir.** Idealmente, un anticipo del ${ant}% del total ($${money(T * ant / 100)}) al aceptar el presupuesto; el saldo, según lo acordado.` : '**Forma de pago: a convenir.**');
  bloque(conds.map(c => '- ' + c).join('\n'));
  if(banco.length){ need(banco.length * 5 + 2); doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...TXT); banco.forEach(l => { doc.text(SAFE(l), M, y); y += 4.8; }); }
  return terminar();
  async function terminar(){
  const n = doc.getNumberOfPages(), nom = (pf.nombre || '').split(' ').filter(Boolean);
  const firma = nom.length > 2 ? nom[0] + ' ' + nom[nom.length-1] : nom.join(' ');
  for(let i = 1; i <= n; i++){ doc.setPage(i); doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(90);
    doc.text(SAFE(`Presupuesto N° ${P.numero}${firma ? ' · ' + firma : ''} · Página ${i} de ${n}`), PW/2, 291, { align: 'center' }); }
  const name = `Presupuesto_${P.numero}_${(P.cliente || 'cliente').replace(/[^\wáéíóúñÁÉÍÓÚÑ]+/g, '_')}.pdf`;
  const blobPdf = doc.output('blob');
  pdfPend = pdfPend.filter(x => x.id !== idPdf); pdfPend.push({ id: idPdf, name, blob: blobPdf }); sincronizar(false);
  const ok = DT.save ? await DT.save(name, blobPdf) : false;
  if(ok) terminarYLimpiar('PDF listo y presupuesto guardado: ' + name + '.'); else msg('No se pudo descargar el PDF. El presupuesto quedó guardado.', true);
  }
}
function barraTotal(){
  const bar = $('.pz-sticky', v); if(!bar || v.hidden) return;
  const abajo = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 120;
  bar.classList.toggle('oculta', !abajo);
}
window.addEventListener('scroll', barraTotal, { passive: true });
window.addEventListener('resize', barraTotal);
window.addEventListener('hashchange', () => { if(location.hash === '#presu'){ render(); sincronizar(false); } setTimeout(barraTotal, 50); });
/* ---------- Google Drive ---------- */
const N = window.__nube;
let borrados = store.get('bae.presu.borrados', []);
let pdfPend = [];
let sinc = { txt: '', err: false }, sincronizando = null, otraVez = false;
const horaCorta = t => { const d = new Date(t); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
function nubeHTML(){
  if(!N || !N.email) return '';
  const ult = store.get('bae.drive.ult', 0);
  const txt = sinc.txt || (ult ? 'Drive al día · ' + (new Date(ult).toDateString() === new Date().toDateString() ? 'hoy ' + horaCorta(ult) : fmtD(new Date(ult).toISOString().slice(0, 10))) : 'Todavía no se sincronizó.');
  return `<div class="pz-nube${sinc.err ? ' err' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 19h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.6 9.6 4.75 4.75 0 0 0 7.5 19z"/></svg><span class="t" id="pzNubeTxt">${esc(txt)}</span><button id="pzSync" title="Sincronizar ahora" aria-label="Sincronizar ahora">↻</button></div>`;
}
function estado(t, err){ sinc = { txt: t, err: !!err }; const e = $('#pzNubeTxt', v); if(e){ e.textContent = t; e.closest('.pz-nube').classList.toggle('err', !!err); } }
const nombreArchivo = x => ('Presupuesto_' + x.numero + '_' + (x.cliente || 'cliente')).replace(/[\\/:*?"<>|]+/g, '_');
function editando(){ const a = document.activeElement; return a && v.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && !$('#pzLista', v).contains(a) && a.id !== 'pzBuscar'; }
function refrescarLista(){
  if(!editando()){ render(); return; }
  const l = $('#pzLista', v); if(l){ l.innerHTML = listaHTML(); bindLista(); }
}
async function sincronizar(interactivo){
  if(!N || !N.email) return;
  if(sincronizando){ otraVez = true; return sincronizando; }
  if(!N.conectado){
    if(!interactivo){ estado('Tocá "Sincronizar" para conectar con Google Drive.'); return; }
    sincronizando = N.pedirToken(false).then(() => { sincronizando = null; return sincronizar(false); }, e => { sincronizando = null; estado('No se conectó con Drive: ' + e.message + '.', true); });
    return sincronizando;
  }
  sincronizando = (async () => {
    let cambio = false;
    try{
      estado('Sincronizando…');
      let rem;
      try{ rem = await N.listar('presu'); }catch(e){ if(/404/.test(e.message)){ N.olvidarCarpeta(); rem = await N.listar('presu'); } else throw e; }
      // 1. borrados en este dispositivo → papelera de Drive
      for(const id of borrados.slice()){ await N.papelera(id); borrados = borrados.filter(x => x !== id); store.set('bae.presu.borrados', borrados); }
      rem = rem.filter(f => !borrados.includes(f.id));
      // 2. traer lo nuevo o modificado en otro dispositivo
      for(const f of rem){
        const pid = f.appProperties && f.appProperties.id, mod = +(f.appProperties && f.appProperties.mod) || 0; if(!pid) continue;
        const i = lista.findIndex(x => x.id === pid), loc = lista[i];
        if(!loc || (!loc._dirty && (+loc._mod || 0) < mod)){
          const d = await N.bajar(f.id); Object.assign(d, { id: pid, _driveId: f.id, _mod: mod, _dirty: false, _pdfId: loc ? loc._pdfId : d._pdfId });
          if(i >= 0) lista[i] = d; else lista.push(d); cambio = true;
        } else if(!loc._driveId){ loc._driveId = f.id; }
      }
      // 3. borrados en otro dispositivo
      const ids = new Set(rem.map(f => f.id)), antes = lista.length;
      lista = lista.filter(x => !(x._driveId && !x._dirty && !ids.has(x._driveId)));
      if(lista.length !== antes) cambio = true;
      // 4. subir lo guardado acá
      for(const x of lista.filter(y => y._dirty || !y._driveId)){ /* también los guardados antes de conectar Drive */
        const limpio = Object.assign({}, x); delete limpio._dirty; delete limpio._driveId;
        const otro = rem.find(f => f.appProperties && f.appProperties.id === x.id);
        x._driveId = await N.subir({ id: x._driveId || (otro && otro.id), name: nombreArchivo(x) + '.json', mime: 'application/json',
          data: JSON.stringify(limpio), props: { bae: 'presu', id: x.id, mod: String(x._mod || Date.now()) } });
        x._dirty = false; cambio = true;
      }
      // 5. PDF descargados
      if(pdfPend.length){
        const pdfs = await N.listar('pdf');
        for(const p of pdfPend.slice()){
          const x = lista.find(y => y.id === p.id), prev = pdfs.find(f => f.appProperties && f.appProperties.id === p.id);
          const pid = await N.subir({ id: (prev && prev.id) || (x && x._pdfId), name: p.name, mime: 'application/pdf', data: p.blob, props: { bae: 'pdf', id: p.id } });
          if(x){ x._pdfId = pid; } pdfPend = pdfPend.filter(y => y !== p);
        }
      }
      // 6. contador y "Mis precios" compartidos
      const cf = (await N.listar('cfg'))[0]; let rc = cf ? await N.bajar(cf.id) : null;
      const maxLista = Math.max(0, ...lista.map(x => parseInt(String(x.numero).split('-').pop(), 10) || 0));
      const ultimo = Math.max(+cfg.ultimo || 0, rc ? +rc.ultimo || 0 : 0, maxLista);
      if(rc && (+rc.preciosMod || 0) > preciosMod && Array.isArray(rc.precios)){ precios = rc.precios; preciosMod = +rc.preciosMod; store.set('bae.presu.precios', precios); store.set('bae.presu.preciosMod', preciosMod); cambio = true; }
      if(ultimo !== +cfg.ultimo){ cfg.ultimo = ultimo; store.set('bae.presu.cfg', cfg); }
      if(!rc || +rc.ultimo !== ultimo || (+rc.preciosMod || 0) < preciosMod){
        await N.subir({ id: cf && cf.id, name: 'bae-config.json', mime: 'application/json', data: JSON.stringify({ ultimo, precios, preciosMod }), props: { bae: 'cfg' } });
      }
      // si el formulario está vacío y su número ya se usó en otro dispositivo, paso al siguiente
      if(vacio() && !lista.some(x => x.id === P.id) && (parseInt(String(P.numero).split('-').pop(), 10) || 0) <= ultimo){ P.numero = nuevoNumero(); guardarActual(); cambio = true; }
      store.set('bae.presu.lista', lista); store.set('bae.drive.ult', Date.now());
      sinc = { txt: '', err: false };
    }catch(e){
      if(e.code === 'TOKEN') estado('La conexión con Drive venció: tocá "Sincronizar".', true);
      else if(!navigator.onLine) estado('Sin internet: se sube a Drive cuando vuelva la conexión.');
      else estado('No se pudo sincronizar: ' + e.message + '.', true);
      store.set('bae.presu.lista', lista);
    }finally{
      sincronizando = null;
      if(cambio || !sinc.err) refrescarLista(); else { const t = $('#pzNubeTxt', v); if(t) t.textContent = sinc.txt; }
      if(otraVez){ otraVez = false; sincronizar(false); }
    }
  })();
  return sincronizando;
}
if(N){
  N.onCambio(() => { if(location.hash === '#presu' && !editando()) render(); });
  window.addEventListener('online', () => sincronizar(false));
  v.addEventListener('click', e => {
    if(e.target.id === 'pzSync'){ sincronizar(true); }
    if(e.target.id === 'pzSalir'){ e.preventDefault(); N.salir(); location.reload(); }
  });
}
window.__presu = { letras, enPesos, get P(){ return P; }, set P(x){ P = x; render(); }, pdf };
render();
APP.route();
if(location.hash === '#presu') setTimeout(() => sincronizar(false), 300);
})();
