/* Módulo Gas — NAG-200: cálculo de cañerías, isométrica, ventilaciones, prueba, control de obra, materiales y memoria técnica.
   Integrado a BAE Servicios de Instalaciones: proyectos guardados en Drive (carpeta "BAE Gas"), clientes y presupuesto. */
(function(){
'use strict';
const APP = window.__app; if(!APP) return;
const DT = window.__dt || {};
const N = window.__nube;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num = v => { if(v === null || v === undefined || v === '') return null; const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.\-]/g, '')); return isNaN(n) ? null : n; };
const fmt = (v, d = 2) => v === null || v === undefined || isNaN(v) ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
};
function setMsg(el, t, err){ if(typeof el === 'string') el = $(el); if(!el) return; el.textContent = t; el.classList.toggle('err', !!err); }
function fmtDate(iso){ if(!iso) return ''; const p = String(iso).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso; }

/* ================= datos de la NAG-200 ================= */
// Apéndice 1, Tablas 3 (gas natural, densidad 0,65) y 4 (gas envasado, densidad 1,52): caudal en l/h para caída de 10 mm c.a.
const TAB = {"L":[2,3,4,5,6,7,8,9,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,55,60,65,70,75,80,85,90,95,100,110,120,130,140,150,160,170,180,190,200],"D":[9.5,13,19,25,32,38,51,63,76,101],"T3":[[1745,3580,9880,20260,35390,55825,114585,198300,312805,642055],[1425,2920,8065,16540,28895,45580,93560,161910,255405,524235],[1235,2530,6985,14325,25025,39475,81025,140220,221190,454000],[1105,2265,6250,12815,22385,35310,72470,125415,197835,406070],[1010,2065,5705,11695,20435,32230,66155,114490,180600,370690],[935,1915,5280,10830,18915,29840,61250,105995,167200,343190],[875,1790,4940,10130,17695,27915,57295,99150,156405,321025],[825,1685,4655,9550,16685,26315,54015,93480,147460,302665],[780,1600,4420,9060,15825,24965,51245,88685,139890,287135],[715,1460,4035,8270,14450,22790,46780,80955,127705,262115],[660,1350,3735,7655,13375,21100,43310,74950,118230,242675],[620,1265,3495,7160,12510,19740,40510,70110,110595,227000],[580,1195,3295,6755,11795,18610,38195,66100,104270,214020],[550,1130,3125,6405,11190,17655,36235,62710,98920,203035],[525,1080,2980,6110,10670,16830,34550,59790,94315,193585],[505,1035,2850,5850,10215,16115,33080,57245,90300,185345],[485,990,2740,5620,9815,15485,31780,55000,86755,178075],[465,955,2640,5415,9460,14920,30625,53000,83600,171595],[450,925,2550,5230,9140,14415,29585,51200,80765,165775],[435,895,2470,5065,8850,13955,28645,49575,78200,160515],[425,870,2395,4915,8585,13540,27790,48095,75865,155720],[410,845,2330,4775,8340,13160,27010,46740,73730,151335],[400,820,2265,4650,8120,12805,26290,45495,71765,147295],[390,800,2210,4530,7915,12485,25620,44340,69945,143565],[380,780,2155,4420,7725,12180,25005,43275,68260,140105],[370,765,2105,4320,7545,11900,24430,42280,66690,136885],[365,745,2060,4225,7380,11640,23895,41350,65225,133875],[355,730,2015,4135,7225,11395,23390,40480,63850,131060],[350,715,1975,4050,7080,11165,22915,39660,62560,128410],[335,680,1885,3865,6750,10645,21850,37815,59650,122435],[320,655,1805,3700,6460,10190,20920,36205,57110,117220],[305,630,1735,3555,6210,9795,20100,34785,54870,112625],[295,605,1670,3425,5980,9435,19370,33520,52875,108525],[285,585,1615,3310,5780,9115,18710,32380,51080,104845],[275,565,1560,3205,5595,8825,18120,31355,49460,101515],[270,550,1515,3110,5430,8565,17575,30420,47980,98485],[260,535,1475,3020,5275,8320,17080,29560,46630,95710],[255,520,1435,2940,5135,8100,16625,28775,45385,93160],[245,505,1395,2865,5005,7895,16205,28045,44240,90800],[235,480,1330,2730,4770,7530,15450,26740,42180,86575],[225,460,1275,2615,4570,7205,14795,25600,40385,82890],[215,445,1225,2515,4390,6925,14215,24595,38800,79635],[210,430,1180,2420,4230,6670,13695,23700,37390,76740],[200,415,1140,2340,4085,6445,13230,22900,36120,74140],[195,400,1105,2265,3955,6240,12810,22170,34975,71785],[190,390,1070,2195,3840,6055,12430,21510,33930,69640],[185,375,1040,2135,3730,5885,12080,20905,32975,67680],[180,365,1015,2080,3630,5730,11755,20345,32095,65875],[175,360,990,2025,3540,5585,11460,19830,31280,64205]],"T4":[[1030,2120,5895,12075,20920,33025,77325],[925,1895,5045,10780,18770,29485,60850],[780,1600,4455,9125,15795,24920,51290],[690,1420,3930,8060,13950,22015,45235],[650,1340,3735,7650,13265,20905,42975],[595,1230,3410,6975,12110,19085,39285],[555,1130,3160,6470,11200,17560,36305],[530,1095,3045,6245,10840,17060,35100],[505,1030,2880,5870,10530,16035,32950],[465,950,2640,5420,9380,14770,30370],[425,870,2415,4970,8630,13560,27895],[400,815,2260,4655,8060,12690,26115],[380,770,2155,4415,7850,12060,24780],[355,725,2020,4150,7190,11330,23305],[340,695,1940,3980,6895,10865,22325],[330,665,1865,3830,6625,10445,21480],[315,640,1785,3650,6320,9970,20500],[300,620,1720,3595,6105,9615,19795],[295,595,1670,3425,5925,9335,19205],[280,575,1605,3295,5715,9000,18520],[274,560,1565,3210,5560,8745,17845],[267,545,1525,3125,5405,8520,17535],[258,535,1475,3025,5245,8270,16990],[253,520,1445,2955,5095,8075,16580],[246,505,1405,2890,5005,7895,16230],[242,490,1375,2815,4870,7695,15795],[235,480,1340,2750,4770,7515,15475],[232,475,1290,2710,4690,7385,15190],[226,463,1265,2640,4565,7215,14800],[215,440,1230,2520,4350,6880,14180],[206,421,1180,2415,4185,6500,13580],[199,404,1130,2300,4010,6320,13085],[191,393,1090,2230,3875,6105,12580],[185,376,1055,2140,3740,5895,12115],[178,365,1020,2090,3620,5700,11725],[174,355,990,2015,3510,5585,11430],[169,347,964,1970,3425,5390,11090],[163,337,938,1910,3325,5280,10810],[160,328,912,1865,3245,5110,10530],[153,313,870,1785,3090,4870,10040],[146,300,821,1705,2960,4660,9590],[140,290,800,1640,2845,4490,9250],[134,278,772,1580,2735,4325,8885],[130,270,745,1530,2650,4180,8615],[126,258,720,1475,2560,4045,8310],[122,250,702,1430,2480,3915,8060],[119,244,680,1395,2415,3805,7975],[115,237,660,1355,2350,3705,7635],[112,232,646,1320,2290,3610,7470]]};
const PULG = { 9.5:'3/8"', 13:'1/2"', 19:'3/4"', 25:'1"', 32:'1 1/4"', 38:'1 1/2"', 51:'2"', 63:'2 1/2"', 76:'3"', 101:'4"' };
const dTxt = d => d ? `${String(d).replace('.', ',')} mm (${PULG[d]})` : '—';
// Tabla 18: longitudes equivalentes de accesorios a rosca, en diámetros
const EQ = { c90: 30, c45: 14, curva: 20, tt: 20, tf: 60, vm: 100, ve: 7, vg: 333, red: 10 };
const ACC = [['c90','Codo 90°'],['c45','Codo 45°'],['curva','Curva'],['red','Reducción'],['ve','Válv. esclusa']];
// Sigas Thermofusión (Manual técnico ed. 15-2026): Tablas 4 (GN, dens. 0,65) y 5 (envasado) en m³/h para 10 mm c.a.; Tabla 3 pérdidas en accesorios (m)
const SG = {
  D: [20,25,32,40,50,63,75,90,110], di: [13.24,18.19,24.94,33.00,42.80,54.84,63.00,74.00,94.00],
  L: [...Array.from({length:10}, (_, i) => i + 1), ...Array.from({length:20}, (_, i) => 12 + 2 * i), ...Array.from({length:30}, (_, i) => 55 + 5 * i)],
  C: { GN: [5.594,12.377,27.244,54.867,105.108,195.331,276.299,413.150,751.360], GLP: [3.658,8.094,17.816,35.880,68.734,127.734,180.682,270.173,491.341] },
  eq: { un: [.369,.242,.408,.237,.234,.162,.103,.206,.224], c45: [.519,.583,.668,.682,.315,.633,.845,.719,1.629], c90: [.953,.856,1.191,1.004,1.422,2.283,2.334,2.075,2.115],
    tf: [.771,.707,.928,.902,1.262,1.662,2.577,2.004,4.269], tt: [.392,.222,.235,.237,.27,.396,.829,.985,2.153], vm: [.678,.227,.327,1.159,.89,.78,.9,1.08,1.32],
    curva: [.476,.324,.383,1.004,1.422,2.283,2.334,2.075,2.115], red: [.329,.525,.506,.517,.817,.324,.283,.972,.972], term: [.651,.398,.543,.854,1.004,3.092,2.334,2.48,3.509] },
  fus: [[20,5,4,2,12],[25,7,4,2,13],[32,8,6,4,14],[40,12,6,4,16],[50,18,6,4,18],[63,24,8,6,24],[75,30,10,6,26],[90,35,12,8,29],[110,45,12,10,32]],
  prolL: [2,4,6,8,10,15,20,25,30,35,40,45,50,60,70,80,90,100],
  prol: [[1,1,'1',[25,25,25,25,25,32,32,32,32,32,32,32,32,32,40,40,40,40]],[2,2,'2',[25,25,25,32,32,32,32,32,32,40,40,40,40,40,40,40,40,40]],[3,3,'3',[25,25,32,32,32,32,32,40,40,40,40,40,40,40,40,40,40,50]],
    [4,4,'4',[25,32,32,32,32,32,40,40,40,40,40,40,40,40,50,50,50,50]],[5,5,'5',[25,32,32,32,32,40,40,40,40,40,40,40,50,50,50,50,50,50]],[6,8,'6 a 8',[32,32,40,40,40,40,40,50,50,50,50,50,50,50,50,50,63,63]],
    [9,11,'9 a 11',[32,40,40,40,40,50,50,50,50,50,50,50,50,63,63,63,63,63]],[12,14,'12 a 14',[32,40,40,40,50,50,50,50,50,63,63,63,63,63,63,63,63,63]],[15,17,'15 a 17',[40,40,40,50,50,50,50,63,63,63,63,63,63,63,63,63,75,75]],
    [18,20,'18 a 20',[40,40,50,50,50,50,63,63,63,63,63,63,63,63,75,75,75,75]],[21,25,'21 a 25',[40,50,50,50,50,63,63,63,63,63,63,75,75,75,75,75,90,90]],[26,30,'26 a 30',[40,50,50,50,63,63,63,63,75,75,75,75,75,75,90,90,90,90]],
    [31,35,'31 a 35',[50,50,50,63,63,63,63,75,75,75,75,90,90,90,90,90,90,110]],[36,40,'36 a 40',[50,50,63,63,63,63,75,75,75,90,90,90,90,90,90,110,110,110]],[41,45,'41 a 45',[50,63,63,63,63,75,75,75,90,90,90,90,90,110,110,110,110,110]],
    [46,50,'46 a 50',[50,63,63,63,63,75,75,90,90,90,90,90,110,110,110,110,110,110]],[51,60,'51 a 60',[50,63,63,75,75,90,90,90,90,110,110,110,110,110,110,110,110,110]],[61,70,'61 a 70',[63,63,75,75,75,90,90,110,110,110,110,110,110,110,110,110]],
    [71,80,'71 a 80',[63,63,75,75,90,90,110,110,110,110,110,110,110,110]],[81,90,'81 a 90',[63,75,75,90,90,110,110,110,110,110,110,110,110]],[91,100,'91 a 100',[63,75,90,90,90,110,110,110,110,110,110]]]
};
const MATS = { acero: 'Acero roscado (NAG-200)', sigas: 'Sigas Thermofusión' };
const isSg = g => (g && g.obra && g.obra.mat) === 'sigas';
let CUR_SG = false;
const dLab = d => !d ? '¿?' : CUR_SG ? 'Ø' + d : PULG[d];
const dTxtM = d => !d ? '—' : CUR_SG ? `Ø ${d} mm (di ${String(SG.di[SG.D.indexOf(d)]).replace('.', ',')})` : dTxt(d);
const GASES = { GN: { n: 'Gas natural', pc: 9300, tab: 'T3' }, GLP: { n: 'Gas envasado (propano)', pc: 22380, tab: 'T4' } };
// Tabla 1 (valores superiores de cada rango, kcal/h)
const PRESETS = [
  { k:'cocina', n:'Cocina con horno (4 hornallas)', kcal:9400, kind:'coccion', horno:true },
  { k:'anafe', n:'Anafe / cocina sin horno', kcal:5400, kind:'coccion' },
  ...[[5,5000],[8,12500],[10,16000],[12,19000],[14,22400],[16,25500]].map(([l,k]) => ({ k:'cal'+l, n:`Calefón ${l} l/min (cámara abierta)`, kcal:k, kind:'abierta', wh:true })),
  { k:'calTB', n:'Calefón tiro balanceado', kcal:22400, kind:'estanca', wh:true },
  ...[[50,5000],[75,6500],[110,8000],[150,9500]].map(([l,k]) => ({ k:'ter'+l, n:`Termotanque ${l} l (cámara abierta)`, kcal:k, kind:'abierta', wh:true })),
  ...[[2000,'estTB2'],[2500,'estTB25'],[3000,'estTB'],[3800,'estTB38'],[5000,'estTB5'],[6000,'estTB6'],[8000,'estTB8']].map(([k, key]) => ({ k:key, n:`Calefactor tiro balanceado ${k.toLocaleString('es-AR')} kcal/h`, kcal:k, kind:'estanca', heat:true })),
  { k:'estTN', n:'Calefactor tiro natural (conducto)', kcal:4500, kind:'abierta', heat:true },
  { k:'infra', n:'Calefactor infrarrojo', kcal:3000, kind:'infrarrojo', heat:true },
  { k:'calE', n:'Caldera cámara estanca', kcal:24000, kind:'estanca', cald:true },
  { k:'calA', n:'Caldera cámara abierta', kcal:24000, kind:'abierta', cald:true },
  { k:'aire', n:'Calefacción por aire caliente', kcal:20000, kind:'abierta', heat:true },
  { k:'hela', n:'Heladera a gas', kcal:340, kind:'sinconducto' },
  { k:'seca', n:'Secarropas', kcal:3000, kind:'sinconducto' },
  { k:'otro', n:'Otro artefacto', kcal:0, kind:'sinconducto' }
];
const PRE = Object.fromEntries(PRESETS.map(p => [p.k, p]));
const KINDS = [['coccion','Cocción (sin conducto)'],['abierta','Cámara abierta con conducto'],['estanca','Cámara estanca (balanceado)'],['sinconducto','Otro sin conducto'],['infrarrojo','Infrarrojo']];
const ATIPOS = [['cocina','Cocina'],['kitchenette','Espacio para cocinar'],['living','Living / comedor'],['dormitorio','Dormitorio'],['bano','Baño'],['paso','Paso / pasillo'],['lavadero','Lavadero'],['garaje','Garaje'],['sala','Local exclusivo / sala de máquinas'],['exterior','Patio / galería'],['subsuelo','Subsuelo'],['otro','Otro']];
const ATN = Object.fromEntries(ATIPOS);

/* ================= estado ================= */
const newGas = keep => ({
  obra: { cliente: '', dir: '', loc: keep ? keep.obra.loc : 'Zapala, Neuquén', fecha: new Date().toISOString().slice(0,10), gas: 'GN', pc: 9300, dmin: 13, tmin: keep ? keep.obra.tmin : '', distrib: keep ? keep.obra.distrib : '', obs: '' },
  amb: [], art: [], tr: [],
  prueba: { fecha: '', presion: '0,2 kg/cm² (200 g/cm²)', min: '15', mano: '', ini: '', fin: '', obst: '', vent: '', obs: '' },
  chk: {}, desperdicio: 10
});
let gas = store.get('gas.v1', null) || newGas();
const save = () => store.set('gas.v1', gas);
let uid = Date.now() % 100000;
const nid = p => p + (uid++).toString(36);

function ejemplo(){
  const g = newGas(gas);
  g.obra.cliente = 'Ejemplo NAG-200 — 5.10 Ej. 1'; g.obra.dir = 'Cocina 0,8 m³/h y calefón 2 m³/h';
  g.amb = [{ id:'a1', n:'Cocina', t:'cocina', l:'3', a:'3', h:'2,6' }, { id:'a2', n:'Lavadero', t:'lavadero', l:'2', a:'1,5', h:'2,6' }];
  g.art = [
    { id:'r1', p:'otro', n:'Calefón', kcal:'18600', kind:'abierta', wh:true, amb:'a2', nodo:'2' },
    { id:'r2', p:'otro', n:'Cocina', kcal:'7440', kind:'coccion', horno:true, amb:'a1', nodo:'1' }
  ];
  g.tr = [
    { id:'t1', de:'M', a:'A', L:'6', rec:'E 4 / N 2', c90:'2', c45:'', curva:'', red:'', ve:'', te:'' },
    { id:'t2', de:'A', a:'2', L:'35', rec:'N 20 / E 13 / U 2', c90:'2', c45:'2', curva:'', red:'', ve:'', te:'tt' },
    { id:'t3', de:'A', a:'1', L:'5', rec:'E 4 / U 1', c90:'2', c45:'', curva:'', red:'', ve:'', te:'tf' }
  ];
  return g;
}

/* ================= cálculo de cañerías ================= */
const nodeKey = s => String(s ?? '').trim().toUpperCase();
function parseRec(rec, L){
  const segs = []; const re = /([ENSOUDB])\s*([\d]+(?:[.,]\d+)?)/gi; let m;
  while((m = re.exec(String(rec || '')))){ let d = m[1].toUpperCase(); if(d === 'B') d = 'D'; segs.push({ d, L: num(m[2]) }); }
  if(!segs.length) segs.push({ d: 'E', L: L || 1 });
  return segs;
}
function realLen(t){ const L = num(t.L); if(L !== null) return L; const s = parseRec(t.rec, null).filter(x => x.L); return s.length && String(t.rec || '').trim() ? s.reduce((a, b) => a + b.L, 0) : null; }

function calc(g){
  const kind = g.obra.gas === 'GLP' ? 'GLP' : 'GN';
  const sg = isSg(g); CUR_SG = sg;
  const T = TAB[GASES[kind].tab], D = sg ? SG.D : kind === 'GLP' ? TAB.D.slice(0, 7) : TAB.D;
  const LR = sg ? SG.L : TAB.L;
  const qTab = sg ? (ri, j) => Math.round(SG.C[kind][j] / Math.sqrt(SG.L[ri]) * 1000) : (ri, j) => T[ri][j];
  const pc = num(g.obra.pc) || GASES[kind].pc, dmin = num(g.obra.dmin) || 0;
  const C = sg ? SG.C[kind].map(c => c * 1000) : D.map((d, j) => { const v = TAB.L.map((L, i) => T[i][j] * Math.sqrt(L)); return v.reduce((a, b) => a + b, 0) / v.length; });
  const sgEq = (k, d) => { const j = SG.D.indexOf(d); if(j < 0) return 0; if(k === 've') return 7 * SG.di[j] / 1000; return (SG.eq[k] || SG.eq.c90)[j]; };
  const unions = t => sg && t.L ? Math.max(0, Math.ceil(t.L / 4 - 1e-9) - 1) : 0;
  const err = [], warn = [];
  const tr = g.tr.map((t, i) => ({ src: t, i, from: nodeKey(t.de), to: nodeKey(t.a), L: realLen(t), name: (nodeKey(t.de) || '?') + '–' + (nodeKey(t.a) || '?') }));
  const byTo = {};
  tr.forEach(t => {
    if(!t.from || !t.to){ err.push(`Tramo ${t.i + 1}: falta el nodo de inicio o de fin.`); return; }
    if(t.to === 'M'){ err.push(`Tramo ${t.name}: el medidor (M) solo puede ser inicio.`); return; }
    if(byTo[t.to]){ err.push(`El nodo ${t.to} recibe dos tramos (${byTo[t.to].name} y ${t.name}). Cada nodo se alimenta de un solo tramo.`); return; }
    if(t.L === null || t.L <= 0) err.push(`Tramo ${t.name}: falta la longitud real.`);
    byTo[t.to] = t;
  });
  const parent = t => t.from === 'M' ? null : byTo[t.from] || undefined;
  tr.forEach(t => { if(!byTo[t.to] || byTo[t.to] !== t) return; const seen = new Set(); let p = t; while(p){ if(seen.has(p)){ err.push(`Hay un circuito cerrado en ${t.name}.`); t.loop = true; break; } seen.add(p); const q = parent(p); if(q === undefined){ err.push(`El tramo ${t.name} no llega al medidor: no hay ningún tramo que termine en ${p.from}.`); t.orphan = true; break; } p = q; } });
  const ok = t => byTo[t.to] === t && !t.loop && !t.orphan;
  const pathTo = node => { const out = []; let t = byTo[node]; while(t){ out.unshift(t); t = parent(t); } return out; };
  const arts = g.art.map((a, i) => {
    const kcal = num(a.kcal) || 0, q = kcal / pc, node = nodeKey(a.nodo);
    const o = { src: a, i, kcal, q, node, name: a.n || ('Artefacto ' + (i + 1)), path: [] };
    if(!node) err.push(`${o.name}: indicá en qué nodo se conecta.`);
    else if(!byTo[node] || !ok(byTo[node])) err.push(`${o.name}: no hay un tramo válido que termine en el nodo ${node}.`);
    else o.path = pathTo(node);
    if(!kcal) warn.push(`${o.name}: falta el consumo en kcal/h.`);
    return o;
  });
  tr.forEach(t => { t.Q = 0; t.arts = []; t.d = null; t.Lc = 0; });
  arts.forEach(a => a.path.forEach(t => { t.Q += a.q; t.arts.push(a); }));
  const dm = d => (d || 0) / 1000;
  const eqK = (k, d) => sg ? sgEq(k, d) : EQ[k] * dm(d);
  const eqT = t => { let e = unions(t) * (sg ? sgEq('un', t.d) : 0); ACC.forEach(([k]) => e += (num(t.src[k]) || 0) * eqK(k, t.d)); const p = parent(t); if(t.src.te && p) e += eqK(t.src.te, p.d); return e; };
  const eqA = a => { if(!a.path.length) return 0; const d = a.path[a.path.length - 1].d; return sg ? sgEq('vm', d) + sgEq('term', d) : EQ.vm * dm(d); };
  const pick = (Q, Lc) => {
    const ri = LR.findIndex(L => L >= Lc - 1e-9); if(ri < 0) return { d: null, ri: -1, why: 'L' };
    for(let j = 0; j < D.length; j++){ if(D[j] < dmin - 1e-9) continue; if(qTab(ri, j) >= Q * 1000 - 1e-9) return { d: D[j], j, ri }; }
    return { d: null, ri, why: 'Q' };
  };
  let first = null;
  for(let it = 0; it < 10; it++){
    arts.forEach(a => { a.Ltot = a.path.reduce((s, t) => s + (t.L || 0) + (it ? eqT(t) : 0), 0) + (it ? eqA(a) : 0); });
    let changed = false;
    tr.filter(ok).forEach(t => {
      t.Lc = t.arts.length ? Math.max(...t.arts.map(a => a.Ltot)) : pathTo(t.to).reduce((s, x) => s + (x.L || 0), 0);
      const r = t.Q > 0 ? pick(t.Q, t.Lc) : { d: D.find(d => d >= dmin) || D[0], ri: LR.findIndex(L => L >= t.Lc), j: D.findIndex(d => d >= dmin) };
      if(r.d !== t.d) changed = true;
      Object.assign(t, { d: r.d, j: r.j, ri: r.ri, why: r.why });
    });
    if(it === 0) first = new Map(tr.map(t => [t, t.d]));
    if(it > 0 && !changed) break;
  }
  let maxDrop = 0, crit = null;
  tr.filter(ok).forEach(t => {
    t.d0 = first.get(t); t.eq = eqT(t);
    t.Lrow = t.ri >= 0 ? LR[t.ri] : null; t.un = unions(t);
    t.Qadm = t.d && t.ri >= 0 ? qTab(t.ri, t.j) / 1000 : null;
    t.margen = t.Qadm && t.Q ? t.Qadm / t.Q - 1 : null;
    t.h = t.d && t.Q ? 10 * ((t.L || 0) + t.eq) * Math.pow(t.Q * 1000 / C[t.j], 2) : 0;
    if(!t.d && t.Q > 0) err.push(t.why === 'L' ? `Tramo ${t.name}: la longitud de cálculo (${fmt(t.Lc,1)} m) supera los 200 m de la tabla.` : `Tramo ${t.name}: ${fmt(t.Q,2)} m³/h no pasa ni por ${dLab(D[D.length-1])} a ${fmt(t.Lc,1)} m.`);
    if(!t.Q) warn.push(`Tramo ${t.name}: no alimenta ningún artefacto (¿toma taponada para futuro?). Se dejó el diámetro mínimo.`);
    if(t.margen !== null && t.margen < 0.03) warn.push(`Tramo ${t.name}: caso límite (margen ${fmt(t.margen * 100, 1)} %). Verificalo en la tabla impresa.`);
    t.ex = t.src.est === 'ex'; t.dex = num(t.src.dex);
    if(t.ex && t.d && t.dex && t.dex + 1e-9 < t.d) err.push(`Tramo ${t.name} (existente): la cañería de ${dLab(t.dex)} no alcanza con la carga nueva; requiere ${dLab(t.d)}. Hay que reemplazarlo o buscar otro recorrido.`);
    if(t.ex && !t.dex) warn.push(`Tramo ${t.name} (existente): indicá el diámetro existente para verificarlo.`);
    const p = parent(t); if(p && p.d && t.d && t.d > p.d) warn.push(`Tramo ${t.name}: es más grueso (${dLab(t.d)}) que el tramo que lo alimenta (${dLab(p.d)}). Conviene igualar el anterior.`);
  });
  arts.forEach(a => {
    if(!a.path.length) return;
    const last = a.path[a.path.length - 1];
    a.dLlave = last.d;
    a.drop = a.path.reduce((s, t) => s + (t.h || 0), 0) + (last.d ? 10 * eqA(a) * Math.pow(a.q * 1000 / C[last.j], 2) : 0);
    if(a.drop > maxDrop){ maxDrop = a.drop; crit = a; }
  });
  if(sg && D.indexOf(dmin) < 0 && dmin) warn.push('El diámetro mínimo elegido no existe en Sigas: se usa desde 20 mm.');
  if(maxDrop > 10 + 1e-6) err.push(`Caída de presión estimada hasta ${crit.name}: ${fmt(maxDrop,1)} mm c.a. (máx. 10 mm, 5.2.8 c).`);
  const valid = tr.filter(ok);
  return { kind, pc, D, sg, tr, valid, arts, err, warn, maxDrop, crit, totalKcal: arts.reduce((s, a) => s + a.kcal, 0), totalQ: arts.reduce((s, a) => s + a.q, 0), parent, byTo, children: n => valid.filter(t => t.from === n) };
}

/* ================= ventilaciones y ubicación (cap. VI y VII) ================= */
function vent(g, C){
  const tmin = num(g.obra.tmin);
  const volOf = a => { const l = num(a.l), w = num(a.a), h = num(a.h); return l && w && h ? l * w * h : null; };
  const volDormPaso = g.amb.filter(a => a.t === 'dormitorio' || a.t === 'paso').reduce((s, a) => s + (volOf(a) || 0), 0);
  return g.amb.map(am => {
    const vol = volOf(am), msgs = [];
    const add = (lvl, t) => msgs.push({ lvl, t });
    const arts = C.arts.filter(a => a.src.amb === am.id);
    const nombre = am.n || ATN[am.t] || 'Ambiente';
    let entrada = 0, salida = 0, superior = 0;
    const noConn = arts.filter(a => a.src.kind === 'coccion' || a.src.kind === 'sinconducto');
    const conn = arts.filter(a => a.src.kind === 'abierta');
    const ir = arts.filter(a => a.src.kind === 'infrarrojo');
    // Tabla 7.5.2 — entrada de aire (≤ 0,30 m del piso), el más exigente
    noConn.forEach(a => entrada = Math.max(entrada, a.src.kind === 'coccion' && a.src.horno ? 100 : 50));
    conn.forEach(a => { if(a.kcal > 40000) add('warn', `${a.name}: más de 40.000 kcal/h, consultar a la distribuidora (7.5.2).`); entrada = Math.max(entrada, a.kcal <= 10000 ? 50 : 50 + Math.ceil((a.kcal - 10000) / 1000) * 3); });
    // Tabla 7.5.1 — salida de aire viciado (≥ 1,80 m)
    if(noConn.length){
      const coc = noConn.some(a => a.src.kind === 'coccion');
      if(am.t === 'cocina' || am.t === 'kitchenette' || coc) salida = noConn.every(a => a.src.kind === 'coccion') ? 100 : 150;
      else salida = noConn.length === 1 ? 50 : 150;
    }
    // infrarrojos (6.7.4.1)
    if(ir.length){
      const pot = ir.reduce((s, a) => s + a.kcal, 0);
      ir.forEach(a => { const k = a.kcal; let i = k <= 3000 ? 50 : k <= 6000 ? 75 : 100, s = k <= 3000 ? 75 : k <= 6000 ? 100 : 150; if(k > 10000){ i += Math.ceil((k - 10000) / 1000) * 10; s += Math.ceil((k - 10000) / 1000) * 15; } entrada += i; superior += s; });
      if(vol !== null && vol < 15) add('bad', `Infrarrojo en un ambiente de ${fmt(vol,1)} m³: el mínimo es 15 m³ (6.7.4.1).`);
      if(vol && pot > 50 * vol) add('bad', `Infrarrojos: ${fmt(pot,0)} kcal/h superan 50 kcal/h·m³ (máx. ${fmt(50 * vol,0)} kcal/h para ${fmt(vol,1)} m³).`);
      add('info', 'Infrarrojo: dispositivo de seguridad por falta de llama obligatorio y chapa litografiada junto a cada abertura.');
      if(am.t === 'paso') add('bad', 'No se pueden instalar infrarrojos en pasos comunicados con dormitorios (6.7 h).');
    }
    // ubicación
    arts.forEach(a => {
      const k = a.src.kind;
      if((am.t === 'dormitorio' || am.t === 'bano') && k !== 'estanca') add('bad', `${a.name}: en ${am.t === 'bano' ? 'baños' : 'dormitorios'} solo se admiten artefactos de cámara estanca (6.7 g, 6.7.4 b).`);
      if(a.src.cald && am.t === 'dormitorio') add('bad', `${a.name}: las calderas no se instalan en dormitorios (6.7.3.2).`);
      if(a.src.cald && k === 'abierta'){
        if(am.t === 'paso' || am.t === 'bano') add('bad', `${a.name}: caldera de cámara abierta no permitida en pasos ni baños (6.7.3.2).`);
        if(am.t === 'cocina'){ const need = a.kcal <= 15000 ? 15 : a.kcal <= 20000 ? 20 : a.kcal <= 25000 ? 25 : a.kcal <= 30000 ? 30 : 40; if(vol !== null && vol < need) add('bad', `${a.name}: en cocina necesita ≥ ${need} m³ (tiene ${fmt(vol,1)} m³, 6.7.3.2).`); }
      }
      if(a.src.wh && k === 'abierta'){
        if(am.t === 'cocina' && vol !== null && vol < 7) add('bad', `${a.name}: en cocina el volumen mínimo es 7 m³ (tiene ${fmt(vol,1)} m³, 6.7.3 a).`);
        if(am.t === 'kitchenette'){ if(a.kcal > 9000) add('bad', `${a.name}: en espacio para cocinar el máximo es 9.000 kcal/h (6.7.3 b).`); if(vol !== null && vol < 30) add('bad', `${a.name}: el ambiente debe tener ≥ 30 m³ (6.7.3 b).`); add('info', 'Calentador en espacio para cocinar: seguridad por falta de llama y ventilación a los cuatro vientos.'); }
        add('info', `${a.name}: quemador entre 1,50 y 1,80 m del piso y nunca sobre piletas, cocinas o lavabos (6.7.3.1).`);
      }
      if(k === 'abierta' && a.kcal > 10000) add('info', `${a.name}: más de 10.000 kcal/h, conducto a los cuatro vientos con sombrerete 0,30 m sobre parapetos en 1 m de radio (7.6 f).`);
      if(k === 'abierta' && am.t === 'paso' && a.src.heat){
        const max = 50 * volDormPaso + (tmin !== null && tmin < 0 ? 2.5 * -tmin * volDormPaso : 0);
        if(volDormPaso && a.kcal > max) add('bad', `${a.name}: en paso el máximo es ${fmt(max,0)} kcal/h (50 kcal/h·m³ de dormitorios + paso = ${fmt(volDormPaso,1)} m³${tmin < 0 ? ', con +2,5 por °C bajo cero' : ''}, 6.7 h).`);
        add('info', 'Estufa en paso: rejilla de 300 cm² hacia el ambiente contiguo (tercio inferior), seguridad por falta de llama e instalada antes de la inspección (6.7 h).');
      }
      if(am.t === 'garaje' && k !== 'estanca') add('info', `${a.name}: quemador y piloto a ≥ 0,15 m sobre el cordón de vereda; ventilación permanente; protegido de vehículos (6.7 e).`);
      if(am.t === 'subsuelo' && C.kind === 'GLP') add('bad', `${a.name}: con gas envasado (densidad > 1) no se instalan artefactos en subsuelos (6.7 d).`);
      if(a.src.p === 'seca' && !['lavadero','cocina','exterior'].includes(am.t)) add('bad', `${a.name}: los secarropas se instalan solo en lavaderos, cocinas o patios semicubiertos (6.7.5).`);
    });
    if(am.t === 'kitchenette' && arts.length){ salida = Math.max(salida, 100); add('info', 'Espacio para cocinar: ventilación mínima de 0,10 × 0,10 m al exterior y chapa "Mantener cerrada esta llave cuando el ambiente contiguo se utilice como dormitorio" (6.7.1.1).'); }
    if(!arts.length) add('info', 'Sin artefactos asignados.');
    return { am, nombre, vol, arts, entrada, salida, superior, msgs };
  });
}

/* ================= checklist ================= */
const CHK_ACERO = [
  ['mat','Caños, accesorios y llaves aprobados (IRAM 2502 o sistema aprobado por ENARGAS); nada reutilizado sin inspección','5.2.1 / 5.2.2'],
  ['ros','Roscas cónicas bien talladas, con los filetes de la tabla 5.2.6','5.2.6'],
  ['sel','Sellador anaeróbico de roscas aprobado (NAG-214), lote y vencimiento a la vista; sin litargirio con glicerina, cáñamo ni pintura','5.2.7 / Res. ENARGAS 395/2024'],
  ['lla','Una llave de paso por artefacto, del mismo diámetro que la cañería, accesible y en el mismo local','5.2.4 / 5.2.8'],
  ['udo','Unión doble de asiento cónico después de cada llave; ninguna unión doble en el recorrido','5.2.5'],
  ['flx','Flexible de cobre IRAM 2568 de 0,50 m como máximo y artefacto fijado','5.2.2 / 6.6 b'],
  ['ent','Cañería enterrada a ≥ 0,30 m, de hierro negro con protección anticorrosiva','5.4 a / 5.6'],
  ['pen','Pendiente ≥ 1 % hacia el medidor y sifones accesibles','5.4.1 / 5.4.2'],
  ['ale','Lejos de conductores eléctricos y canillas; no cruza ni entra en chimeneas','5.4 d, e / 5.7'],
  ['sop','Cañería engrapada y soportada','5.5'],
  ['apr','Artefactos aprobados con chapa de identificación y sello visibles','6.1 / 6.4'],
  ['cam','Ningún artefacto de cámara abierta en dormitorios ni baños','6.7 g / 6.7.4 b'],
  ['coc','Llave de la cocina a un lado de la plancha (o ≥ 0,40 m sobre ella); paredes y piso incombustibles','6.7.1'],
  ['cal','Calefón con quemador entre 1,50 y 1,80 m y fuera de piletas, cocinas y lavabos','6.7.3.1'],
  ['con','Conducto del mismo diámetro que la salida del artefacto, sin angostamientos; pendiente 4 % en horizontales; vertical ≥ 1,5 × horizontal','7.6 a-c'],
  ['som','Sombrerete a ≥ 0,50 m de puertas y ventanas; a los cuatro vientos si supera 10.000 kcal/h','7.6 f-h'],
  ['cmb','Conducto a más de 0,15 m de material combustible','7.6 i'],
  ['rej','Rejillas fijas: entrada a ≤ 0,30 m del piso y salida a ≥ 1,80 m; con chapa de leyenda donde corresponda','7.5 / 6.7'],
  ['gas','Salida de gases quemados a ≥ 0,50 m de aberturas (0,20 m de ventanas en cámara estanca)','6.7 j'],
  ['pru','Pruebas de hermeticidad (15 min sin variación), obstrucción y ventilación','8.6.5']
];
const CHK_SIGAS = [
  ['sgc','Instalador con credencial del curso Grupo Dema (nivel 1 hasta 63 mm, nivel 2 para 75 a 110 mm)','Res. ENARGAS 3251/2005 art. 8'],
  ['sgm','Tubos y accesorios todos Sigas: sin mezclar con otras marcas ni otros sistemas acero-polietileno','Actuados ENARGAS 3990/2013 y 3546/2015'],
  ['sge','En ambientes habitables, embutida (contrapiso, mampostería o roca de yeso); nunca a la vista en cocinas, lavaderos, dormitorios, estar, comedor ni garaje de vivienda unifamiliar','NAG-E 210 / Manual p. 15'],
  ['sgf','Fijada con mortero 1:3 cada 1,5 a 2 m; sostenes a ≥ 0,20 m de cualquier accesorio','Manual p. 15'],
  ['sga','Conexión al artefacto desde codo terminal fusión-rosca con tubería metálica aprobada o flexible aprobado','Manual p. 16'],
  ['sgu','A la intemperie, protegida contra UV (cinta de aluminio o vaina Sigas)','Manual p. 18'],
  ['sgd','Sin tubos doblados: desvíos solo con codos de 90° y 45°','Manual p. 31'],
  ['sgr','Reducciones inmediatamente después de una te de derivación','Manual p. 28 / NAG-200'],
  ['sgt','Termofusor a temperatura (245 a 275 °C, luz verde), tiempos de calentamiento e inserción de la tabla 1 y 2','Manual p. 12'],
  ['sgv','Fusiones: dos cordones ≤ 2 mm, escurrimiento ≤ 5 mm (15 mm de 75 a 110), separación de anillos ≤ 3 mm, desalineación ≤ 8 cm/m, sin contaminación','Manual p. 32 a 34'],
  ['sgn','Separación entre accesorios ≥ 1 diámetro (niples) o niples con tope','Manual p. 34'],
  ['sgp','Antes de la prueba se verificó flujo libre en cada punto; llaves esféricas probadas con su propia manija','Manual p. 17'],
  ['sel','Uniones roscadas con sellador anaeróbico aprobado (NAG-214) y dos llaves de fuerza','5.2.7 / Manual p. 31'],
  ['apr','Artefactos aprobados con chapa de identificación y sello visibles','6.1 / 6.4'],
  ['cam','Ningún artefacto de cámara abierta en dormitorios ni baños','6.7 g / 6.7.4 b'],
  ['con','Conducto del mismo diámetro que la salida del artefacto, sin angostamientos; pendiente 4 % en horizontales; vertical ≥ 1,5 × horizontal','7.6 a-c'],
  ['som','Sombrerete a ≥ 0,50 m de puertas y ventanas; a los cuatro vientos si supera 10.000 kcal/h','7.6 f-h'],
  ['rej','Rejillas fijas: entrada a ≤ 0,30 m del piso y salida a ≥ 1,80 m; con chapa de leyenda donde corresponda','7.5 / 6.7'],
  ['pru','Pruebas de hermeticidad (15 min sin variación), obstrucción y ventilación','8.6.5']
];
const CHK_COMUN = [
  ['med','Gabinete de medidor/regulador según la distribuidora, ventilado, con llave de paso general accesible','Distribuidora / 4.'],
  ['pla','Planos (planta e isométrica), cálculo y planilla de artefactos coinciden con lo ejecutado','Presentación a la distribuidora'],
  ['cox','Recomendado al usuario: detector de monóxido de carbono en ambientes con artefactos de cámara abierta','Buena práctica']
];
const CHK_GLP = [
  ['glr','Regulador de presión aprobado, presión de salida según la instalación de gas envasado (habitual 280 mm c.a.)','Gas envasado'],
  ['glc','Cilindros/garrafas al exterior o en nicho ventilado, en posición vertical, protegidos del sol y de golpes; nunca en subsuelos ni cerca de desagües o bocas de sótano (el gas es más pesado que el aire)','6.7 d / gas envasado'],
  ['glf','Conexión cilindro-regulador con flexible de alta presión aprobado y en buen estado','Gas envasado'],
  ['gla','Artefactos aptos para gas envasado (inyectores para propano/butano, no los de gas natural)','6.1']
];
const CHK_LIST = () => [...(isSg(gas) ? CHK_SIGAS : CHK_ACERO), ...(gas.obra.gas === 'GLP' ? CHK_GLP : []), ...CHK_COMUN];

/* ================= isométrica ================= */
const DIR = { E: [0.866, 0.5], O: [-0.866, -0.5], N: [0.866, -0.5], S: [-0.866, 0.5], U: [0, -1], D: [0, 1] };
function isoSvg(g, C, opts = {}){
  const valid = C.valid; if(!valid.length) return '';
  const pos = { M: [0, 0] }, segs = [], labels = [];
  const scale = L => 46 + 34 * Math.sqrt(Math.max(L || 0, 0.2));
  const order = []; const visit = n => C.children(n).forEach(t => { order.push(t); visit(t.to); }); visit('M');
  order.forEach(t => {
    const p0 = pos[t.from]; if(!p0) return;
    const parts = parseRec(t.src.rec, t.L);
    let [x, y] = p0, best = null;
    parts.forEach(s => { const v = DIR[s.d] || DIR.E, len = scale(s.L); const nx = x + v[0] * len, ny = y + v[1] * len; const seg = { x1: x, y1: y, x2: nx, y2: ny, len, d: s.d, t }; segs.push(seg); if(!best || len > best.len) best = seg; x = nx; y = ny; });
    pos[t.to] = [x, y]; t._lab = best; t._end = parts[parts.length - 1].d;
  });
  const pts = Object.values(pos); segs.forEach(s => pts.push([s.x2, s.y2]));
  const boxes = [], atNode = {}; const VV = {}; try{ vent(g, C).forEach(v => VV[v.am.id] = v); }catch(e){}
  C.arts.forEach(a => { if(a.path.length && pos[a.node]) (atNode[a.node] = atNode[a.node] || []).push(a); });
  Object.entries(atNode).forEach(([n, list]) => {
    const [x, y] = pos[n];
    const inc = C.byTo[n], v = DIR[(inc && inc._end) || 'U'] || DIR.U;
    list.forEach((a, k) => {
      const l1 = `${fmt(a.kcal,0)} kcal/h · ${fmt(a.q,2)} m³/h · llave ${dLab(a.dLlave)}`;
      const vv = VV[a.src.amb], l2 = vv && (vv.entrada || vv.salida || vv.superior) ? 'Ventilación: ' + [vv.entrada ? 'entrada ' + vv.entrada + ' cm²' : '', vv.salida ? 'salida ' + vv.salida + ' cm²' : '', vv.superior ? 'superior ' + vv.superior + ' cm²' : ''].filter(Boolean).join(' · ') : '';
      const w = Math.max(7.6 * a.name.length, 5.6 * l1.length, 5.6 * l2.length) + 16, bh = l2 ? 48 : 34;
      const cx = x + v[0] * 48, cy = y + v[1] * 48 - k * 42;
      const bx = v[0] > 0.1 ? cx : v[0] < -0.1 ? cx - w : cx - w / 2, by = v[1] > 0.1 ? cy : v[1] < -0.6 ? cy - bh : cy - bh / 2;
      boxes.push({ a, l1, l2, bh, w, x, y, cx, cy, bx, by }); pts.push([bx, by], [bx + w, by + bh]); if(a.src.kind === 'abierta') pts.push([bx + w + 80, Math.min(by, y) - 30]);
    });
  });
  let minX = Math.min(...pts.map(p => p[0])), maxX = Math.max(...pts.map(p => p[0])), minY = Math.min(...pts.map(p => p[1])), maxY = Math.max(...pts.map(p => p[1]));
  const pad = 70; minX -= pad; minY -= pad + 30; maxX += pad + 60; maxY += pad + 50;
  const W = maxX - minX, H = maxY - minY;
  const F = 'Arial, Helvetica, sans-serif';
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX.toFixed(1)} ${minY.toFixed(1)} ${W.toFixed(1)} ${H.toFixed(1)}" width="${Math.round(W)}" height="${Math.round(H)}" font-family="${F}">`;
  s += `<rect x="${minX}" y="${minY}" width="${W}" height="${H}" fill="#ffffff"/>`;
  // rosa de ejes
  const ax = minX + 40, ay = maxY - 40;
  [['E','E'],['N','N'],['U','↑']].forEach(([d, l]) => { const v = DIR[d]; s += `<line x1="${ax}" y1="${ay}" x2="${ax + v[0]*26}" y2="${ay + v[1]*26}" stroke="#8a94a6" stroke-width="1.5"/><text x="${ax + v[0]*36}" y="${ay + v[1]*36 + 4}" font-size="11" fill="#8a94a6" text-anchor="middle">${l}</text>`; });
  segs.forEach(g2 => { const ex = g2.t.src.est === 'ex'; s += `<line x1="${g2.x1.toFixed(1)}" y1="${g2.y1.toFixed(1)}" x2="${g2.x2.toFixed(1)}" y2="${g2.y2.toFixed(1)}" stroke="#D62828" stroke-width="${g2.t.d >= 25 ? 4.5 : g2.t.d >= 19 ? 3.5 : 2.6}" stroke-linecap="${ex ? 'butt' : 'round'}"${ex ? ' stroke-dasharray="9 6"' : ''}/>`; });

  // etiquetas de tramos
  order.forEach(t => {
    const b = t._lab; if(!b) return;
    const mx = (b.x1 + b.x2) / 2, my = (b.y1 + b.y2) / 2;
    const vertical = b.d === 'U' || b.d === 'D';
    const ex = t.src.est === 'ex', dx = num(t.src.dex); const txt = `${ex ? (dx ? dLab(dx) : '¿?') + ' exist.' : dLab(t.d)}  ${fmt(t.L, t.L % 1 ? 1 : 0)} m`;
    const ox = vertical ? 8 : 0, oy = vertical ? 0 : -9;
    s += `<text x="${(mx + ox).toFixed(1)}" y="${(my + oy).toFixed(1)}" font-size="12" font-weight="700" fill="#0F2733" text-anchor="${vertical ? 'start' : 'middle'}" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(txt)}</text>`;
  });
  // nodos
  Object.entries(pos).forEach(([n, [x, y]]) => {
    if(n === 'M'){ s += `<rect x="${x - 15}" y="${y - 15}" width="30" height="30" rx="5" fill="#0F2733"/><text x="${x}" y="${y + 5}" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">M</text><text x="${x}" y="${y + 32}" font-size="11" fill="#555" text-anchor="middle">Medidor</text>`; return; }
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#fff" stroke="#1b1f24" stroke-width="1.6"/><text x="${(x - 9).toFixed(1)}" y="${(y + 15).toFixed(1)}" font-size="11" font-weight="700" fill="#1b1f24" text-anchor="end">${esc(n)}</text>`;
  });
  boxes.forEach(b => {
    s += `<line x1="${b.x}" y1="${b.y}" x2="${b.cx}" y2="${b.cy}" stroke="#6b7280" stroke-width="1" stroke-dasharray="3 3"/>`;
    s += `<rect x="${b.bx}" y="${b.by}" width="${b.w}" height="${b.bh}" rx="5" fill="#ffffff" stroke="#0F2733" stroke-width="1.1"/>`;
    s += `<text x="${b.bx + 8}" y="${b.by + 14}" font-size="12" font-weight="700" fill="#1b1f24">${esc(b.a.name)}</text>`;
    s += `<text x="${b.bx + 8}" y="${b.by + 28}" font-size="10.5" fill="#444">${esc(b.l1)}</text>`;
    if(b.l2) s += `<text x="${b.bx + 8}" y="${b.by + 42}" font-size="10.5" font-weight="700" fill="#1E9E4A">${esc(b.l2)}</text>`;
  });
  // ventilaciones: conducto de cada artefacto de cámara abierta, en verde, al costado de su recuadro
  boxes.forEach(b => { if(b.a.src.kind !== 'abierta') return; const x0 = b.bx + b.w + 16, yTop = Math.min(b.by, b.y) - 18, yb = b.by + b.bh / 2;
    s += `<path d="M${b.x + 5} ${b.y} L${x0} ${b.y} L${x0} ${yTop}" fill="none" stroke="#1E9E4A" stroke-width="3" stroke-linejoin="round"/><path d="M${x0 - 11} ${yTop} L${x0 + 11} ${yTop} M${x0 - 7} ${yTop - 6} L${x0 + 7} ${yTop - 6}" stroke="#1E9E4A" stroke-width="2.5"/>`;
    s += `<text x="${x0 + 8}" y="${yb}" font-size="10.5" font-weight="700" fill="#1E9E4A">Conducto</text>`; });
  { const lx = maxX - 190, ly = maxY - 62; s += `<rect x="${lx - 10}" y="${ly - 16}" width="196" height="70" rx="6" fill="#fff" stroke="#d5e0e5"/>`;
    [['Cañería a ejecutar', '#D62828', ''], ['Cañería existente', '#D62828', ' stroke-dasharray="9 6"'], ['Ventilación / conducto', '#1E9E4A', '']].forEach(([t, c, da], i) => { const yy = ly + i * 18; s += `<line x1="${lx}" y1="${yy}" x2="${lx + 40}" y2="${yy}" stroke="${c}" stroke-width="3.5"${da}/><text x="${lx + 50}" y="${yy + 4}" font-size="11" fill="#1b1f24">${t}</text>`; }); }
  if(opts.title){ s += `<text x="${minX + 16}" y="${minY + 24}" font-size="15" font-weight="700" fill="#1b1f24">${esc(opts.title)}</text><text x="${minX + 16}" y="${minY + 42}" font-size="11" fill="#555">Isométrica sin escala · diámetros según ${C.sg ? 'Manual Sigas Thermofusión, Tabla ' + (C.kind === 'GLP' ? 5 : 4) : 'NAG-200, Tabla ' + (C.kind === 'GLP' ? 4 : 3)}</text>`; }
  return s + '</svg>';
}
function svgToPng(svg, maxW = 2000){
  return new Promise((res, rej) => {
    const m = svg.match(/width="(\d+)" height="(\d+)"/); const w0 = m ? +m[1] : 800, h0 = m ? +m[2] : 600;
    const k = Math.min(2.2, maxW / w0); const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); res({ canvas: c, w: c.width, h: c.height }); };
    img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

/* ================= materiales ================= */
function materiales(g, C){
  const k = 1 + (num(g.desperdicio) || 0) / 100, rows = {}, sg = C.sg;
  const add = (item, d, q, u) => { if(!q) return; const key = item + '|' + (d || ''); rows[key] = rows[key] || { item, d, q: 0, u }; rows[key].q += q; };
  const nuevos = C.valid.filter(t => t.src.est !== 'ex');
  nuevos.forEach(t => {
    add(sg ? 'Tubo Sigas Thermofusión' : 'Caño', t.d, (t.L || 0) * k, 'm');
    [['c90','Codo 90°'],['c45','Codo 45°'],['curva', sg ? 'Curva de sobrepasaje' : 'Curva']].forEach(([kk, n]) => add(n, t.d, num(t.src[kk]) || 0, 'u'));
    if(sg) add('Unión normal (empalme de tubos de 4 m)', t.d, t.un || 0, 'u');
    add(sg ? 'Llave esférica' : 'Llave esclusa', t.d, num(t.src.ve) || 0, 'u');
    const p = C.parent(t); if(p && p.d && t.d && t.d < p.d) add(sg ? `Buje/reductor ${p.d} × ${t.d} mm` : `Reducción ${PULG[p.d]} × ${PULG[t.d]}`, null, 1, 'u');
  });
  [...new Set([...C.valid.map(t => t.from), ...C.arts.filter(a => a.path.length).map(a => a.node)])].forEach(n => {
    const ch = C.children(n), inc = n === 'M' ? null : C.byTo[n];
    if(inc && inc.src.est === 'ex' && ch.every(t => t.src.est === 'ex') && C.arts.filter(a => a.node === n).length === 0) return;
    const salidas = ch.length + C.arts.filter(a => a.node === n && a.path.length).length;
    if(salidas >= 2) add('Te', inc ? inc.d : (ch[0] && ch[0].d), salidas - 1, 'u');
  });
  C.arts.forEach(a => { if(!a.path.length || a.path[a.path.length - 1].src.est === 'ex') return;
    if(sg){ add('Llave esférica Sigas', a.dLlave, 1, 'u'); add('Codo 90° terminal c/rosca hembra', a.dLlave, 1, 'u'); add('Conexión metálica o flexible aprobado al artefacto', null, 1, 'u'); }
    else { add('Llave de paso aprobada', a.dLlave, 1, 'u'); add('Unión doble asiento cónico', a.dLlave, 1, 'u'); } });
  if(sg){ const m = {}; nuevos.forEach(t => { if(t.d) m[t.d] = (m[t.d] || 0) + (t.L || 0) * k; }); Object.entries(m).forEach(([d, L]) => add('Tubos de 4 m (barras)', +d, Math.ceil(L / 4), 'u')); }
  C.arts.filter(a => a.src.kind === 'abierta').forEach(a => add('Conducto de evacuación + sombrerete (según salida del artefacto)', null, 1, 'u'));
  const V = vent(g, C);
  V.forEach(v => { if(v.entrada) add(`Rejilla de entrada de aire ≥ ${v.entrada} cm² (${v.nombre})`, null, 1, 'u'); if(v.salida) add(`Rejilla de salida ≥ ${v.salida} cm² (${v.nombre})`, null, 1, 'u'); if(v.superior) add(`Rejilla superior ≥ ${v.superior} cm² (${v.nombre})`, null, 1, 'u'); });
  const order = ['Caño','Tubo','Unión normal','Codo 90°','Codo 45°','Curva','Te','Reducción','Buje','Llave','Unión doble','Codo 90° terminal','Conexión'];
  return Object.values(rows).sort((a, b) => { const ia = order.findIndex(o => a.item.startsWith(o)), ib = order.findIndex(o => b.item.startsWith(o)); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || (a.d || 0) - (b.d || 0); });
}

window.__gasTest = { calc, vent, materiales, isoSvg, ejemplo, TAB, get gas(){ return gas; }, set gas(v){ gas = v; } };
/* ================= interfaz ================= */
const view = document.createElement('div'); view.className = 'view'; view.id = 'view-gas'; view.hidden = true; APP.main.appendChild(view);
APP.VIEWS.gas = { el: view, title: 'Gas: cálculo NAG-200', sub: 'Cañerías, isométrica, ventilaciones, prueba y memoria técnica para la distribuidora.' };
const css = document.createElement('style');
css.textContent = `
  #view-gas{grid-template-columns:minmax(0,1fr)}
  #view-gas .gp-list{display:grid;gap:8px;margin-top:10px}
  #view-gas .gp-row{display:flex;gap:10px;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:12px;padding:10px 12px;cursor:pointer}
  #view-gas .gp-row.on{border-color:var(--accent);box-shadow:inset 3px 0 0 #FF7A1A}
  #view-gas .gp-row .info{display:grid;gap:2px;min-width:0}
  #view-gas .gp-row .info span{font-size:12.5px;color:var(--muted)}
  #view-gas .gp-row button{flex:none}
  #view-gas .gp-top{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  #view-gas .gp-top input{flex:1;min-width:160px;margin:0}
  #view-gas .alerts{display:grid;gap:6px;margin-top:12px}
  #view-gas .al{border-radius:8px;padding:8px 12px;font-size:14px;line-height:1.4}
  #view-gas .al.bad{background:var(--bad-bg);color:var(--bad)} #view-gas .al.warn{background:#fff4e0;color:#8a5300} #view-gas .al.info{background:var(--neutral-bg);color:var(--ink)}
  @media (prefers-color-scheme: dark){ #view-gas .al.warn{background:#3a2c12;color:#ffc46b} }
  #view-gas .iso{border:1px solid var(--line);border-radius:10px;overflow:auto;background:#fff}
  #view-gas .iso svg{display:block;width:100%;height:auto;max-height:78vh;min-width:520px}
  #view-gas .amb{border-top:1px solid var(--line);padding:12px 0}
  #view-gas .amb:first-child{border-top:none;padding-top:0}
  #view-gas .amb h3{margin:0 0 6px;font-size:15px}
  #view-gas table.ed input.s{width:56px;text-align:right}
  #view-gas td.calc b{font-size:15px}
  #view-gas .legend{font-size:13px;color:var(--muted);margin-top:8px}
  #view-gas .legend code{background:var(--neutral-bg);padding:1px 5px;border-radius:4px}
`;
document.head.appendChild(css);

function build(){
  const opt = (v, cur, l) => `<option value="${esc(v)}"${String(v) === String(cur ?? '') ? ' selected' : ''}>${esc(l)}</option>`;
  view.innerHTML = `
  <section class="card" id="gProy"><h2>Mis proyectos de gas</h2>
    <div class="gp-top"><button class="primary" id="gGuardar">Guardar proyecto</button><button id="gNuevo2">+ Nuevo</button><input id="gBuscar" type="search" placeholder="Buscar cliente o dirección"><span class="msg" id="gSync" style="margin:0"></span></div>
    <div class="gp-list" id="gLista"></div>
  </section>
  <section class="card"><h2><span class="step">1</span> Obra y tipo de gas</h2>
    <div class="grid">
      <label>Cliente / propietario<input data-o="cliente" list="dlClientes" autocomplete="off"></label><label>Dirección<input data-o="dir"></label><label>Localidad<input data-o="loc"></label>
      <label>Fecha<input type="date" data-o="fecha"></label><label>Distribuidora / expediente<input data-o="distrib" placeholder="ej. Camuzzi — Exp. N°"></label>
    </div>
    <div class="grid" style="margin-top:12px">
      <label>Tipo de gas<select data-o="gas">${opt('GN', gas.obra.gas, 'Gas natural (Tabla 3)')}${opt('GLP', gas.obra.gas, 'Gas envasado (Tabla 4)')}</select></label>
      <label>Poder calorífico (kcal/m³)<input data-o="pc" inputmode="decimal"></label>
      <label>Material de la cañería<select data-o="mat">${opt('acero', gas.obra.mat, MATS.acero)}${opt('sigas', gas.obra.mat, MATS.sigas)}</select></label>
      <label>Diámetro mínimo a usar<select data-o="dmin"></select></label>
      <label>Temp. mínima media de la zona (°C)<input data-o="tmin" inputmode="decimal" placeholder="ej. -3"></label>
    </div>
    <p class="hint">Gas natural: 9.300 kcal/m³ (valor de los ejemplos de la NAG-200). Propano: 22.380 kcal/m³ (Tabla 7). La temperatura se usa para la estufa en paso (+2,5 kcal/h·m³ por °C bajo cero, 6.7 h).</p>
    <div class="row" style="margin-top:10px"><button class="link" id="gEj">Cargar el ejemplo 1 de la NAG-200 (5.10)</button></div>
  </section>

  <section class="card" id="gSgRef" hidden></section>

  <section class="card"><h2><span class="step">2</span> Ambientes</h2>
    <div class="tbl-wrap"><table class="ed" id="gAmb"><thead><tr><th>Nombre</th><th>Tipo</th><th>Largo (m)</th><th>Ancho (m)</th><th>Alto (m)</th><th>Volumen</th><th></th></tr></thead><tbody></tbody></table></div>
    <div class="row" style="margin-top:8px"><button id="gAmbAdd">Agregar ambiente</button></div>
  </section>

  <section class="card"><h2><span class="step">3</span> Artefactos</h2>
    <p class="hint" style="margin-top:0">Consumos de la Tabla 1 (valor superior del rango); corregilo con la chapa del artefacto. El <b>nodo</b> es el punto de la cañería donde se conecta (el final de su tramo). Su llave de paso se suma sola al cálculo (100 diámetros).</p>
    <div class="tbl-wrap"><table class="ed" id="gArt" style="min-width:900px"><thead><tr><th>Tipo</th><th>Nombre</th><th>kcal/h</th><th>Combustión</th><th>Ambiente</th><th>Nodo</th><th>m³/h</th><th></th></tr></thead><tbody></tbody></table></div>
    <div class="row" style="margin-top:8px"><button id="gArtAdd">Agregar artefacto</button></div>
    <div class="kv" style="margin-top:12px" id="gArtKv"></div>
  </section>

  <section class="card"><h2><span class="step">4</span> Cañería por tramos</h2>
    <p class="hint" style="margin-top:0">Cada tramo va de un nodo a otro; el primero sale de <b>M</b> (medidor). Accesorios con la Tabla 18 (acero) o la Tabla 3 del manual Sigas, que además suma una unión cada 4 m de tubo y la llave esférica con su codo terminal. La "te de arranque" es la te del nodo de inicio, calculada con el diámetro del tramo anterior (como en los ejemplos de la norma).</p>
    <div class="tbl-wrap"><table class="ed" id="gTr" style="min-width:1050px"><thead><tr><th>Desde</th><th>Hasta</th><th>Estado</th><th>Ø existente</th><th>L real (m)</th><th>Recorrido para la isométrica</th>${ACC.map(a => `<th>${a[1]}</th>`).join('')}<th>Te de arranque</th><th></th></tr></thead><tbody></tbody></table></div>
    <div class="row" style="margin-top:8px"><button id="gTrAdd">Agregar tramo</button></div>
    <p class="legend">Recorrido: <code>E</code> este · <code>O</code> oeste · <code>N</code> norte · <code>S</code> sur · <code>U</code> sube · <code>D</code> baja, seguido de los metros. Ej.: <code>E 4 / N 2 / U 1,2</code>. Si lo dejás vacío se dibuja recto hacia el este y la L real puede calcularse sumando el recorrido.</p>
    <h3 class="sub">Resultado (5.2.8 y 5.10)</h3>
    <div class="tbl-wrap"><table class="limits" id="gRes"></table></div>
    <div class="kv" style="margin-top:12px" id="gResKv"></div>
    <div class="alerts" id="gAlerts"></div>
  </section>

  <section class="card"><h2><span class="step">5</span> Isométrica</h2>
    <div class="iso" id="gIso"><p class="empty" style="padding:12px">Cargá los tramos para ver el plano.</p></div>
    <div class="row" style="margin-top:10px"><button id="gSvg">Descargar SVG</button><button id="gPng">Descargar PNG</button><span class="msg" id="gIsoMsg" style="margin:0"></span></div>
  </section>

  <section class="card"><h2><span class="step">6</span> Ventilaciones y ubicación de artefactos</h2>
    <p class="hint" style="margin-top:0">Entrada de aire según Tabla 7.5.2 (a ≤ 0,30 m del piso) y salida de aire viciado según Tabla 7.5.1 (desde 1,80 m). Secciones libres mínimas.</p>
    <div id="gVent"></div>
  </section>

  <section class="card"><h2><span class="step">7</span> Prueba de hermeticidad (8.6.5)</h2>
    <div class="grid">
      <label>Fecha<input type="date" data-pr="fecha"></label><label>Presión de prueba<input data-pr="presion"></label><label>Duración (min)<input data-pr="min" inputmode="numeric"></label>
      <label>Manómetro (marca, rango)<input data-pr="mano"></label><label>Lectura inicial<input data-pr="ini" inputmode="decimal"></label><label>Lectura final<input data-pr="fin" inputmode="decimal"></label>
      <label>Prueba de obstrucción<select data-pr="obst">${opt('', '', '—')}${opt('OK', '', 'Sin obstrucciones')}${opt('NO', '', 'Con obstrucciones')}</select></label>
      <label>Prueba de ventilación<select data-pr="vent">${opt('', '', '—')}${opt('OK', '', 'Conductos libres y sin fisuras')}${opt('NO', '', 'Observada')}</select></label>
    </div>
    <p class="hint">Con las llaves terminales cerradas y las intermedias abiertas, aire a 10 veces la presión de trabajo durante 15 minutos como mínimo sin variación; después lo mismo con las llaves abiertas y los robinetes de los artefactos cerrados. Gas natural: trabajo 20 g/cm² → prueba 200 g/cm² (0,2 kg/cm²).</p>
    <label style="margin-top:10px">Observaciones<textarea class="plain" data-pr="obs" style="min-height:60px"></textarea></label>
    <div style="margin-top:10px" id="gPrRes"></div>
  </section>

  <section class="card"><h2><span class="step">8</span> Control de obra</h2>
    <div class="tbl-wrap"><table class="limits" id="gChk"></table></div>
  </section>

  <section class="card"><h2><span class="step">9</span> Cómputo de materiales</h2>
    <div class="row"><label style="display:flex;gap:8px;align-items:center;width:auto">Desperdicio de caño <input id="gDesp" inputmode="decimal" style="width:70px;margin:0"> %</label></div>
    <div class="tbl-wrap" style="margin-top:10px"><table class="limits" id="gMat"></table></div>
    <p class="hint">Orientativo, para armar el presupuesto. Las tes salen de las derivaciones de la cañería; las rejillas, de la sección 6.</p>
  </section>

  <section class="card"><h2><span class="step">10</span> Memoria técnica</h2>
    <label>Observaciones para la memoria<textarea class="plain" data-o="obs" style="min-height:60px"></textarea></label>
    <div class="row" style="margin-top:10px">
      <button class="primary" id="gPdf">Memoria técnica (PDF)</button><button id="gCsv">Materiales (.csv)</button>
      <button id="gExp">Guardar proyecto (.json)</button><button id="gImp">Abrir proyecto</button><input type="file" id="gImpF" accept=".json,application/json" hidden>
      <button id="gPresu">Armar presupuesto de gas</button>
      <button class="link" id="gNew">Nuevo proyecto</button>
    </div>
    <div class="msg" id="gMsg"></div>
  </section>`;

  $$('[data-o]', view).forEach(el => { const k = el.dataset.o; const h = () => { gas.obra[k] = el.value; if(k === 'gas'){ gas.obra.pc = GASES[el.value].pc; $('[data-o="pc"]', view).value = gas.obra.pc; }
    if(k === 'mat'){ gas.obra.dmin = el.value === 'sigas' ? 20 : 13; fillDmin(); renderChk(); renderSgRef(); } save(); update(); }; el.addEventListener('input', h); el.addEventListener('change', h); });
  $$('[data-pr]', view).forEach(el => { const k = el.dataset.pr; const h = () => { gas.prueba[k] = el.value; save(); updatePrueba(); }; el.addEventListener('input', h); el.addEventListener('change', h); });
  $('#gDesp').addEventListener('input', e => { gas.desperdicio = e.target.value; save(); update(); });
  $('#gAmbAdd').onclick = () => { gas.amb.push({ id: nid('a'), n: '', t: 'cocina', l: '', a: '', h: '2,6' }); save(); renderAmb(); renderArt(); update(); };
  $('#gArtAdd').onclick = () => { const p = PRE.cocina; gas.art.push({ id: nid('r'), p: p.k, n: p.n, kcal: String(p.kcal), kind: p.kind, horno: !!p.horno, amb: (gas.amb[0] || {}).id || '', nodo: '' }); save(); renderArt(); update(); };
  $('#gTrAdd').onclick = () => { const last = gas.tr[gas.tr.length - 1]; gas.tr.push({ id: nid('t'), de: last ? last.a : 'M', a: '', L: '', rec: '', c90: '', c45: '', curva: '', red: '', ve: '', te: '' }); save(); renderTr(); update(); };
  $('#gEj').onclick = () => { gas = ejemplo(); save(); renderAll(); setMsg('#gMsg', 'Ejemplo cargado: el resultado tiene que dar 3/4" – 1/2" – 1" como en la norma.'); };
  $('#gSvg').onclick = async () => { const C = calc(gas), svg = isoSvg(gas, C, { title: isoTitle() }); if(!svg) return setMsg('#gIsoMsg', 'No hay tramos válidos.', true); await saveFile(fname('isometrica') + '.svg', new Blob([svg], { type: 'image/svg+xml' }), '#gIsoMsg'); };
  $('#gPng').onclick = async () => { const C = calc(gas), svg = isoSvg(gas, C, { title: isoTitle() }); if(!svg) return setMsg('#gIsoMsg', 'No hay tramos válidos.', true); const r = await svgToPng(svg); r.canvas.toBlob(b => saveFile(fname('isometrica') + '.png', b, '#gIsoMsg'), 'image/png'); };
  $('#gCsv').onclick = () => { const C = calc(gas); const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'; const rows = [['Ítem','Diámetro','Cantidad','Unidad'], ...materiales(gas, C).map(r => [r.item, r.d ? dLab(r.d) : '', String(r.u === 'm' ? fmt(r.q, 1) : Math.ceil(r.q)), r.u])]; saveFile(fname('materiales') + '.csv', '﻿' + rows.map(r => r.map(q).join(';')).join('\r\n'), '#gMsg'); };
  $('#gExp').onclick = () => saveFile(fname('proyecto') + '.json', JSON.stringify(gas, null, 1), '#gMsg');
  $('#gImp').onclick = () => $('#gImpF').click();
  $('#gImpF').onchange = async () => { const f = $('#gImpF').files[0]; $('#gImpF').value = ''; if(!f) return; try { const g = JSON.parse(await f.text()); if(!g.obra || !Array.isArray(g.tr)) throw 0; gas = Object.assign(newGas(), g); save(); renderAll(); setMsg('#gMsg', 'Proyecto abierto: ' + f.name); } catch(e){ setMsg('#gMsg', 'Ese archivo no es un proyecto de gas de esta app.', true); } };
  let armed = 0;
  $('#gNew').onclick = () => { if(Date.now() - armed > 4000){ armed = Date.now(); $('#gNew').textContent = 'Tocá de nuevo para empezar de cero'; setTimeout(() => $('#gNew').textContent = 'Nuevo proyecto', 4000); return; } armed = 0; gas = newGas(gas); save(); renderAll(); $('#gNew').textContent = 'Nuevo proyecto'; };
  $('#gPdf').onclick = pdf;
}
const isoTitle = () => ['Isométrica de cañería', gas.obra.cliente, gas.obra.dir].filter(Boolean).join(' — ');
const fname = s => ('BAE_Gas_' + s + '_' + (gas.obra.cliente || gas.obra.dir || 'obra') + '_' + (gas.obra.fecha || '')).replace(/[^\w\-]+/g, '_');
async function saveFile(name, data, msgSel){
  if(DT.save){ const ok = await DT.save(name, data); setMsg(msgSel, ok ? 'Listo: ' + name : ((document.querySelector('#dlMsg') || {}).textContent || 'No se pudo descargar.'), !ok); return ok; }
  setMsg(msgSel, 'No se pudo descargar en esta vista.', true); return false;
}
function fillDmin(){
  const s = $('[data-o="dmin"]', view); const sg = isSg(gas);
  const opts = sg ? [20,25,32] : [9.5,13,19];
  if(!opts.includes(num(gas.obra.dmin))) gas.obra.dmin = opts[sg ? 0 : 1];
  s.innerHTML = opts.map(d => `<option value="${d}"${num(gas.obra.dmin) === d ? ' selected' : ''}>${sg ? 'Ø ' + d + ' mm' : dTxt(d)}</option>`).join('');
}
function renderSgRef(){
  const box = $('#gSgRef'); if(!box) return; box.hidden = !isSg(gas); if(!isSg(gas)) return;
  if(!box.dataset.built){ box.dataset.built = '1';
    box.innerHTML = `<h2><span class="step">★</span> Sigas Thermofusión — datos de obra</h2>
    <h3 class="sub" style="margin-top:0">Tiempos de termofusión y profundidad de inserción (Tablas 1 y 2)</h3>
    <div class="tbl-wrap"><table class="limits"><thead><tr><th>Ø (mm)</th><th>Calentamiento mín. (s)</th><th>Intervalo máx. acople (s)</th><th>Enfriamiento (min)</th><th>Inserción p (mm)</th></tr></thead><tbody>${SG.fus.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="hint">Termofusor entre 245 y 275 °C (equilibrio 260 °C, luz verde). Con frío o viento, calentar más hasta que se formen los dos anillos. 20 y 25 mm: boquilla con ranura; desde 32 mm, marcar la inserción en el tubo.</p>
    <h3 class="sub">Prolongación y batería de medidores — gas natural (Tabla 6 del manual)</h3>
    <div class="grid"><label>Cantidad de medidores<input id="gPrN" inputmode="numeric" value="1"></label><label>Longitud de la prolongación (m)<input id="gPrL" inputmode="decimal" value="10"></label><div><label>Diámetro Sigas</label><div id="gPrR" style="font-size:20px;font-weight:700;margin-top:8px"></div></div></div>
    <p class="hint">Para cada barral, entrá con los medidores que atiende y la distancia hasta su extremo. Si además alimenta un consumo grande (caldera central), sumá su caudal y verificá con la tabla de caudales como en los ejemplos del manual.</p>`;
    const f = () => { const n = num($('#gPrN').value), L = num($('#gPrL').value); let r = '—';
      if(n && L){ const row = SG.prol.find(p => n >= p[0] && n <= p[1]); const ci = SG.prolL.findIndex(x => x >= L - 1e-9);
        r = !row ? 'Más de 100 medidores: consultar' : ci < 0 ? 'Más de 100 m: consultar' : row[3][ci] ? 'Ø ' + row[3][ci] + ' mm' + ` <span style="font-size:13px;color:var(--muted);font-weight:400">(fila ${row[2]}, columna ${SG.prolL[ci]} m)</span>` : 'Fuera de tabla: consultar a Grupo Dema'; }
      $('#gPrR').innerHTML = r; };
    $('#gPrN').oninput = f; $('#gPrL').oninput = f; f();
  }
}
function fill(){
  $$('[data-o]', view).forEach(el => { const v = gas.obra[el.dataset.o]; if(el.value !== String(v ?? '')) el.value = v ?? ''; });
  $$('[data-pr]', view).forEach(el => { const v = gas.prueba[el.dataset.pr]; if(el.value !== String(v ?? '')) el.value = v ?? ''; });
  $('#gDesp').value = gas.desperdicio ?? '';
  if(!gas.obra.mat) gas.obra.mat = 'acero';
  $('[data-o="mat"]', view).value = gas.obra.mat; fillDmin();
}
const sel = (k, cur, opts, extra = '') => `<select data-k="${k}" ${extra}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(cur ?? '') ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
const inp = (k, v, cls = '', extra = '') => `<input data-k="${k}" class="${cls}" value="${esc(v)}" ${extra}>`;
function bind(tb, arr, rerender, onChange){
  $$('tr[data-i]', tb).forEach(tr => { const i = +tr.dataset.i;
    $$('[data-k]', tr).forEach(el => { const h = () => { arr()[i][el.dataset.k] = el.value; if(onChange) onChange(arr()[i], el.dataset.k, tr); save(); update(); }; el.addEventListener('input', h); el.addEventListener('change', h); });
    const x = $('button.x', tr); if(x) x.onclick = () => { arr().splice(i, 1); save(); rerender(); update(); };
  });
}
function renderAmb(){
  const tb = $('#gAmb tbody');
  tb.innerHTML = gas.amb.length ? gas.amb.map((a, i) => `<tr data-i="${i}"><td>${inp('n', a.n, '', 'placeholder="ej. Cocina" style="min-width:130px"')}</td><td>${sel('t', a.t, ATIPOS)}</td>
    <td>${inp('l', a.l, 'n', 'inputmode="decimal"')}</td><td>${inp('a', a.a, 'n', 'inputmode="decimal"')}</td><td>${inp('h', a.h, 'n', 'inputmode="decimal"')}</td><td class="calc" data-o="vol"></td><td><button class="x" title="Quitar">×</button></td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">Sin ambientes. Cargalos para verificar ventilaciones y ubicación.</td></tr>';
  bind(tb, () => gas.amb, () => { renderAmb(); renderArt(); }, (a, k) => { if(k === 'n' || k === 't') refreshAmbSelects(); });
}
const ambOpts = () => [['', '—'], ...gas.amb.map(a => [a.id, a.n || ATN[a.t]])];
function refreshAmbSelects(){ $$('#gArt select[data-k="amb"]').forEach(s => { const i = +s.closest('tr').dataset.i, cur = gas.art[i].amb; s.innerHTML = ambOpts().map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join(''); }); }
function renderArt(){
  const tb = $('#gArt tbody');
  tb.innerHTML = gas.art.length ? gas.art.map((a, i) => `<tr data-i="${i}"><td>${sel('p', a.p, PRESETS.map(p => [p.k, p.n]), 'style="max-width:210px"')}</td>
    <td>${inp('n', a.n, '', 'style="min-width:140px"')}</td><td>${inp('kcal', a.kcal, 'n', 'inputmode="numeric"')}</td>
    <td>${sel('kind', a.kind, KINDS)}</td><td>${sel('amb', a.amb, ambOpts())}</td><td>${inp('nodo', a.nodo, 's', 'placeholder="ej. 1" autocapitalize="characters"')}</td>
    <td class="calc" data-o="q"></td><td><button class="x" title="Quitar">×</button></td></tr>`).join('')
    : '<tr><td colspan="8" class="empty">Sin artefactos.</td></tr>';
  bind(tb, () => gas.art, renderArt, (a, k, tr) => {
    if(k === 'p'){ const p = PRE[a.p]; Object.assign(a, { n: p.n, kcal: p.kcal ? String(p.kcal) : '', kind: p.kind, horno: !!p.horno, wh: !!p.wh, heat: !!p.heat, cald: !!p.cald });
      $('[data-k="n"]', tr).value = a.n; $('[data-k="kcal"]', tr).value = a.kcal; $('[data-k="kind"]', tr).value = a.kind; }
  });
}
function renderTr(){
  const tb = $('#gTr tbody');
  tb.innerHTML = gas.tr.length ? gas.tr.map((t, i) => `<tr data-i="${i}"><td>${inp('de', t.de, 's', 'autocapitalize="characters"')}</td><td>${inp('a', t.a, 's', 'autocapitalize="characters"')}</td>
    <td>${sel('est', t.est || '', [['', 'A ejecutar'], ['ex', 'Existente']])}</td>
    <td>${t.est === 'ex' ? sel('dex', t.dex || '', [['', '¿?'], ...(isSg(gas) ? SG.D.map(d => [d, 'Ø' + d]) : TAB.D.map(d => [d, PULG[d]]))]) : '<span style="color:var(--muted)">—</span>'}</td>
    <td>${inp('L', t.L, 'n', 'inputmode="decimal"')}</td><td>${inp('rec', t.rec, '', 'placeholder="E 4 / U 1" style="min-width:150px"')}</td>
    ${ACC.map(([k]) => `<td>${inp(k, t[k], 's', 'inputmode="numeric"')}</td>`).join('')}
    <td>${sel('te', t.te, [['', '—'], ['tt', 'Flujo a través (20 d)'], ['tf', 'Flujo a 90° (60 d)']])}</td><td><button class="x" title="Quitar">×</button></td></tr>`).join('')
    : '<tr><td colspan="14" class="empty">Sin tramos. El primero sale de M.</td></tr>';
  bind(tb, () => gas.tr, renderTr, (t, k) => { if(k === 'est') setTimeout(renderTr, 0); });
}
function updatePrueba(){
  const p = gas.prueba, i = num(p.ini), f = num(p.fin), m = num(p.min);
  const her = i === null || f === null ? null : (Math.abs(i - f) < 1e-9 && (m === null || m >= 15));
  const pl = (v, y, n) => v === null ? '<span class="pill na">Sin datos</span>' : `<span class="pill ${v ? 'ok' : 'bad'}">${v ? y : n}</span>`;
  $('#gPrRes').innerHTML = `Hermeticidad ${pl(her, 'Sin variación', m !== null && m < 15 ? 'Menos de 15 min' : 'Con caída de presión')} &nbsp; Obstrucción ${pl(p.obst ? p.obst === 'OK' : null, 'OK', 'Observada')} &nbsp; Ventilación ${pl(p.vent ? p.vent === 'OK' : null, 'OK', 'Observada')}`;
  return her;
}
function renderChk(){
  $('#gChk').innerHTML = '<thead><tr><th>Verificación</th><th>Referencia</th><th>Estado</th></tr></thead><tbody>' + CHK_LIST().map(([k, t, r]) => `<tr><td>${esc(t)}</td><td style="color:var(--muted);white-space:nowrap">${esc(r)}</td><td><select data-c="${k}" style="width:auto">${[['', '—'], ['ok', 'Cumple'], ['no', 'No cumple'], ['na', 'No aplica']].map(([v, l]) => `<option value="${v}"${(gas.chk[k] || '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></td></tr>`).join('') + '</tbody>';
  $$('#gChk [data-c]').forEach(s => s.onchange = () => { gas.chk[s.dataset.c] = s.value; save(); });
}
function update(){
  const C = calc(gas);
  // ambientes
  $$('#gAmb tbody tr[data-i]').forEach(tr => { const a = gas.amb[+tr.dataset.i]; const l = num(a.l), w = num(a.a), h = num(a.h); $('[data-o="vol"]', tr).textContent = l && w && h ? fmt(l * w * h, 1) + ' m³' : ''; });
  $$('#gArt tbody tr[data-i]').forEach(tr => { const a = C.arts[+tr.dataset.i]; $('[data-o="q"]', tr).textContent = a && a.kcal ? fmt(a.q, 3) : ''; });
  $('#gArtKv').innerHTML = `<div>Potencia instalada<b>${fmt(C.totalKcal,0)} kcal/h</b></div><div>Caudal total<b>${fmt(C.totalQ,3)} m³/h</b></div><div>Poder calorífico<b>${fmt(C.pc,0)} kcal/m³</b></div>`;
  // resultados
  const rows = C.valid.slice().sort((a, b) => a.i - b.i);
  $('#gRes').innerHTML = rows.length ? `<thead><tr><th>Tramo</th><th>Caudal (m³/h)</th><th>L real</th><th>L equiv.</th><th>L de cálculo</th><th>Fila tabla</th><th>Ø sin L eq.</th><th>Ø adoptado</th><th>Caudal admisible</th><th>Margen</th></tr></thead><tbody>${rows.map(t => `<tr>
    <td><b>${esc(t.name)}</b>${t.ex ? ' <span class="pill na">existente</span>' : ''}</td><td>${fmt(t.Q,3)}</td><td>${fmt(t.L,2)} m</td><td>${fmt(t.eq,2)} m</td><td>${fmt(t.Lc,2)} m</td><td>${t.Lrow ? t.Lrow + ' m' : '—'}</td>
    <td>${t.d0 ? dLab(t.d0) : '—'}</td><td><b>${dTxtM(t.d)}</b></td><td>${t.Qadm ? fmt(t.Qadm,3) + ' m³/h' : '—'}</td>
    <td>${t.margen === null ? '—' : `<span class="pill ${t.margen < 0.03 ? 'na' : 'ok'}">${fmt(t.margen * 100, 0)} %</span>`}</td></tr>`).join('')}</tbody>` : '<tbody><tr><td class="empty">Sin tramos válidos.</td></tr></tbody>';
  $('#gResKv').innerHTML = `<div>Caída estimada al más desfavorable<b>${C.crit ? fmt(C.maxDrop,1) + ' mm c.a.' : '—'}</b></div><div>Artefacto más desfavorable<b>${C.crit ? esc(C.crit.name) : '—'}</b></div><div>Máximo admitido<b>10 mm c.a.</b></div>`;
  $('#gAlerts').innerHTML = [...C.err.map(t => ['bad', t]), ...C.warn.map(t => ['warn', t])].map(([c, t]) => `<div class="al ${c}">${esc(t)}</div>`).join('') || (rows.length ? '<div class="al info">Cálculo sin observaciones.</div>' : '');
  // isométrica
  const svg = isoSvg(gas, C);
  $('#gIso').innerHTML = svg || '<p class="empty" style="padding:12px">Cargá los tramos para ver el plano.</p>';
  // ventilación
  const V = vent(gas, C);
  $('#gVent').innerHTML = V.length ? V.map(v => `<div class="amb"><h3>${esc(v.nombre)} <span style="color:var(--muted);font-weight:400">· ${esc(ATN[v.am.t])}${v.vol ? ' · ' + fmt(v.vol,1) + ' m³' : ''}</span></h3>
    <div class="kv"><div>Entrada de aire (≤ 0,30 m)<b>${v.entrada ? v.entrada + ' cm²' : '—'}</b></div><div>Salida de aire viciado (≥ 1,80 m)<b>${v.salida ? v.salida + ' cm²' : '—'}</b></div>${v.superior ? `<div>Abertura superior (infrarrojo)<b>${v.superior} cm²</b></div>` : ''}<div>Artefactos<b style="font-size:14px">${v.arts.map(a => esc(a.name)).join(', ') || '—'}</b></div></div>
    <div class="alerts">${v.msgs.map(m => `<div class="al ${m.lvl}">${esc(m.t)}</div>`).join('')}</div></div>`).join('') : '<p class="empty">Cargá los ambientes en la sección 2.</p>';
  // materiales
  const M = materiales(gas, C);
  $('#gMat').innerHTML = M.length ? '<thead><tr><th>Ítem</th><th>Diámetro</th><th>Cantidad</th></tr></thead><tbody>' + M.map(r => `<tr><td>${esc(r.item)}</td><td>${r.d ? dLab(r.d) : ''}</td><td>${r.u === 'm' ? fmt(r.q, 1) + ' m' : Math.ceil(r.q)}</td></tr>`).join('') + '</tbody>' : '<tbody><tr><td class="empty">Sin datos.</td></tr></tbody>';
  updatePrueba();
  return C;
}
function renderAll(){ if(!view.dataset.built){ build(); view.dataset.built = '1'; } fill(); renderAmb(); renderArt(); renderTr(); renderChk(); renderSgRef(); update(); }

/* ================= PDF ================= */
const pdfSafe = s => String(s ?? '').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/[—–]/g, '-').replace(/[“”″]/g, '"').replace(/·/g, '-').replace(/[^\x00-\xFF]/g, '');
async function pdf(){
  if(!window.jspdf) return setMsg('#gMsg', 'No se cargó el generador de PDF. Recargá la página.', true);
  setMsg('#gMsg', 'Generando memoria…');
  try{
  const C = calc(gas), V = vent(gas, C), M = materiales(gas, C);
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, MG = 15; let y = MG; const blue = [15,39,51];
  const pf = (typeof window.__perfil === 'function') ? window.__perfil() : {};
  const need = h => { if(y + h > 280){ doc.addPage(); y = MG; } };
  const H2 = t => { need(14); doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(20); doc.text(pdfSafe(t), MG, y + 5); y += 9; };
  const P = (t, size = 9.5, color = 40) => { doc.setFont('helvetica','normal'); doc.setFontSize(size); doc.setTextColor(color); const L = doc.splitTextToSize(pdfSafe(t), PW - 2 * MG); need(L.length * 4.6); doc.text(L, MG, y + 3.5); y += L.length * 4.6 + 1; };
  const table = (cols, rows, opt = {}) => {
    const rh = 6.2; const W = cols.reduce((s, c) => s + c.w, 0), sc = (PW - 2 * MG) / W;
    const head = () => { doc.setFillColor(...blue); doc.rect(MG, y, PW - 2 * MG, rh, 'F'); doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(8.3); let x = MG + 1.5; cols.forEach(c => { doc.text(pdfSafe(c.h), x, y + 4.2); x += c.w * sc; }); y += rh; };
    need(rh * 2); head(); doc.setFont('helvetica','normal');
    rows.forEach((r, i) => {
      const cells = r.map((t, k) => doc.splitTextToSize(pdfSafe(t), cols[k].w * sc - 2.5));
      const h = Math.max(1, ...cells.map(c => c.length)) * 3.8 + 2.4;
      if(y + h > 280){ doc.addPage(); y = MG; head(); doc.setFont('helvetica','normal'); }
      if(i % 2){ doc.setFillColor(246,247,249); doc.rect(MG, y, PW - 2 * MG, h, 'F'); }
      let x = MG + 1.5; doc.setFontSize(8.3);
      cells.forEach((c, k) => { const st = opt.style && opt.style(i, k); doc.setTextColor(...(st && st.color || [30,30,30])); doc.setFont('helvetica', st && st.bold ? 'bold' : 'normal'); doc.text(c, x, y + 4); x += cols[k].w * sc; });
      y += h;
    });
    y += 3;
  };
  // encabezado BAE: franja azul + tricolor, logo y matrícula de gas
  doc.setFillColor(...blue); doc.rect(0, 0, PW, 3, 'F'); [[255,197,49],[255,122,26],[31,162,224]].forEach((c, i) => { doc.setFillColor(...c); doc.rect(i * PW / 3, 3, PW / 3, 1.2, 'F'); });
  y = 9;
  const L = window.BAE_LOGO; if(L && L.pdfHeader){ try{ L.pdfHeader(doc, MG, y, 14.3); }catch(e){} }
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(20);
  doc.text(pdfSafe(pf.nombre || ''), PW - MG, y + 3, { align: 'right' });   // el nombre de la empresa ya está en el logo
  doc.setFont('helvetica','normal'); doc.setFontSize(8.3); doc.setTextColor(70); let hy = y + 7.4;
  [[pf.tituloGas, pf.matGas ? 'Matrícula: ' + pf.matGas : ''].filter(Boolean).join(' - '), pf.contacto].filter(Boolean).forEach(t => { doc.text(pdfSafe(t), PW - MG, hy, { align: 'right' }); hy += 4.2; });
  y = Math.max(y + 17, hy) + 1; doc.setDrawColor(225); doc.line(MG, y, PW - MG, y); y += 3;
  doc.setTextColor(20); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text('Memoria técnica - Instalación interna de gas', MG, y + 8); y += 11;
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(100); doc.text(pdfSafe('Cálculo según NAG-200 "Disposiciones y normas mínimas para la ejecución de instalaciones domiciliarias de gas" (ENARGAS)'), MG, y + 3); y += 7;
  const o = gas.obra;
  const info = [['Cliente / propietario', o.cliente], ['Dirección', o.dir], ['Localidad', o.loc], ['Distribuidora / expediente', o.distrib], ['Fecha', fmtDate(o.fecha)],
    ['Gas', `${GASES[C.kind].n} - ${fmt(C.pc,0)} kcal/m3`], ['Cañería', C.sg ? `Sigas Thermofusión (NAG-E 210, matrícula BVG 044/42) - Tablas ${C.kind === 'GLP' ? 5 : 4} y 3 del manual técnico ed. 15-2026` : `Acero roscado - Tablas ${C.kind === 'GLP' ? 4 : 3} y 18 del Apéndice 1 de la NAG-200`], ['Potencia instalada', `${fmt(C.totalKcal,0)} kcal/h (${fmt(C.totalQ,3)} m3/h)`]].filter(x => x[1]);
  doc.setFillColor(246,247,249); doc.roundedRect(MG, y, PW - 2 * MG, info.length * 5.6 + 5, 2, 2, 'F'); y += 6;
  info.forEach(([k, v]) => { doc.setFontSize(9.5); doc.setTextColor(110); doc.text(pdfSafe(k), MG + 4, y); doc.setTextColor(20); doc.text(pdfSafe(v), MG + 52, y); y += 5.6; });
  y += 4;
  H2('1. Artefactos');
  table([{h:'Artefacto',w:52},{h:'Combustión',w:40},{h:'Ambiente',w:32},{h:'Nodo',w:14},{h:'kcal/h',w:20},{h:'m3/h',w:18},{h:'Llave',w:16}],
    C.arts.map(a => [a.name, (KINDS.find(k => k[0] === a.src.kind) || ['', ''])[1], (gas.amb.find(x => x.id === a.src.amb) || {}).n || '', a.node, fmt(a.kcal,0), fmt(a.q,3), a.dLlave ? dLab(a.dLlave) : '-']));
  H2('2. Cálculo de cañerías');
  P(`Pérdida de carga máxima 10 mm c.a. entre el medidor y cada artefacto con todos funcionando (5.2.8 c). Para cada tramo se toma el recorrido al artefacto más alejado que alimenta, sumando la longitud equivalente de los accesorios${C.sg ? ' (Tabla 3 del manual Sigas: llave esférica, codo terminal y una unión cada 4 m de tubo)' : ' (Tabla 18) y la llave de paso'}, y se entra en la tabla con la longitud inmediata superior (5.10).`);
  table([{h:'Tramo',w:16},{h:'Q m3/h',w:16},{h:'L real',w:15},{h:'L eq.',w:15},{h:'L cálc.',w:16},{h:'Fila',w:12},{h:'Diámetro',w:32},{h:'Q adm.',w:18},{h:'Margen',w:15}],
    C.valid.slice().sort((a, b) => a.i - b.i).map(t => [t.name + (t.ex ? ' (exist.)' : ''), fmt(t.Q,3), fmt(t.L,2), fmt(t.eq,2), fmt(t.Lc,2), t.Lrow ? t.Lrow + ' m' : '-', t.d ? dTxtM(t.d) : 'SIN SOLUCIÓN', t.Qadm ? fmt(t.Qadm,3) : '-', t.margen === null ? '-' : fmt(t.margen * 100,0) + ' %']),
    { style: (i, k) => k === 6 ? { bold: true } : null });
  if(C.crit) P(`Caída de presión estimada hasta el artefacto más desfavorable (${C.crit.name}): ${fmt(C.maxDrop,1)} mm c.a. (máximo 10 mm c.a.).`);
  const obsC = [...C.err, ...C.warn]; if(obsC.length){ P('Observaciones del cálculo:', 9.5, 20); obsC.forEach(t => P('- ' + t, 9, C.err.includes(t) ? 160 : 70)); }
  // isométrica
  const svg = isoSvg(gas, C, { title: isoTitle() });
  if(svg){
    doc.addPage(); y = MG; H2('3. Isométrica de la instalación');
    const r = await svgToPng(svg, 2400); const maxW = PW - 2 * MG, maxH = 250; let w = maxW, h = w * r.h / r.w; if(h > maxH){ h = maxH; w = h * r.w / r.h; }
    doc.addImage(r.canvas.toDataURL('image/png'), 'PNG', MG + (maxW - w) / 2, y, w, h); y += h + 4;
    P('Isométrica sin escala. Las longitudes acotadas son las reales de cada tramo.', 8.5, 110);
  }
  if(V.length){
    doc.addPage(); y = MG; H2('4. Ventilaciones y ubicación de artefactos (cap. VI y VII)');
    table([{h:'Ambiente',w:38},{h:'Volumen',w:20},{h:'Artefactos',w:60},{h:'Entrada <=0,30 m',w:26},{h:'Salida >=1,80 m',w:26},{h:'Superior',w:18}],
      V.map(v => [v.nombre + ' (' + ATN[v.am.t] + ')', v.vol ? fmt(v.vol,1) + ' m3' : '-', v.arts.map(a => a.name).join(', ') || '-', v.entrada ? v.entrada + ' cm2' : '-', v.salida ? v.salida + ' cm2' : '-', v.superior ? v.superior + ' cm2' : '-']));
    V.forEach(v => v.msgs.filter(m => m.lvl !== 'info' || v.arts.length).forEach(m => P(`${v.nombre}: ${m.t}`, 8.8, m.lvl === 'bad' ? 160 : 70)));
  }
  H2('5. Prueba de hermeticidad, obstrucción y ventilación (8.6.5)');
  const p = gas.prueba, her = updatePrueba();
  table([{h:'Fecha',w:20},{h:'Presión',w:26},{h:'Duración',w:18},{h:'Manómetro',w:36},{h:'Inicial',w:18},{h:'Final',w:18},{h:'Hermeticidad',w:24},{h:'Obstrucción',w:20},{h:'Ventilación',w:20}],
    [[fmtDate(p.fecha), p.presion, p.min ? p.min + ' min' : '', p.mano, p.ini, p.fin, her === null ? '-' : her ? 'Sin variación' : 'NO CUMPLE', p.obst === 'OK' ? 'OK' : p.obst === 'NO' ? 'Observada' : '-', p.vent === 'OK' ? 'OK' : p.vent === 'NO' ? 'Observada' : '-']]);
  if(p.obs) P(p.obs);
  H2('6. Control de obra');
  const CL = CHK_LIST();
  table([{h:'Verificación',w:120},{h:'Referencia',w:34},{h:'Estado',w:22}], CL.map(([k, t, r]) => [t, r, ({ ok: 'Cumple', no: 'No cumple', na: 'No aplica' })[gas.chk[k]] || '-']),
    { style: (i, k) => k === 2 ? { bold: true, color: gas.chk[CL[i][0]] === 'ok' ? [19,122,58] : gas.chk[CL[i][0]] === 'no' ? [180,35,24] : [110,110,110] } : null });
  if(M.length){ H2('7. Cómputo de materiales (orientativo)'); table([{h:'Ítem',w:120},{h:'Diámetro',w:30},{h:'Cantidad',w:26}], M.map(r => [r.item, r.d ? dLab(r.d) : '', r.u === 'm' ? fmt(r.q,1) + ' m' : String(Math.ceil(r.q))])); }
  if(o.obs){ H2('Observaciones'); P(o.obs); }
  const fT = window.__dt && window.__dt.firmaTecnico ? window.__dt.firmaTecnico() : null;
  need(fT ? 50 : 34); y += fT ? 30 : 18;
  if(fT){ try{ doc.addImage(fT, 'PNG', PW - MG - 64.5, y - 26, 54, 24); }catch(e){} }
  doc.setDrawColor(150); doc.line(PW - MG - 75, y, PW - MG, y);
  doc.setFontSize(9); doc.setTextColor(90); let fy = y + 5;
  [pf.nombre || 'Firma y aclaración', pf.matGas ? (pf.tituloGas || 'Gasista matriculado') + ' - Mat. ' + pf.matGas : 'Instalador gasista matriculado', pf.empresa].filter(Boolean).forEach(t => { doc.text(pdfSafe(t), PW - MG - 37.5, fy, { align: 'center' }); fy += 5; });
  const n = doc.getNumberOfPages(); for(let i = 1; i <= n; i++){ doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.text(pdfSafe(['Memoria técnica de gas', o.cliente, o.dir].filter(Boolean).join(' - ')), MG, 290); doc.text(`Página ${i} de ${n}`, PW - MG, 290, { align: 'right' }); }
  await saveFile(fname('memoria') + '.pdf', doc.output('blob'), '#gMsg');
  } catch(e){ console.error(e); setMsg('#gMsg', 'No se pudo generar el PDF.', true); }
}

/* ================= mis proyectos (local + Drive "BAE Gas") ================= */
const CARPETA = 'BAE Gas';
let lista = store.get('bae.gas.lista', []), borrados = store.get('bae.gas.borrados', []), sinc = '';
const guardarLista = () => store.set('bae.gas.lista', lista);
const titulo = x => (x.obra && (x.obra.cliente || x.obra.dir)) || 'Proyecto sin nombre';
const limpio = x => { const c = JSON.parse(JSON.stringify(x)); delete c._dirty; delete c._driveId; delete c._mod; return c; };
function renderLista(){
  const el = $('#gLista'); if(!el) return;
  const q = ($('#gBuscar') || {}).value || '';
  const qq = q.trim().toLowerCase();
  const xs = lista.slice().sort((a, b) => (b._mod || 0) - (a._mod || 0)).filter(x => !qq || [x.obra.cliente, x.obra.dir, x.obra.loc].join(' ').toLowerCase().includes(qq));
  el.innerHTML = xs.length ? xs.map(x => { let C = null; try{ C = calc(x); }catch(e){}
    return `<div class="gp-row${x.id === gas.id ? ' on' : ''}" data-gabrir="${esc(x.id)}"><div class="info"><b>${esc(titulo(x))}</b><span>${esc([x.obra.dir, x.obra.loc, fmtDate(x.obra.fecha), (GASES[x.obra.gas] || GASES.GN).n, C ? fmt(C.totalKcal, 0) + ' kcal/h' : ''].filter(Boolean).join(' · '))}</span></div>
    <button class="link" data-gborrar="${esc(x.id)}" aria-label="Borrar">Borrar</button></div>`; }).join('')
    : `<p class="empty" style="margin:0">${qq ? 'Sin resultados.' : 'Todavía no guardaste proyectos. Se guardan también en tu Drive.'}</p>`;
  setMsg('#gSync', sinc);
  CUR_SG = isSg(gas);
}
function guardarProyecto(){
  if(!gas.id) gas.id = 'g' + Date.now();
  const x = Object.assign(limpio(gas), { _mod: Date.now(), _dirty: true });
  const i = lista.findIndex(y => y.id === gas.id); if(i >= 0){ x._driveId = lista[i]._driveId; lista[i] = x; } else lista.push(x);
  guardarLista(); save();
  if(String(gas.obra.cliente).trim()) window.dispatchEvent(new CustomEvent('bae:cliente', { detail: { nombre: gas.obra.cliente, direccion: gas.obra.dir, localidad: gas.obra.loc } }));
  setMsg('#gMsg', 'Proyecto guardado.'); renderLista(); sincronizar(false);
}
function abrir(id){ const x = lista.find(y => y.id === id); if(!x) return; gas = Object.assign(newGas(), limpio(x)); save(); renderAll(); renderLista(); window.scrollTo(0, 0); }
function borrar(id){
  const x = lista.find(y => y.id === id); if(!x) return;
  if(!confirm('¿Borrar el proyecto "' + titulo(x) + '"? Se manda a la papelera de Drive.')) return;
  if(x._driveId){ borrados.push(x._driveId); store.set('bae.gas.borrados', borrados); }
  lista = lista.filter(y => y.id !== id); guardarLista(); if(gas.id === id) delete gas.id; renderLista(); sincronizar(false);
}
let corriendo = null, otra = false;
async function sincronizar(interactivo){
  if(!N || !N.email) return;
  if(corriendo){ otra = true; return corriendo; }
  if(!N.conectado){ if(interactivo) corriendo = N.pedirToken(false).then(() => { corriendo = null; return sincronizar(false); }, () => { corriendo = null; }); return corriendo; }
  corriendo = (async () => {
    try{
      sinc = 'Sincronizando…'; setMsg('#gSync', sinc);
      await N.sincronizarColeccion({ tipo: 'gas', carpeta: CARPETA, lista: () => lista, setLista: l => { lista = l; guardarLista(); },
        borrados: () => borrados, setBorrados: b => { borrados = b; store.set('bae.gas.borrados', borrados); },
        nombre: x => ('Gas_' + titulo(x)).replace(/[\\/:*?"<>|]+/g, '_') });
      sinc = 'Drive al día';
    }catch(e){ sinc = e.code === 'TOKEN' ? 'Tocá Guardar para reconectar Drive' : 'No se pudo sincronizar'; }
    finally{ corriendo = null; renderLista(); if(otra){ otra = false; sincronizar(false); } }
  })();
  return corriendo;
}

/* ================= presupuesto de gas ================= */
function armarPresupuesto(){
  const PZ = window.__presu; if(!PZ) return setMsg('#gMsg', 'No está disponible el módulo de presupuestos.', true);
  const C = calc(gas), M = materiales(gas, C), precios = PZ.precios || [];
  const precioDe = d => { const p = precios.find(x => String(x.desc).trim().toLowerCase() === d.toLowerCase()); return p ? p.precio : ''; };
  PZ.nuevoPara({ nombre: gas.obra.cliente, direccion: gas.obra.dir, localidad: gas.obra.loc });
  const P = PZ.P;
  const bocas = C.arts.filter(a => a.path.length).length;
  Object.assign(P, { rubro: 'gas', formato: 'completo', obra: 'Instalación interna de gas' + (gas.obra.dir ? ' — ' + gas.obra.dir : ''),
    alcance: `Instalación de gas ${C.kind === 'GLP' ? 'envasado' : 'natural'} con cañería ${C.sg ? 'Sigas Thermofusión' : 'de acero roscado'}, ${bocas} boca${bocas === 1 ? '' : 's'} (${fmt(C.totalKcal, 0)} kcal/h), calculada según NAG-200.`,
    mo: [
      { desc: `Mano de obra: instalación interna de gas, ${bocas} boca${bocas === 1 ? '' : 's'}`, cant: 1, precio: precioDe('Mano de obra instalación de gas') },
      { desc: 'Pruebas de hermeticidad, obstrucción y ventilación', cant: 1, precio: precioDe('Prueba de hermeticidad') },
      { desc: 'Planos, cálculo y memoria técnica para la distribuidora', cant: 1, precio: precioDe('Planos y memoria técnica de gas') }
    ],
    mat: M.map(r => { const desc = r.item + (r.d ? ' ' + (C.sg ? r.d + ' mm' : PULG[r.d]) : ''); return { desc, cant: r.u === 'm' ? String(Math.ceil(r.q)) + ' m' : String(Math.ceil(r.q)), precio: precioDe(desc) }; }),
    matIncluidos: true });
  PZ.P = P;
  location.hash = '#presu';
}

/* ================= enganche con la app ================= */
view.addEventListener('click', e => {
  const t = e.target.closest('button, [data-gabrir]'); if(!t) return;
  if(t.id === 'gGuardar') guardarProyecto();
  else if(t.id === 'gNuevo2'){ gas = newGas(gas); save(); renderAll(); renderLista(); setMsg('#gMsg', 'Proyecto nuevo.'); }
  else if(t.id === 'gPresu') armarPresupuesto();
  else if(t.dataset.gborrar){ e.stopPropagation(); borrar(t.dataset.gborrar); }
  else if(t.dataset.gabrir) abrir(t.dataset.gabrir);
});
view.addEventListener('input', e => { if(e.target.id === 'gBuscar') renderLista(); });
// Cuando se abre un cliente desde la agenda
window.__gas = { get lista(){ return lista; }, nuevoPara(c){ gas = newGas(gas); gas.obra.cliente = c.nombre || ''; gas.obra.dir = c.direccion || ''; if(c.localidad) gas.obra.loc = c.localidad; save(); if(view.dataset.built) renderAll(); }, calc: () => calc(gas), sincronizar };
window.__gasRender = () => { renderAll(); renderLista(); };
const alEntrar = () => { if((location.hash || '').replace('#', '') === 'gas'){ renderAll(); renderLista(); sincronizar(false); } };
window.addEventListener('hashchange', alEntrar);
if(N && N.onCambio) N.onCambio(() => { if(location.hash === '#gas') sincronizar(false); });
window.addEventListener('bae:sync', () => sincronizar(false));   // sincronización automática (nube.js)
APP.route(); alEntrar();

})();
