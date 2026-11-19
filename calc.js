/* Calculadoras de obra — BAE Servicios de Instalaciones
   Valores orientativos: verificar siempre con la edición vigente de AEA 90364. */
(function(){
'use strict';
const APP = window.__app; if(!APP) return;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const n = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(x) ? 0 : x; };
const f = (x, d = 1) => Number(x).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
const store = { get(k, d){ try{ const x = localStorage.getItem(k); return x ? JSON.parse(x) : d; }catch(e){ return d; } }, set(k, x){ try{ localStorage.setItem(k, JSON.stringify(x)); }catch(e){} } };

// Corrientes admisibles orientativas (A), cobre, aislación PVC 70 °C, 30 °C ambiente, en cañería embutida (IEC 60364-5-52, método B1)
const SECC = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
const IZ2 = [17.5, 24, 32, 41, 57, 76, 101, 125, 151, 192, 232, 269];   // 2 conductores cargados (monofásico)
const IZ3 = [15.5, 21, 28, 36, 50, 68, 89, 110, 134, 171, 207, 239];     // 3 conductores cargados (trifásico)
const IN = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250];
const MIN = { iug: 1.5, tug: 2.5, esp: 2.5, secc: 4 };
const RHO = 0.0225; // Ω·mm²/m, cobre a temperatura de servicio

const v = document.createElement('div'); v.className = 'view'; v.id = 'view-calc'; v.hidden = true; APP.main.appendChild(v);
APP.VIEWS.calc = { el: v, title: 'Calculadoras', sub: 'Cuentas rápidas de obra. Valores orientativos: verificalos con tu edición de AEA 90364.' };
const css = document.createElement('style');
css.textContent = `
  #view-calc .tabs-c{display:flex;gap:6px;background:var(--neutral-bg);padding:4px;border-radius:12px;margin-bottom:14px}
  #view-calc .tabs-c button{flex:1;border:none;background:none;padding:9px 6px;border-radius:9px;font-size:14px}
  #view-calc .tabs-c button.on{background:var(--card);box-shadow:0 1px 4px rgba(0,0,0,.12)}
  #view-calc .seg{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
  #view-calc .seg button{padding:7px 12px;border-radius:999px;font-size:13.5px}
  #view-calc .seg button.on{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
  #view-calc .res{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:14px}
  @media (min-width:700px){#view-calc .res{grid-template-columns:repeat(4,1fr)}}
  #view-calc .res div{padding:12px 14px;border-radius:12px;background:var(--neutral-bg);display:grid;gap:2px}
  #view-calc .res div.acc{background:var(--accent);color:var(--accent-ink)}
  #view-calc .res span{font-size:12px;opacity:.8}
  #view-calc .res b{font-size:20px}
  #view-calc .res small{font-size:11.5px;opacity:.8}
  #view-calc .nota{font-size:12.5px;color:var(--muted);margin:12px 0 0;line-height:1.45}
  #view-calc .aviso{margin-top:10px;padding:10px 12px;border-radius:10px;font-size:13.5px;background:#fde68a;color:#7c4a03}
  #view-calc label.lbl{display:block;font-size:13px;color:var(--muted);margin-top:12px}`;
document.head.appendChild(css);

let tab = store.get('bae.calc.tab', 'cable');
let c = Object.assign({ sis: 'mono', modo: 'w', p: '2200', i: '', cos: '0.9', l: '25', du: '3', tipo: 'tug' }, store.get('bae.calc.cable', {}));
let g = Object.assign({ cub: '', semi: '' }, store.get('bae.calc.grado', {}));

function calcCable(){
  const U = c.sis === 'tri' ? 380 : 220, cos = Math.min(1, Math.max(0.1, n(c.cos) || 1));
  const Ib = c.modo === 'a' ? n(c.i) : (c.sis === 'tri' ? n(c.p) / (Math.sqrt(3) * U * cos) : n(c.p) / (U * cos));
  const L = n(c.l), duMax = n(c.du) || 3, k = c.sis === 'tri' ? Math.sqrt(3) : 2, IZ = c.sis === 'tri' ? IZ3 : IZ2;
  const sCaida = Ib && L ? k * RHO * L * Ib * cos / (U * duMax / 100) : 0;
  let idx = SECC.findIndex((s, j) => s >= MIN[c.tipo] && s >= sCaida && IZ[j] >= Ib);
  if(idx < 0) idx = SECC.length - 1;
  // térmica: Ib ≤ In ≤ Iz; si no hay, se sube la sección
  let In = null;
  for(let j = idx; j < SECC.length; j++){ In = IN.find(x => x >= Ib && x <= IZ[j]); if(In){ idx = j; break; } }
  const S = SECC[idx], du = Ib && L ? 100 * k * RHO * L * Ib * cos / (S * U) : 0;
  return { U, Ib, sCaida, S, Iz: IZ[idx], In, du, duMax };
}
function calcGrado(){
  const sup = n(g.cub) + n(g.semi) * 0.5;
  const G = sup <= 0 ? null : sup <= 60 ? ['Mínimo', 2, '3,7 kVA', '1 IUG + 1 TUG'] : sup <= 130 ? ['Medio', 3, '7 kVA', '1 IUG + 1 TUG + 1 de libre elección'] : sup <= 200 ? ['Elevado', 5, '11 kVA', '2 IUG + 2 TUG + 1 de libre elección'] : ['Superior', 6, 'más de 11 kVA', '2 IUG + 2 TUG + 2 de libre elección (según proyecto)'];
  return { sup, G };
}
function render(){
  const seg = (k, opts, obj) => `<div class="seg">${opts.map(([val, t]) => `<button type="button" data-seg="${k}" data-val="${val}" class="${obj[k] === val ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  let body = '';
  if(tab === 'cable'){
    const r = calcCable();
    body = `<section class="card"><h2>Sección de cable y térmica</h2>
      <label class="lbl">Sistema</label>${seg('sis', [['mono', 'Monofásico 220 V'], ['tri', 'Trifásico 380 V']], c)}
      <label class="lbl">Tipo de circuito</label>${seg('tipo', [['iug', 'Iluminación (IUG)'], ['tug', 'Tomas (TUG)'], ['esp', 'Uso especial / ACU'], ['secc', 'Línea seccional']], c)}
      <label class="lbl">La carga la conozco en</label>${seg('modo', [['w', 'Potencia (W)'], ['a', 'Corriente (A)']], c)}
      <div class="grid" style="margin-top:8px">
        ${c.modo === 'w' ? `<label>Potencia (W)<input data-c="p" value="${c.p}" inputmode="decimal"></label>` : `<label>Corriente (A)<input data-c="i" value="${c.i}" inputmode="decimal"></label>`}
        <label>Factor de potencia (cos φ)<input data-c="cos" value="${c.cos}" inputmode="decimal"></label>
        <label>Largo del circuito (m)<input data-c="l" value="${c.l}" inputmode="decimal"></label>
        <label>Caída de tensión admisible (%)<input data-c="du" value="${c.du}" inputmode="decimal"></label></div>
      <div class="res">
        <div><span>Corriente de proyecto</span><b>${f(r.Ib)} A</b><small>Ib</small></div>
        <div class="acc"><span>Sección recomendada</span><b>${f(r.S, r.S < 10 ? 1 : 0)} mm²</b><small>Iz ≈ ${f(r.Iz)} A</small></div>
        <div><span>Térmica sugerida</span><b>${r.In ? r.In + ' A' : '—'}</b><small>Ib ≤ In ≤ Iz</small></div>
        <div><span>Caída de tensión</span><b>${f(r.du, 2)} %</b><small>${f(r.du * r.U / 100, 1)} V · máx. ${f(r.duMax, 1)} %</small></div></div>
      ${r.sCaida > r.S ? '' : ''}${r.du > r.duMax + 1e-9 ? '<div class="aviso">Con la sección máxima de la tabla no se llega a la caída admisible: revisá el largo o dividí el circuito.</div>' : ''}
      ${!r.In ? '<div class="aviso">No hay una térmica estándar entre Ib e Iz: revisá la carga.</div>' : ''}
      <p class="nota">Sección mínima por caída: ${f(r.sCaida, 2)} mm² · mínima para ${({ iug: 'IUG', tug: 'TUG', esp: 'uso especial', secc: 'línea seccional' })[c.tipo]}: ${MIN[c.tipo]} mm².<br>
      Cobre con aislación PVC en cañería embutida (método B1 de IEC 60364-5-52), 30 °C. No incluye factores de agrupamiento ni de temperatura. Recordá el diferencial de 30 mA en circuitos terminales. Verificá con las tablas de tu edición de AEA 90364.</p></section>`;
  } else {
    const r = calcGrado();
    body = `<section class="card"><h2>Grado de electrificación (viviendas)</h2>
      <div class="grid"><label>Superficie cubierta (m²)<input data-g="cub" value="${g.cub}" inputmode="decimal"></label><label>Superficie semicubierta (m²)<input data-g="semi" value="${g.semi}" inputmode="decimal" placeholder="cuenta al 50 %"></label></div>
      ${r.G ? `<div class="res">
        <div class="acc"><span>Grado</span><b>${r.G[0]}</b><small>${f(r.sup, 0)} m² de cálculo</small></div>
        <div><span>Circuitos mínimos</span><b>${r.G[1]}</b><small>${r.G[3]}</small></div>
        <div><span>Demanda mínima (DPMS)</span><b>${r.G[2]}</b><small>potencia máxima simultánea</small></div></div>` : '<p class="nota">Cargá la superficie para ver el grado.</p>'}
      <p class="nota">Límites usados: mínimo hasta 60 m², medio hasta 130 m², elevado hasta 200 m², superior más de 200 m² (la semicubierta cuenta al 50 %). Son los criterios de la Sección 771 y ediciones anteriores de la 770: confirmalos con la AEA 90364-7-770 edición 2026 cuando la tengas.</p></section>`;
  }
  v.innerHTML = `<div class="tabs-c"><button data-tab="cable" class="${tab === 'cable' ? 'on' : ''}">Cable y térmica</button><button data-tab="grado" class="${tab === 'grado' ? 'on' : ''}">Grado de electrificación</button></div>${body}`;
  $$('[data-tab]', v).forEach(b => b.onclick = () => { tab = b.dataset.tab; store.set('bae.calc.tab', tab); render(); });
  $$('[data-seg]', v).forEach(b => b.onclick = () => { c[b.dataset.seg] = b.dataset.val; store.set('bae.calc.cable', c); render(); });
  const vivo = (sel, obj, key) => $$(sel, v).forEach(el => el.addEventListener('input', () => { obj[el.dataset[key]] = el.value; store.set(key === 'c' ? 'bae.calc.cable' : 'bae.calc.grado', obj); actualizar(); }));
  vivo('[data-c]', c, 'c'); vivo('[data-g]', g, 'g');
}
// recalcula sin perder el foco del campo
function actualizar(){
  const a = document.activeElement, key = a && (a.dataset.c || a.dataset.g), pos = a && a.selectionStart;
  render();
  if(key){ const el = $(`[data-c="${key}"], [data-g="${key}"]`, v); if(el){ el.focus(); try{ el.setSelectionRange(pos, pos); }catch(e){} } }
}
window.addEventListener('hashchange', () => { if(location.hash === '#calc') render(); });
render();
window.__calc = { calcCable: () => calcCable(), set(x){ Object.assign(c, x); render(); }, setG(x){ Object.assign(g, x); render(); }, calcGrado: () => calcGrado() };
APP.route();
})();
