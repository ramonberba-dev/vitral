// VITRAL — app (dados no aparelho em localStorage, sincronizados pelo sync.js)
'use strict';

const CHAVE = 'vitral_v1';
const DIA = 864e5;
const $app = document.getElementById('app');
const $mus = document.getElementById('musica');

// ---------- utilidades ----------
const hoje = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mesAtual = () => hoje().slice(0, 7);
function semanaDe(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return hoje(x);
}
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
const r = n => Math.round(n);
const fmtData = s => { const [y, m, d] = s.split('-'); return `${d}/${m}`; };

// ---------- estado ----------
function novoJogador(id, nome, cor) {
  // começa sem ninguém: o herói sai do quiz e da roleta do Despertar (desperta.js)
  return {
    id, nome, cor, xp: 0, chama: 4, lumens: 20, talentos: 0, congelados: 0,
    frag: { fe: 0, esp: 0, car: 0, tem: 0, pru: 0, for: 0, jus: 0 },
    heroi: null, devotos: {}, equipe: [], pity: 0, pilulas: 2,
    reino: { no: 0, lendas: [] }, comunhaoEm: 0, gracaDia: '', streak: 0, streakDia: '',
    xpSemana: 0, semana: semanaDe(), cofre: [], anjo: null, emitidos: {}, aplicados: [], upd: 0,
  };
}
function estadoInicial() {
  return {
    v: 1,
    config: { id: 'config', upd: 0, nomes: {}, pin: '1234', valorTalento: 0.5, metaSemanal: 1200, metaFamilia: 15000, premioFamilia: 'Pizza em família', xpFamiliaBase: 0 },
    sync: { url: (window.CONFIG && window.CONFIG.api_url) || '', chave: '', desde: 0, pend: {} }, registros: [],
    players: { a: novoJogador('a', 'Filho 1', '#5aa9e6'), b: novoJogador('b', 'Filho 2', '#f08a3c') },
    modelos: MISSOES_EXEMPLO.map(m => ({ id: uid(), ...m, para: ['a', 'b'], exemplo: true })),
    missoes: [], larvas: [], resgates: [], eventos: [],
    premios: [
      { id: uid(), nome: 'Pix de R$ 5', tipo: 'pix', custo: 10 },
      { id: uid(), nome: '+30 min de tela', tipo: 'privilegio', custo: 6 },
      { id: uid(), nome: 'Escolher o jantar', tipo: 'privilegio', custo: 8 },
      { id: uid(), nome: 'Cinema com o pai ou a mãe', tipo: 'experiencia', custo: 40 },
    ],
    ultimoDia: '', ultimaSemana: semanaDe(),
  };
}
let S;
try { S = JSON.parse(localStorage.getItem(CHAVE)) || estadoInicial(); } catch { S = estadoInicial(); }
// dados de versões antigas do protótipo
S.sync = S.sync || { url: '', chave: '', desde: 0, pend: {} };
if (!S.sync.url && window.CONFIG && window.CONFIG.api_url) S.sync.url = window.CONFIG.api_url;
S.registros = S.registros || []; S.config.id = 'config'; S.config.nomes = S.config.nomes || {};
Object.values(S.players).forEach(p => { p.emitidos = p.emitidos || {}; p.aplicados = p.aplicados || []; });
function localSalvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(S)); }
  catch { toast('Memória cheia no aparelho'); }
}
// Salva e agenda a sincronização. Só o perfil de filho aberto neste aparelho altera o personagem.
function salvar() {
  const p = UI.perfil && UI.perfil !== 'pais' ? S.players[UI.perfil] : null;
  if (p) { p.upd = Date.now(); marcar('players', p.id); }
  localSalvar(); agendarSync();
}
function aplicarNomes() { Object.values(S.players).forEach(p => { if (S.config.nomes[p.id]) p.nome = S.config.nomes[p.id]; }); }
aplicarNomes();
const modelosAtivos = () => S.modelos.filter(m => !m.apagado);
const premiosAtivos = () => S.premios.filter(x => !x.apagado);

// sessão da tela (não salva)
const UI = { perfil: null, aba: 'inicio', sub: '', som: false, overlay: null, sync: '', syncErro: '' };

// ---------- regras ----------
function vigor(p) {
  if (!p.comunhaoEm) return 70;
  const dias = Math.floor((Date.now() - p.comunhaoEm) / DIA);
  return Math.max(40, 100 - 10 * dias);
}
const fortalecido = p => p.comunhaoEm && Date.now() - p.comunhaoEm < 7 * DIA;
const multRecompensa = p => (0.6 + 0.4 * vigor(p) / 100) * (fortalecido(p) ? 1.2 : 1);
function rankIdx(xp) { let i = 0; RANKS.forEach((k, j) => { if (xp >= k.xp) i = j; }); return i; }
const larvasAtivas = pid => S.larvas.filter(l => l.pid === pid && l.status !== 'eliminada');
function selos(p) {
  const n = S.missoes.filter(m => m.pid === p.id && m.status === 'aprovada' && m.v === REINO1.v).length;
  return Math.floor(n / 3);
}
const bossSemanaLiberado = p => S.missoes.some(m => m.pid === p.id && m.status === 'aprovada' && m.tipo === 'boss' && m.semana === semanaDe());
function evento(pid, txt) { const e = { id: uid(), pid, txt, em: Date.now() }; S.eventos.unshift(e); toque('eventos', e); S.eventos.length = Math.min(S.eventos.length, 300); }
function falaAnjo(p, chave) { p.anjo = pick(ANJO[chave]); }

// Rodada diária: missões recorrentes (qualquer aparelho, com id fixo para não duplicar)
// e, no aparelho do filho, dreno das Larvas e Torneio da Semana do próprio personagem.
function rodadaDiaria() {
  const d = hoje(), sem = semanaDe();
  modelosAtivos().forEach(mo => mo.para.forEach(pid => {
    const id = mo.rec === 'diaria' ? `${mo.id}_${pid}_${d}` : mo.rec === 'semanal' ? `${mo.id}_${pid}_${sem}` : `${mo.id}_${pid}`;
    if (!S.missoes.some(m => m.id === id)) criarMissao(pid, mo, mo.id, false, id);
  }));
  const p = UI.perfil && UI.perfil !== 'pais' ? S.players[UI.perfil] : null;
  if (p) {
    if (p.semana !== sem) {
      const outro = Object.values(S.players).find(x => x !== p);
      const meu = p.xpSemana / S.config.metaSemanal, dele = outro && outro.semana === p.semana ? outro.xpSemana / S.config.metaSemanal : 0;
      if (p.xpSemana > 0 && meu > dele) { darTalentos(p, 5); evento(p.id, 'Venceu o Torneio da Semana: Coroa + 5 Talentos'); }
      p.xpSemana = 0; p.semana = sem;
    }
    if (p.diaDreno !== d) {
      const dias = p.diaDreno ? Math.max(1, Math.round((new Date(d) - new Date(p.diaDreno)) / DIA)) : 0;
      for (let i = 0; i < larvasAtivas(p.id).length * dias; i++) {
        const vs = Object.keys(p.frag).filter(k => p.frag[k] > 0);
        if (vs.length) p.frag[pick(vs)]--;
      }
      p.diaDreno = d;
    }
    processar(p);
  }
  const corte = hoje(new Date(Date.now() - 7 * DIA));
  S.missoes = S.missoes.filter(m => !(m.status === 'aberta' && m.data < corte));
  salvar();
}
function criarMissao(pid, base, modeloId = null, extra = false, idFixo = null) {
  const m = { id: idFixo || uid(), pid, modeloId, titulo: base.titulo, tipo: base.tipo, v: base.v, data: hoje(), semana: semanaDe(),
    status: 'aberta', estrelas: 0, comentario: '', secreta: false, extra, criadaEm: Date.now() };
  S.missoes.unshift(m);
  // missão gerada pela rotina nasce com upd mínimo: qualquer mudança real em outro aparelho vence
  if (idFixo) { m.upd = 1; marcar('missoes', m.id); } else toque('missoes', m);
  return m;
}
function darTalentos(p, n) {
  if (n <= 0) return;
  if (larvasAtivas(p.id).length) p.congelados += n; else p.talentos += n;
  p.emitidos[mesAtual()] = (p.emitidos[mesAtual()] || 0) + n;
}

// Pais: só marcam a missão. A recompensa é creditada no aparelho do filho (processar).
function aprovar(m, estrelas) {
  m.status = 'aprovada'; m.estrelas = estrelas; m.avaliadaEm = Date.now(); toque('missoes', m);
  if (m.reparo) { const l = S.larvas.find(x => x.id === m.reparo); if (l) { l.status = 'eliminada'; toque('larvas', l); } }
  evento(m.pid, `${m.reparo ? 'Reparo aceito' : '★'.repeat(estrelas)}: ${m.titulo}`);
  salvar();
}
function pedirRefazer(m, comentario) {
  m.status = 'refazer'; m.comentario = comentario || 'Dá pra caprichar mais.'; m.avaliadaEm = Date.now(); m.avisadoRefazer = false;
  toque('missoes', m); evento(m.pid, `Refazer: ${m.titulo}`); salvar();
}
// Aparelho do filho: aplica aprovações, Larvas, Comunhão e bônus que chegaram dos pais
function processar(p) {
  let mudou = false;
  S.missoes.filter(m => m.pid === p.id && m.status === 'aprovada' && !m.creditado).forEach(m => { creditar(p, m); m.creditado = true; toque('missoes', m); mudou = true; });
  S.missoes.filter(m => m.pid === p.id && m.status === 'refazer' && !m.avisadoRefazer).forEach(m => { falaAnjo(p, 'refazer'); m.avisadoRefazer = true; toque('missoes', m); mudou = true; });
  S.larvas.filter(l => l.pid === p.id && l.status === 'ativa' && !l.avisada).forEach(l => { falaAnjo(p, 'larva'); l.avisada = true; toque('larvas', l); mudou = true; });
  S.registros.filter(x => x.pid === p.id && !p.aplicados.includes(x.id)).forEach(x => {
    if (x.tipo === 'comunhao') { p.comunhaoEm = Math.max(p.comunhaoEm || 0, x.em); falaAnjo(p, 'comunhao'); }
    if (x.tipo === 'bonus') p.chama = Math.min(CHAMA_MAX, p.chama + (x.chama || 0));
    p.aplicados.push(x.id); mudou = true;
  });
  if (!larvasAtivas(p.id).length && p.congelados) { p.talentos += p.congelados; p.congelados = 0; mudou = true; }
  if (mudou) salvar();
}
function creditar(p, m) {
  if (m.reparo) { p.frag.jus += 5; falaAnjo(p, 'reparou'); return; }
  const t = TIPOS[m.tipo], e = ESTRELAS[m.estrelas] || 1, sec = m.secreta ? 1.5 : 1, mult = multRecompensa(p);
  const rankAntes = rankIdx(p.xp);
  const xp = r(t.xp * e * mult * sec), fr = Math.max(1, r(t.frag * e * mult * sec));
  if (p.semana !== semanaDe()) { p.xpSemana = 0; p.semana = semanaDe(); }
  p.xp += xp; p.xpSemana += xp; p.frag[m.v] += fr; ganharXpHeroi(p, xp);
  if (m.secreta) p.frag.fe += 1;
  darTalentos(p, r(t.tal * e) + (m.secreta ? 1 : 0));
  p.chama = Math.min(CHAMA_MAX, p.chama + t.chama + (m.secreta ? 1 : 0));
  p.lumens += t.lum;
  if (m.tipo === 'diaria' && p.streakDia !== hoje()) {
    const ontem = hoje(new Date(Date.now() - DIA));
    p.streak = p.streakDia === ontem ? p.streak + 1 : 1; p.streakDia = hoje();
    if (p.streak === 7) { p.xp += 50; darTalentos(p, 2); evento(p.id, 'Sequência de 7 dias: +50 XP e 2 Talentos'); }
    if (p.streak === 30) { p.xp += 300; darTalentos(p, 10); evento(p.id, 'Sequência de 30 dias: +300 XP e 10 Talentos'); }
  }
  m.ganho = { xp, fr, chama: t.chama + (m.secreta ? 1 : 0) };
  if (rankIdx(p.xp) > rankAntes) { falaAnjo(p, 'rank'); evento(p.id, `Subiu para ${RANKS[rankIdx(p.xp)].nome}`); }
  else falaAnjo(p, m.secreta ? 'secreta' : m.estrelas === 3 ? 'aprovada3' : 'aprovada');
}

// ---------- fotos ----------
function lerFoto(file, max = 900, q = 0.62) {
  return new Promise((ok, erro) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = r(img.width * k); c.height = r(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', q));
    };
    img.onerror = erro; img.src = url;
  });
}
// Miniatura pequena que viaja junto com a missão (a foto inteira vai para o Drive)
function miniatura(dataUrl, lado = 200) {
  return new Promise(ok => {
    const im = new Image();
    im.onload = () => {
      const k = lado / Math.max(im.width, im.height), c = document.createElement('canvas');
      c.width = r(im.width * k); c.height = r(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.55));
    };
    im.onerror = () => ok(null); im.src = dataUrl;
  });
}
function escolherFoto() {
  return new Promise(ok => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.setAttribute('capture', 'environment');
    i.onchange = async () => { if (!i.files[0]) return ok(null); try { ok(await lerFoto(i.files[0])); } catch { ok(null); } };
    i.click();
  });
}

// ---------- som ----------
let ctx;
function bip(notas, tipo = 'square', dur = 0.09, vol = 0.07) {
  if (!UI.som) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    notas.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + i * dur;
      o.type = tipo; o.frequency.value = f; g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur * 1.6);
      o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + dur * 1.7);
    });
  } catch {}
}
const SFX = {
  moeda: () => bip([988, 1319], 'square', 0.08),
  fanfarra: () => bip([523, 659, 784, 1047], 'square', 0.11),
  blob: () => bip([220, 160, 110], 'sine', 0.12, 0.12),
  toin: () => bip([660, 330], 'triangle', 0.1, 0.1),
  sinos: () => bip([1047, 1319, 1568, 2093], 'sine', 0.18, 0.08),
  golpe: () => bip([180, 120], 'sawtooth', 0.05, 0.05),
};
function tocar(faixa) {
  if (!UI.som) { $mus.pause(); return; }
  const src = `assets/musica/${faixa}.mp3`;
  if (!$mus.src.endsWith(src)) { $mus.src = src; }
  $mus.volume = 0.45; $mus.play().catch(() => {});
}

// ---------- feedback ----------
let toastT;
function toast(txt) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = txt; document.body.appendChild(t);
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2600);
}
// Erros inesperados: avisam na tela e ficam guardados (os pais veem em Mais), para achar travamentos no celular
const ERROS = 'vitral_erros';
function registrarErro(msg, onde) {
  const e = { em: new Date().toLocaleString('pt-BR'), msg: String(msg).slice(0, 200), onde: String(onde || '').slice(0, 120), v: typeof VERSAO_ASSETS === 'undefined' ? '?' : VERSAO_ASSETS, tela: `${UI.perfil || '-'}/${UI.aba}` };
  try { const l = JSON.parse(localStorage.getItem(ERROS) || '[]'); l.unshift(e); localStorage.setItem(ERROS, JSON.stringify(l.slice(0, 15))); } catch {}
  toast('Ops, deu um erro. Os pais podem ver em Mais.');
}
window.addEventListener('error', e => registrarErro(e.message, `${(e.filename || '').split('/').pop()}:${e.lineno}`));
window.addEventListener('unhandledrejection', e => registrarErro(e.reason && (e.reason.message || e.reason), 'promessa'));
function combo(txt) { const c = document.createElement('div'); c.className = 'combo'; c.textContent = txt; document.body.appendChild(c); setTimeout(() => c.remove(), 1200); }

// ---------- componentes ----------
const img = (src, alt = '') => `<img src="${src}" alt="${esc(alt)}" loading="lazy">`;
const devImg = k => `assets/devotos/${k}.jpg`;
const estrelas = n => '★'.repeat(n);
const virtPill = v => `<span class="pill" style="color:${VIRTUDES[v].cor}">${VIRTUDES[v].nome}</span>`;
// Confirmação de arrastar: só dispara a ação quando o botão chega ao fim do trilho (evita toque sem querer)
const deslizar = (acao, texto) => `<div class="desliza" data-acao="${acao}"><span>${texto}</span><button class="puxa" type="button" aria-label="${texto}">»</button></div>`;
document.addEventListener('pointerdown', e => {
  const puxa = e.target.closest('.puxa'); if (!puxa) return;
  e.preventDefault();
  const trilho = puxa.parentElement, max = trilho.clientWidth - puxa.offsetWidth - 8, x0 = e.clientX;
  let x = 0;
  const mover = ev => { x = Math.max(0, Math.min(max, ev.clientX - x0)); puxa.style.transform = `translateX(${x}px)`; trilho.style.setProperty('--p', x / max); };
  const soltar = ev => {
    if (ev.type === 'pointerup') mover(ev); // conta também onde o dedo soltou
    document.removeEventListener('pointermove', mover); document.removeEventListener('pointerup', soltar); document.removeEventListener('pointercancel', soltar);
    if (x >= max * 0.92) { const fn = ACOES[trilho.dataset.acao]; if (fn) fn(); return; }
    puxa.style.transition = 'transform .25s'; puxa.style.transform = ''; trilho.style.setProperty('--p', 0);
    setTimeout(() => { puxa.style.transition = ''; }, 260);
  };
  document.addEventListener('pointermove', mover); document.addEventListener('pointerup', soltar); document.addEventListener('pointercancel', soltar);
});
function barra(pct, cor) { return `<div class="bar"><i style="width:${Math.max(0, Math.min(100, pct))}%;${cor ? `background:${cor}` : ''}"></i></div>`; }
function anjoBox(p) {
  const [expr, txt] = p.anjo || pick(ANJO.oi);
  return `<div class="anjo">${img(`assets/anjo/${expr}.jpg`, 'Anjo da Guarda')}<div class="bubble">${esc(txt)}</div></div>`;
}
function stMissao(m) {
  const n = { aberta: 'a fazer', enviada: 'aguardando', aprovada: estrelas(m.estrelas) || 'ok', refazer: 'refazer' }[m.status];
  return `<span class="st ${m.status}">${n}</span>`;
}

// ---------- telas ----------
// Se a tela de fundo der erro, o que está por cima (quiz, avisos) continua funcionando e o erro fica registrado
function render() {
  try { renderTela(); }
  catch (err) {
    registrarErro(err && err.message || err, 'tela ' + (UI.perfil || 'entrada') + '/' + UI.aba);
    $app.innerHTML = `<main class="screen"><div class="card"><b>Esta tela deu um erro.</b><p class="small muted">Os pais podem ver o motivo em Mais.</p><button class="btn" data-a="sair">Voltar ao início</button></div></main>` + (UI.overlay || '');
  }
}
function renderTela() {
  if (!UI.perfil) return renderEntrada();
  const pais = UI.perfil === 'pais';
  const p = pais ? null : S.players[UI.perfil];
  const abas = pais
    ? [['avaliar', '📸', 'Avaliar'], ['rotina', '📅', 'Rotina'], ['jogo', '🎮', 'Jogo'], ['missoes', '📜', 'Missões'], ['mais', '⚙️', 'Mais']]
    : [['inicio', '🏠', 'Início'], ['missoes', '📜', 'Missões'], ['mapa', '🗺️', 'Mapa'], ['equipe', '⚔️', 'Equipe'], ['loja', '💰', 'Loja']];
  const pend = S.missoes.filter(m => m.status === 'enviada').length;
  const topo = pais
    ? `<div class="top"><button class="who" data-a="sair"><div class="ava" style="background:var(--gold)">✦</div><div><b>Painel dos pais</b><small>tocar para sair</small></div></button>${syncDot()}${somBtn()}</div>`
    : `<div class="top"><button class="who" data-a="sair"><div class="ava" style="background:${p.cor}">${esc((p.nick || p.nome)[0])}</div><div><b>${esc(p.nick || p.nome)}</b><small>${RANKS[rankIdx(p.xp)].nome}</small></div></button>
       <div class="res"><span class="ic-chama">🔥${p.chama}</span><span class="ic-lum">✦${p.lumens}</span><span class="ic-tal">◈${p.talentos}</span></div>${syncDot()}${somBtn()}</div>`;
  const corpo = pais ? telaPais() : telaFilho(p);
  const nav = `<nav class="nav">${abas.map(([k, i, n]) => `<button data-a="aba" data-k="${k}" class="${UI.aba === k ? 'on' : ''}"><span class="i">${i}</span>${n}${pais && k === 'avaliar' && pend ? `<span class="badge">${pend}</span>` : ''}</button>`).join('')}</nav>`;
  $app.innerHTML = topo + `<main class="screen">${corpo}</main>` + nav + (UI.overlay || '');
}
const somBtn = () => `<button class="btn sm" data-a="som" aria-label="Som">${UI.som ? '🔊' : '🔇'}</button>`;

function renderEntrada() {
  const ps = Object.values(S.players);
  $app.innerHTML = `<div class="entrada">
    <h1>VITRAL</h1><p class="sub">A Bruma e as Sete Moradas</p>
    ${ps.map(p => `<button class="perfil" data-a="entrar" data-k="${p.id}"><div class="ava" style="background:${p.cor}">${esc((p.nick || p.nome)[0])}</div><div style="flex:1">${esc(p.nick || p.nome)}<div class="muted small">${p.nick ? esc(p.nome) + ' · ' : ''}${RANKS[rankIdx(p.xp)].nome} · 🔥${p.chama}</div></div>›</button>`).join('')}
    <button class="perfil" data-a="entrar" data-k="pais"><div class="ava" style="background:var(--gold)">✦</div><div style="flex:1">Pais<div class="muted small">aprovar, acompanhar e lançar missões</div></div>🔒</button>
    <div class="grid2"><button class="btn sm" data-a="som">${UI.som ? '🔊 Som ligado' : '🔇 Ligar o som'}</button>
    <button class="btn sm" data-a="conectarTela">${conectado() ? `${syncDot()} Conectado` : '🔗 Conectar aparelho'}</button></div>
    <p class="small muted" style="text-align:center;margin:0">versão ${VERSAO_ASSETS}</p>
  </div>` + (UI.overlay || '');
}

// ===== FILHO =====
function telaFilho(p) {
  if (UI.aba === 'missoes') return telaMissoes(p);
  if (UI.aba === 'mapa') return telaMapa(p);
  if (UI.aba === 'equipe') return telaEquipe(p);
  if (UI.aba === 'loja') return telaLoja(p);
  return telaInicio(p);
}
function telaInicio(p) {
  const ri = rankIdx(p.xp), prox = RANKS[ri + 1];
  const pctRank = prox ? (p.xp - RANKS[ri].xp) / (prox.xp - RANKS[ri].xp) * 100 : 100;
  const vg = vigor(p), lv = larvasAtivas(p.id);
  const abertas = S.missoes.filter(m => m.pid === p.id && (m.status === 'aberta' || m.status === 'refazer'));
  const ps = Object.values(S.players);
  const fam = ps.reduce((s, x) => s + x.xp, 0) - S.config.xpFamiliaBase;
  const graca = p.gracaDia !== hoje();
  return `
  ${anjoBox(p)}
  ${graca ? `<button class="btn gold full" data-a="graca">🎁 Pegar a Graça de hoje (+2 Chama, +5 Lumens)</button>` : ''}
  ${lv.length ? `<div class="card" style="border-color:var(--bad)"><b>🐛 ${lv.length} Larva${lv.length > 1 ? 's' : ''} na área</b><p class="small muted">Elas drenam Fragmentos, congelam seus Talentos (${p.congelados} ◈) e bloqueiam o mapa. Repare e mande a foto.</p><button class="btn sm" data-a="aba" data-k="missoes">Ver Larvas</button></div>` : ''}
  <div class="card">
    <div class="row between"><span class="sec">Rank</span><b>${RANKS[ri].nome}</b></div>
    ${barra(pctRank)}<p class="small muted">${p.xp} XP${prox ? ` · faltam ${prox.xp - p.xp} para ${prox.nome}` : ''}</p>
    <div class="row between"><span class="sec">Vigor</span><b>${vg}%${fortalecido(p) ? ' · ✨ Fortalecido' : ''}</b></div>
    ${barra(vg, '#5fd39a')}
    <p class="small muted">${fortalecido(p) ? 'Revigorado pela Comunhão: +20% de XP e Fragmentos.' : 'O Vigor cai um pouco a cada dia. A Comunhão revigora.'}</p>
  </div>
  <div class="card">
    <div class="row between"><span class="sec">Missões de hoje</span><span class="muted small">${abertas.length} a fazer</span></div>
    ${abertas.slice(0, 4).map(m => missaoLinha(m)).join('') || '<p class="muted small">Tudo feito por hoje. Que tal uma Missão Secreta?</p>'}
    <button class="btn full" data-a="aba" data-k="missoes">Abrir missões</button>
  </div>
  <div class="card">
    <span class="sec">Torneio da Semana</span>
    ${ps.map(x => { const pc = x.semana === semanaDe() ? r(x.xpSemana / S.config.metaSemanal * 100) : 0; return `<div class="row between"><b>${esc(x.nome)}</b><span>${pc}% da meta</span></div>${barra(pc, x.cor)}`; }).join('')}
    <p class="small muted">Vence quem fizer o maior % da própria meta. Prêmio: Coroa + 5 Talentos.</p>
  </div>
  <div class="card">
    <span class="sec">Barra da Família</span>${barra(fam / S.config.metaFamilia * 100, '#e5546b')}
    <p class="small muted">${Math.max(0, fam)} de ${S.config.metaFamilia} XP juntos → ${esc(S.config.premioFamilia)}</p>
  </div>`;
}
function missaoLinha(m, extra = '') {
  return `<div class="mis"><span class="dot" style="background:${VIRTUDES[m.v].cor}"></span><div class="t"><b>${esc(m.titulo)}${m.secreta ? ' 🤫' : ''}${m.extra ? ' ⭐' : ''}</b><small>${TIPOS[m.tipo]?.nome || 'Reparo'} · ${VIRTUDES[m.v].nome}${m.comentario && m.status === 'refazer' ? ` · “${esc(m.comentario)}”` : ''}</small></div>${extra || stMissao(m)}</div>`;
}
function telaMissoes(p) {
  const sub = UI.sub || 'hoje';
  const minhas = S.missoes.filter(m => m.pid === p.id);
  const lista = sub === 'hoje' ? minhas.filter(m => m.status === 'aberta' || m.status === 'refazer')
    : sub === 'enviadas' ? minhas.filter(m => m.status === 'enviada') : minhas.filter(m => m.status === 'aprovada').slice(0, 30);
  const lv = larvasAtivas(p.id);
  return `
  <div class="tabs">${[['hoje', 'A fazer'], ['enviadas', 'Aguardando'], ['feitas', 'Aprovadas']].map(([k, n]) => `<button data-a="sub" data-k="${k}" class="${sub === k ? 'on' : ''}">${n}</button>`).join('')}</div>
  ${lista.map(m => missaoLinha(m, sub === 'hoje' ? `<button class="btn sm gold" data-a="enviar" data-k="${m.id}">📸 Enviar</button>` : '')).join('') || '<p class="muted">Nada por aqui.</p>'}
  ${sub === 'hoje' ? `<div class="card"><b>🤫 Missão Secreta</b><p class="small muted">Fez algo bom sem ninguém pedir? Conte e mande a foto. É a moeda mais rara do jogo.</p><button class="btn full" data-a="secreta">Propor Missão Secreta</button></div>` : ''}
  ${lv.length ? `<div class="card"><span class="sec">Larvas</span>${lv.map(l => `<div class="mis"><span style="font-size:1.4rem">🐛</span><div class="t"><b>${esc(LARVAS[l.tipo])}</b><small>${l.ninho ? 'NINHO · ' : ''}${fmtData(hoje(new Date(l.criadaEm)))}${l.status === 'reparo' ? ' · reparo enviado' : ''}</small></div>${l.status === 'ativa' ? `<button class="btn sm" data-a="reparar" data-k="${l.id}">Reparei</button>` : ''}</div>`).join('')}</div>` : ''}`;
}
function telaMapa(p) {
  const no = p.reino.no, sl = selos(p), lv = larvasAtivas(p.id).length, tot = REINO1.nos.length;
  const prox = REINO1.nos[no];
  let aviso = '';
  if (prox) {
    if (lv) aviso = '🐛 Uma Larva bloqueia o caminho. Repare na vida real.';
    else if (prox.t === 'bruma' && sl < prox.selos) aviso = `🌫 O próximo portão pede ${prox.selos} Selo${prox.selos > 1 ? 's' : ''} de Temperança (você tem ${sl}).`;
    else if (prox.t === 'boss' && !bossSemanaLiberado(p)) aviso = '👹 O boss da semana abre com a missão grande da semana aprovada.';
    else if (prox.t !== 'bruma' && p.chama < 1) aviso = '🔥 Sem Chama: cumpra uma missão real para jogar.';
  }
  return `<div class="vitral-head" style="background-image:url(assets/reinos/${REINO1.vitral}.jpg);height:220px"><div><span class="sec">Reino I · Temperança</span><h2>${REINO1.nome}</h2><p class="small muted">${Math.min(no, tot)} de ${tot} pontos · ${sl} Selo${sl === 1 ? '' : 's'} · 💊 ${p.pilulas}</p></div></div>
  ${barra(Math.min(no, tot) / tot * 100)}
  ${no >= tot ? `<div class="card" style="border-color:var(--gold)"><b>👑 Reino I libertado!</b><p class="small muted">Lenda desbloqueada: São Francisco de Assis. Os Vales de Pedra chegam na próxima versão.</p></div>` :
    `<div class="card"><span class="sec">Próximo ponto</span><b>${esc(prox.titulo)}</b>${aviso ? `<p class="small" style="color:var(--warn)">${aviso}</p>` : '<p class="small muted">Ande até ele no mapa. Cada ponto gasta 1 Chama.</p>'}</div>`}
  <button class="btn gold full" style="font-size:1.15rem;padding:16px" data-a="entrarReino">▶ Entrar no reino</button>
  ${telaDiario(p)}
  <p class="small muted" style="text-align:center">Segure o dedo na tela para andar. Na batalha, toque na hora certa para dar CRÍTICO e para DEFENDER.</p>`;
}
function telaEquipe(p) {
  const meus = Object.keys(p.devotos);
  return `<div class="card"><div class="row between"><div><span class="sec">Invocação</span><p class="small muted">${CUSTO_INVOCACAO} ✦ por invocação · 5★ garantido em até ${PITY_5} (faltam ${PITY_5 - p.pity})</p></div>
    <button class="btn gold" data-a="invocar" ${p.lumens < CUSTO_INVOCACAO ? 'disabled' : ''}>Invocar</button></div></div>
    <div class="row between"><p class="small muted" style="margin:0">Toque num devoto para ver os poderes e upar. Seu herói caminha com você; os outros são Aliados.</p><button class="btn sm" data-a="nickTrocar">✎ Nick</button></div>
    <div class="devs">${meus.sort((a, b) => (b === p.heroi) - (a === p.heroi)).map(k => { const d = DEVOTOS[k], st = p.devotos[k]; return `<button class="dev" data-a="dev" data-k="${k}" style="border-color:${VIRTUDES[d.v].cor}">${k === p.heroi ? '<span class="eq">HERÓI</span>' : '<span class="eq" style="background:#2b2540;color:var(--muted)">ALIADO</span>'}${img(devImg(k), d.nome)}<div class="n"><span>${d.nome}</span><span class="est">Nv${st.lvl}</span></div></button>`; }).join('')}</div>
    ${p.heroi ? telaDeck(p) : ''}
    <div class="card"><span class="sec">Fragmentos</span><div class="row wrap">${Object.entries(p.frag).map(([v, n]) => `<span class="pill" style="color:${VIRTUDES[v].cor}">${VIRTUDES[v].nome} ${n}</span>`).join('')}</div></div>
    <div class="card"><span class="sec">Recomeçar</span><p class="small muted">Volta ao Despertar (perguntas e roleta) e sorteia um herói de novo. Missões, Talentos e nick continuam.</p><button class="btn bad full" data-a="recomecar">↺ Recomeçar a jornada</button></div>`;
}
function telaLoja(p) {
  const meus = S.resgates.filter(x => x.pid === p.id && x.status === 'pedido');
  const cofre = p.cofre.reduce((s, c) => s + c.tal, 0);
  return `<div class="card"><div class="row between"><span class="sec">Seus Talentos</span><b class="ic-tal">◈ ${p.talentos}</b></div>
    ${p.congelados ? `<p class="small" style="color:var(--bad)">❄️ ${p.congelados} congelados por Larva. Repare para liberar.</p>` : ''}
    <p class="small muted">Talentos vêm de conquistas: boss da semana, missão épica, Missão Secreta, sequências e Torneio.</p></div>
    ${premiosAtivos().map(x => `<div class="mis"><span style="font-size:1.4rem">${{ pix: '💸', privilegio: '⏰', experiencia: '🎬', objeto: '🎁' }[x.tipo]}</span><div class="t"><b>${esc(x.nome)}</b><small>◈ ${x.custo}</small></div><button class="btn sm gold" data-a="resgatar" data-k="${x.id}" ${p.talentos < x.custo ? 'disabled' : ''}>Pedir</button></div>`).join('')}
    ${meus.length ? `<div class="card"><span class="sec">Pedidos</span>${meus.map(x => `<p class="small">⏳ ${esc(x.nome)} · pedido em ${fmtData(hoje(new Date(x.em)))}</p>`).join('')}<p class="small muted">Pix é pago no domingo, o Dia do Pagamento.</p></div>` : ''}
    <div class="card"><span class="sec">Cofre do Talento</span><p class="small muted">Guarde Talentos por 4 semanas e eles rendem 10%, como na parábola.</p>
      <p><b>${cofre} ◈</b> guardados</p>
      ${p.cofre.map(c => { const ok = Date.now() - c.em >= 28 * DIA; return `<div class="row between small"><span>${c.tal} ◈ desde ${fmtData(hoje(new Date(c.em)))}</span>${ok ? `<button class="btn sm good" data-a="cofreSacar" data-k="${c.id}">Sacar ${c.tal + Math.max(1, r(c.tal * .1))}</button>` : `<span class="muted">libera em ${Math.ceil((28 * DIA - (Date.now() - c.em)) / DIA)} d</span>`}</div>`; }).join('')}
      <button class="btn" data-a="cofreGuardar" ${p.talentos < 5 ? 'disabled' : ''}>Guardar 5 ◈</button></div>`;
}

// ===== PAIS =====
function telaPais() {
  if (UI.aba === 'rotina') return paisRotina();
  if (UI.aba === 'jogo') return paisJogo();
  if (UI.aba === 'missoes') return paisMissoes();
  if (UI.aba === 'mais') return paisMais();
  return paisAvaliar();
}
function paisAvaliar() {
  const fila = S.missoes.filter(m => m.status === 'enviada').sort((a, b) => a.enviadaEm - b.enviadaEm);
  if (!fila.length) return `<div class="card"><h3>Nada para avaliar</h3><p class="muted">Quando eles mandarem fotos, elas aparecem aqui. Avaliar no mesmo dia mantém a motivação.</p></div>`;
  return fila.map(m => { const p = S.players[m.pid]; return `<div class="card">
    <div class="row between"><b>${esc(p.nome)}</b><span class="muted small">${fmtData(m.data)}</span></div>
    ${missaoLinha(m, m.secreta ? '<span class="st enviada">secreta</span>' : m.reparo ? '<span class="st enviada">reparo</span>' : '')}
    ${fotoSrc(m) ? `<img class="foto" src="${fotoSrc(m)}" alt="Foto da missão">` : '<p class="muted small">Carregando a foto…</p>'}
    ${m.reparo ? `<button class="btn good full" data-a="aval" data-k="${m.id}" data-n="1">✔ Reparo aceito</button>` :
      `<div class="grid2" style="grid-template-columns:repeat(3,1fr)">${[1, 2, 3].map(n => `<button class="btn ${n === 3 ? 'gold' : ''}" data-a="aval" data-k="${m.id}" data-n="${n}">${estrelas(n)}</button>`).join('')}</div>`}
    <div class="row"><input id="com-${m.id}" placeholder="Comentário para refazer (opcional)"><button class="btn bad sm" data-a="refazer" data-k="${m.id}">Refazer</button></div>
  </div>`; }).join('');
}
function paisRotina() {
  const d = hoje();
  return Object.values(S.players).map(p => {
    const doDia = S.missoes.filter(m => m.pid === p.id && m.data === d);
    const dias = [...Array(7)].map((_, i) => { const dt = hoje(new Date(Date.now() - (6 - i) * DIA)); const n = S.missoes.filter(m => m.pid === p.id && m.status === 'aprovada' && hoje(new Date(m.avaliadaEm)) === dt).length; return `<div class="${n ? 'ok' : ''}"><b>${n}</b>${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][new Date(dt + 'T12:00').getDay()]}</div>`; }).join('');
    return `<div class="card"><div class="row between"><h3>${esc(p.nome)}</h3><span class="small muted">🔥 sequência ${p.streak} dia${p.streak === 1 ? '' : 's'}</span></div>
      <span class="sec">Hoje</span>${doDia.map(m => missaoLinha(m)).join('') || '<p class="muted small">Nenhuma missão hoje.</p>'}
      <span class="sec">Últimos 7 dias (missões aprovadas)</span><div class="dias">${dias}</div>
      <p class="small muted">Larvas ativas: ${larvasAtivas(p.id).length} · Vigor ${vigor(p)}%${fortalecido(p) ? ' · Fortalecido' : ''}</p></div>`;
  }).join('');
}
function paisJogo() {
  return Object.values(S.players).map(p => {
    const ri = rankIdx(p.xp);
    const ev = S.eventos.filter(e => e.pid === p.id).slice(0, 6);
    return `<div class="card"><div class="row between"><h3>${esc(p.nome)}</h3><span class="pill" style="color:var(--gold)">${RANKS[ri].nome}</span></div>
      <p class="small muted" style="margin:0">${p.heroi ? `Nick “${esc(p.nick || '-')}” · herói ${DEVOTOS[p.heroi].nome}` : 'Ainda não fez o Despertar'}</p>
      <table class="tabela"><tr><th>XP</th><td>${p.xp}</td><th>Semana</th><td>${r(p.xpSemana / S.config.metaSemanal * 100)}%</td></tr>
      <tr><th>Reino I</th><td>${Math.min(p.reino.no, REINO1.nos.length)}/${REINO1.nos.length}</td><th>Devotos</th><td>${Object.keys(p.devotos).length}/14</td></tr>
      <tr><th>Chama</th><td>${p.chama}</td><th>Lumens</th><td>${p.lumens}</td></tr>
      <tr><th>Talentos</th><td>${p.talentos}${p.congelados ? ` (+${p.congelados} ❄️)` : ''}</td><th>Vigor</th><td>${vigor(p)}%</td></tr></table>
      <p class="small muted">Time: ${p.equipe.map(k => DEVOTOS[k].nome).join(', ')}</p>
      <span class="sec">Últimos acontecimentos</span>${ev.map(e => `<p class="small">• ${esc(e.txt)} <span class="muted">${fmtData(hoje(new Date(e.em)))}</span></p>`).join('') || '<p class="muted small">Nada ainda.</p>'}
      <button class="btn sm" data-a="bonus" data-k="${p.id}">🎁 Dar 3 Chamas de bônus (destravar)</button></div>`;
  }).join('');
}
function formMissao() {
  const ps = Object.values(S.players);
  return `<div class="card"><h3>Nova missão</h3>
    <input id="nm-titulo" placeholder="O que fazer? Ex.: Estudar 1h para a prova">
    <div class="grid2"><select id="nm-tipo">${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}">${t.nome} (${t.xp} XP${t.tal ? `, ${t.tal} ◈` : ''})</option>`).join('')}</select>
    <select id="nm-v">${Object.entries(VIRTUDES).map(([k, v]) => `<option value="${k}">${v.nome}</option>`).join('')}</select></div>
    <div class="grid2"><select id="nm-para"><option value="ab">Os dois</option>${ps.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select>
    <select id="nm-rec"><option value="extra">Extra (só uma vez, hoje)</option><option value="diaria">Recorrente: todo dia</option><option value="semanal">Recorrente: toda semana</option></select></div>
    <button class="btn gold" data-a="criarMissao">Lançar missão</button></div>`;
}
function paisMissoes() {
  const rec = modelosAtivos();
  const extras = S.missoes.filter(m => m.extra && m.status !== 'aprovada');
  return `${formMissao()}
    <div class="card"><span class="sec">Recorrentes</span><p class="small muted">Aparecem sozinhas todo dia ou toda semana.</p>
      ${rec.map(mo => `<div class="mis"><span class="dot" style="background:${VIRTUDES[mo.v].cor}"></span><div class="t"><b>${esc(mo.titulo)}${mo.exemplo ? ' <span class="muted small">(exemplo)</span>' : ''}</b><small>${TIPOS[mo.tipo].nome} · ${mo.rec === 'diaria' ? 'todo dia' : mo.rec === 'semanal' ? 'toda semana' : 'uma vez'} · ${mo.para.map(i => esc(S.players[i].nome)).join(' e ')}</small></div><button class="btn sm bad" data-a="apagarModelo" data-k="${mo.id}">✕</button></div>`).join('') || '<p class="muted small">Nenhuma.</p>'}</div>
    <div class="card"><span class="sec">Extras em aberto</span>${extras.map(m => missaoLinha(m, `<span class="small muted">${esc(S.players[m.pid].nome)}</span>`)).join('') || '<p class="muted small">Nenhuma extra em aberto.</p>'}</div>`;
}
function paisMais() {
  const ps = Object.values(S.players);
  const pend = S.resgates.filter(x => x.status === 'pedido');
  const emit = ps.reduce((s, p) => s + ((p.emitidos || {})[mesAtual()] || 0), 0);
  return `<div class="card"><h3>Registrar</h3>
    <div class="grid2"><select id="rg-p">${ps.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select>
    <select id="rg-l">${Object.entries(LARVAS).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
    <div class="grid2"><button class="btn bad" data-a="larva">🐛 Registrar Larva</button><button class="btn good" data-a="comunhao">✨ Comungou hoje</button></div>
    <p class="small muted">A Comunhão revigora o personagem (Vigor 100% e +20% por 7 dias). Nunca rende Talentos.</p></div>
    <div class="card"><h3>Resgates</h3>${pend.map(x => `<div class="mis"><div class="t"><b>${esc(x.nome)}</b><small>${esc(S.players[x.pid].nome)} · ◈ ${x.custo}</small></div><button class="btn sm good" data-a="entregue" data-k="${x.id}">Pago/entregue</button></div>`).join('') || '<p class="muted small">Nenhum pedido.</p>'}
      <p class="small muted">Talentos emitidos este mês: <b>${emit}</b> ≈ R$ ${(emit * S.config.valorTalento).toFixed(2).replace('.', ',')} (a R$ ${S.config.valorTalento.toFixed(2).replace('.', ',')} cada)</p></div>
    <div class="card"><h3>Loja dos Pais</h3>${premiosAtivos().map(x => `<div class="row between small"><span>${esc(x.nome)} · ◈ ${x.custo}</span><button class="btn sm bad" data-a="apagarPremio" data-k="${x.id}">✕</button></div>`).join('')}
      <input id="pr-nome" placeholder="Novo prêmio (ex.: Pix de R$ 10)"><div class="grid2"><select id="pr-tipo"><option value="pix">Pix</option><option value="privilegio">Privilégio</option><option value="experiencia">Experiência</option><option value="objeto">Objeto</option></select><input id="pr-custo" type="number" min="1" placeholder="Custo em ◈"></div>
      <button class="btn" data-a="criarPremio">Adicionar prêmio</button></div>
    <div class="card"><h3>Ajustes</h3>
      ${ps.map(p => `<label class="small muted">Nome de ${p.id === 'a' ? 'um filho' : 'outro filho'}<input id="aj-n-${p.id}" value="${esc(p.nome)}"></label>`).join('')}
      <label class="small muted">Valor de 1 Talento em R$<input id="aj-vt" type="number" step="0.1" value="${S.config.valorTalento}"></label>
      <label class="small muted">Meta semanal de XP (Torneio)<input id="aj-ms" type="number" value="${S.config.metaSemanal}"></label>
      <label class="small muted">Prêmio da Barra da Família<input id="aj-pf" value="${esc(S.config.premioFamilia)}"></label>
      <label class="small muted">Novo PIN dos pais<input id="aj-pin" placeholder="deixe vazio para manter"></label>
      <button class="btn gold" data-a="salvarAjustes">Salvar ajustes</button>
      <button class="btn sm" data-a="familiaZerar">Barra da Família entregue: recomeçar</button>
      <button class="btn sm bad" data-a="resetar">Apagar os dados deste aparelho</button></div>
    ${(() => { let l = []; try { l = JSON.parse(localStorage.getItem(ERROS) || '[]'); } catch {} return l.length ? `<div class="card"><h3>Erros deste aparelho</h3><p class="small muted">Se algo travar, tire um print desta lista e mande para o Claude.</p>${l.map(x => `<p class="small" style="margin:0"><b>${esc(x.em)}</b> · v${esc(x.v)} · ${esc(x.tela)}<br>${esc(x.msg)} <span class="muted">(${esc(x.onde)})</span></p>`).join('')}</div>` : ''; })()}
    <div class="card"><h3>Sincronização</h3>
      <p class="small muted">${conectado() ? `Conectado ${syncDot()} · última sincronização ${S.sync.ultima ? new Date(S.sync.ultima).toLocaleTimeString('pt-BR') : 'ainda não'}${UI.syncErro ? ' · ' + esc(UI.syncErro) : ''}` : 'Este aparelho ainda não está conectado.'}</p>
      ${conectado() ? `<p class="small">Código da família: <b>${esc(S.sync.chave)}</b> · use o mesmo código nos celulares dos filhos.</p><button class="btn sm" data-a="sincronizarJa">Sincronizar agora</button>` : '<button class="btn sm gold" data-a="conectarTela">Conectar este aparelho</button>'}</div>`;
}

// ---------- invocação ----------
function invocar(p) {
  if (p.lumens < CUSTO_INVOCACAO) return;
  p.lumens -= CUSTO_INVOCACAO; p.pity++;
  const cinco = p.pity >= PITY_5 || Math.random() < 0.06;
  const pool = Object.keys(DEVOTOS).filter(k => DEVOTOS[k].est === (cinco ? 5 : 4));
  const k = pick(pool), d = DEVOTOS[k];
  if (cinco) p.pity = 0;
  let extra;
  if (p.devotos[k]) { p.devotos[k].dup++; p.frag[d.v] += 5; extra = `Repetido: +5 Fragmentos de ${VIRTUDES[d.v].nome}`; }
  else { p.devotos[k] = { lvl: 1, dup: 0 }; darCarta(p, 'ali:' + k, false); extra = 'Novo Aliado! A carta dele entrou no seu deck.'; }
  evento(p.id, `Invocou ${d.nome} ${estrelas(d.est)}`);
  salvar(); tocar('12-invocacao'); cinco ? SFX.fanfarra() : SFX.moeda();
  UI.overlay = `<div class="over" data-a="fechar"><div class="box revela">${img(devImg(k), d.nome)}<div class="est" style="font-size:1.4rem">${estrelas(d.est)}</div><h2>${d.nome}</h2><p class="muted">${FEM.has(k) ? 'devota' : 'devoto'} de ${d.santo}</p><p><i>“${esc(d.fala)}”</i></p><p class="small" style="color:var(--gold)">${extra}</p><button class="btn gold">Fechar</button></div></div>`;
}
// ---------- evolução do herói ----------
const estagio = nv => [...ESTAGIOS].reverse().find(e => nv >= e.nv);
const nivelHeroi = p => (p.heroi && p.devotos[p.heroi]?.lvl) || 1;
function ganharXpHeroi(p, n) {
  if (!p.heroi || !n) return;
  const st = p.devotos[p.heroi]; p.hxp = (p.hxp || 0) + n;
  while (st.lvl < NIVEL_MAX && p.hxp >= xpProNivel(st.lvl)) {
    p.hxp -= xpProNivel(st.lvl); st.lvl++; p.pontos = (p.pontos || 0) + 3;
    const antes = estagio(st.lvl - 1), agora = estagio(st.lvl);
    evento(p.id, agora !== antes ? `${DEVOTOS[p.heroi].nome} virou ${agora.nome} (Nv ${st.lvl})!` : `${DEVOTOS[p.heroi].nome} subiu para o Nv ${st.lvl}`);
    p.subiu = st.lvl; // a tela de pontos avisa na próxima vez
    (CARTAS_POR_NIVEL[st.lvl] || []).forEach(id => darCarta(p, id));
  }
}
// ---------- Diário do Anjo e libertação dos chefes ----------
const artePagina = e => e.arte || (e.tipo === 'capanga' ? `assets/jogo/${e.k}.png` : `assets/sete/${e.k}.jpg`);
function mostrarLibertacao(p) {
  const e = DIARIO.find(x => x.k === p.libertar); p.libertar = null; salvar();
  if (!e) return;
  SFX.sinos();
  UI.overlay = `<div class="over"><div class="box revela">
    <span class="sec">Libertado!</span>
    <img src="assets/sete/${e.k}-livre.jpg" alt="${esc(e.pessoa)} livre" style="width:100%;max-width:none;border-radius:14px">
    <h2>${esc(e.pessoa)} está livre</h2>
    <p class="small">O Apagado que agarrava ${esc(e.pessoa)} fugiu para a Bruma. A cor voltou.</p>
    <div class="anjo" style="text-align:left">${img('assets/anjo/emocionado.jpg', 'Anjo')}<div class="bubble">${esc(e.licao)}</div></div>
    <p class="small" style="color:var(--gold)">📖 Página nova no Diário do Anjo</p>
    <button class="btn gold" data-a="libertacaoOk">Continuar</button></div></div>`;
  render();
}
function telaDiario(p) {
  const d = p.diario || {}, lista = DIARIO.filter(e => e.tipo !== 'capanga'), caps = DIARIO.filter(e => e.tipo === 'capanga');
  const n = DIARIO.filter(e => d[e.k]).length;
  const cel = e => d[e.k]
    ? `<button class="pag" data-a="pagina" data-k="${e.k}"><img src="${artePagina(e)}" alt="${esc(e.nome)}"${e.cinza ? ' style="filter:grayscale(1) brightness(.8)"' : ''}><b>${esc(e.nome)}</b><small>${esc(e.vicio)}</small></button>`
    : `<div class="pag fechada"><img src="${artePagina(e)}" alt=""><b>???</b><small>${e.tipo === 'oculto' ? 'oculto' : `Reino ${e.reino}`}</small></div>`;
  return `<div class="card"><span class="sec">📖 Diário do Anjo · ${n}/${DIARIO.length} páginas</span>
    <p class="small muted" style="margin:0">Cada inimigo vencido abre a página dele: quem era, a passagem da Bíblia e a lição.</p>
    <p class="small" style="margin:4px 0 0"><b>Os Sete Apagados</b></p><div class="pags">${lista.map(cel).join('')}</div>
    <p class="small" style="margin:4px 0 0"><b>Capangas</b></p><div class="pags">${caps.map(cel).join('')}</div></div>`;
}
function abrirPagina(p, k) {
  const e = DIARIO.find(x => x.k === k);
  UI.overlay = `<div class="over"><div class="box">
    <img src="${artePagina(e)}" alt="${esc(e.nome)}" style="width:100%;max-height:46vh;object-fit:contain;border-radius:14px;background:#0b0912">
    <div><span class="sec">${e.tipo === 'chefe' ? `Reino ${e.reino} · ${e.vicio}` : e.vicio}</span><h2>${esc(e.nome)}</h2></div>
    <p class="small"><b>Quem era:</b> ${esc(e.era)}</p>
    ${e.biblia ? `<p class="small"><b>Na Bíblia:</b> ${esc(e.biblia)} <span class="muted">(${e.ref})</span></p>` : ''}
    <p class="small"><b>Na vida real:</b> ${esc(e.vida)}</p>
    <p class="small"><b>Golpe:</b> ${esc(e.golpe)}</p>
    ${e.v ? `<p class="small"><b>Quem vence:</b> ${VIRTUDES[e.v].nome}</p>` : ''}
    <div class="anjo">${img('assets/anjo/orgulhoso.jpg', 'Anjo')}<div class="bubble">${esc(e.licao)}</div></div>
    <button class="btn sm" data-a="fechar">Fechar</button></div></div>`;
}
// ---------- cartas de poder ----------
// id 'ali:<devoto>' é a carta de um Aliado: ele entra na luta e usa o Dom dele
function cartaInfo(p, id) {
  const usos = (p.cartas?.[id]?.usos) || 0, nv = nivelCarta(usos), up = 1 + 0.15 * (nv - 1);
  if (id.startsWith('ali:')) {
    const k = id.slice(4), d = DEVOTOS[k];
    return { id, nome: d.nome, ic: '🤝', ef: d.dom[1], mult: up, txt: `Aliado: ${d.dom[0]}`, aliado: k, nv, usos };
  }
  const c = CARTAS[id]; return { id, ...c, mult: c.mult * up, nv, usos };
}
function darCarta(p, id, avisar = true) {
  p.cartas = p.cartas || {}; p.deck = p.deck || [];
  if (p.cartas[id]) return;
  p.cartas[id] = { usos: 0 };
  if (p.deck.length < DECK_MAX) p.deck.push(id);
  const c = cartaInfo(p, id);
  evento(p.id, `Carta nova: ${c.nome}`);
  if (avisar) { toast(`🃏 Carta nova: ${c.nome}`); SFX.fanfarra(); }
}
// garante as cartas que o herói já devia ter (nível alcançado e Aliados), também para quem jogava antes
function garantirCartas(p) {
  if (!p.heroi) return;
  const nv = nivelHeroi(p);
  Object.entries(CARTAS_POR_NIVEL).forEach(([n, ids]) => { if (nv >= +n) ids.forEach(id => darCarta(p, id, false)); });
  Object.keys(p.devotos).forEach(k => { if (k !== p.heroi) darCarta(p, 'ali:' + k, false); });
  if (p.reino.lendas.length) darCarta(p, 'anjo', false);
}
const cartaHtml = (c, extra = '') => `<span class="ic">${c.ic}</span><span class="cn"><b>${esc(c.nome)}</b><small>${esc(c.txt)}</small></span><span class="cv">Nv${c.nv}</span>${extra}`;
function telaDeck(p) {
  const todas = Object.keys(p.cartas || {}), deck = p.deck || [];
  const prox = Object.entries(CARTAS_POR_NIVEL).find(([n]) => +n > nivelHeroi(p));
  return `<div class="card"><div class="row between"><span class="sec">Deck de cartas · ${deck.length}/${DECK_MAX}</span></div>
    <p class="small muted" style="margin:0">Na batalha, cada carta vale uma vez. Toque para tirar ou pôr no deck. Usar bastante sobe o nível da carta.</p>
    <div class="cartas">${todas.map(id => { const c = cartaInfo(p, id), on = deck.includes(id); return `<button class="carta ${on ? 'on' : ''}" data-a="deckTroca" data-k="${id}">${cartaHtml(c, `<span class="cd">${on ? 'NO DECK' : 'fora'}</span>`)}</button>`; }).join('')}</div>
    ${prox ? `<p class="small muted" style="margin:0">Próxima carta no Nv ${prox[0]}: ${CARTAS[prox[1][0]].nome}</p>` : ''}</div>`;
}
function telaBarras(p, titulo) {
  const k = p.heroi, nv = nivelHeroi(p), b = p.barras || {};
  return `<div class="over"><div class="box">
    <div class="row"><img src="${devImg(k)}" alt="${DEVOTOS[k].nome}" style="width:72px;border-radius:12px;background:#ddd"><div><span class="sec">${titulo}</span><h3>${DEVOTOS[k].nome} · Nv ${nv}</h3><p class="small muted" style="margin:0">${p.pontos} ponto${p.pontos === 1 ? '' : 's'} para distribuir</p></div></div>
    ${barrasDe(k).map(([c, nome, ef]) => `<button class="barra-esc" data-a="barra" data-k="${c}"><div class="row between"><b>${nome}</b><span class="small muted">${b[c] || 0} · ${BARRA_EFEITO[ef].txt}</span></div>${barra(Math.min(100, (b[c] || 0) * 4))}</button>`).join('')}
    <button class="btn sm" data-a="fechar">Guardar pontos para depois</button></div></div>`;
}
function abrirBarras(p) {
  const subiu = p.subiu; p.subiu = 0;
  UI.overlay = telaBarras(p, subiu ? `Subiu para o Nv ${subiu}!` : 'Vitória! Escolha o que fica mais forte');
  if (subiu) { SFX.fanfarra(); falaAnjo(p, 'rank'); }
  render();
}
function detalheDevoto(p, k) {
  const d = DEVOTOS[k], st = p.devotos[k], custo = st.lvl * 3;
  if (k === p.heroi) {
    const nv = st.lvl, e = estagio(nv), prox = ESTAGIOS.find(x => x.nv > nv), s = stats(k, nv), b = p.barras || {};
    UI.overlay = `<div class="over"><div class="box">
      <div class="row"><img src="${devImg(k)}" alt="${d.nome}" style="width:96px;border-radius:12px;background:#ddd"><div><span class="sec">★ Seu herói · ${e.nome}</span><h2>${d.nome}</h2>${virtPill(d.v)}<p class="small muted">${FEM.has(k) ? 'devota' : 'devoto'} de ${d.santo}</p></div></div>
      <div><div class="row between small"><b>Nível ${nv}/${NIVEL_MAX}</b><span class="muted">${nv >= NIVEL_MAX ? 'máximo' : `${p.hxp || 0}/${xpProNivel(nv)} XP`}</span></div>${barra(nv >= NIVEL_MAX ? 100 : (p.hxp || 0) / xpProNivel(nv) * 100)}
      <p class="small muted" style="margin:4px 0 0">${prox ? `Armadura nova no Nv ${prox.nv}: ${prox.nome}` : 'Forma Lendária alcançada'}</p></div>
      <p class="small" style="margin:0">❤️ ${s.hp} · ⚔️ ${s.atk} · 🛡️ ${s.def}% · ✴️ ${s.crit}% · ✨ +${s.dom}%</p>
      ${barrasDe(k).map(([c, nome, ef]) => `<div><div class="row between small"><b>${nome}</b><span class="muted">${b[c] || 0} · ${BARRA_EFEITO[ef].txt}</span></div>${barra(Math.min(100, (b[c] || 0) * 4))}</div>`).join('')}
      ${p.pontos ? `<button class="btn gold" data-a="barrasAbrir">Distribuir ${p.pontos} ponto${p.pontos === 1 ? '' : 's'}</button>` : '<p class="small muted" style="margin:0">Cada vitória dá 1 ponto e cada nível dá mais 3. O nível sobe com as missões aprovadas e as batalhas.</p>'}
      <p class="small"><b>Dom:</b> ${d.dom[0]} · <b>Supremo:</b> ${d.sup[0]}</p>
      <button class="btn sm" data-a="fechar">Fechar</button></div></div>`;
    return;
  }
  UI.overlay = `<div class="over"><div class="box">
    <div class="row"><img src="${devImg(k)}" alt="${d.nome}" style="width:96px;border-radius:12px;background:#ddd"><div><h2>${d.nome}</h2><div class="est">${estrelas(d.est)}</div>${virtPill(d.v)}<p class="small muted">${FEM.has(k) ? 'devota' : 'devoto'} de ${d.santo}</p></div></div>
    <p><i>“${esc(d.fala)}”</i></p>
    <p class="small"><b>Dom:</b> ${d.dom[0]} · <b>Supremo:</b> ${d.sup[0]}</p>
    <p class="small muted">Nível ${st.lvl}/20 · upar custa ${custo} Fragmentos de ${VIRTUDES[d.v].nome} (você tem ${p.frag[d.v]})</p>
    <button class="btn gold" data-a="upar" data-k="${k}" ${p.frag[d.v] < custo || st.lvl >= 20 ? 'disabled' : ''}>Upar para nível ${st.lvl + 1}</button>
    <p class="small" style="color:var(--gold);margin:0">${k === p.heroi ? '★ Seu herói' : '✦ Aliado: entra nas batalhas como carta especial (em breve)'}</p>
    <button class="btn sm" data-a="fechar">Fechar</button></div></div>`;
}

// ---------- jogo (motor em game.js) ----------
function stats(k, lvl) {
  const d = DEVOTOS[k], hp = d.est === 5 ? 130 : 110, atk = d.est === 5 ? 24 : 19, f = 1 + 0.1 * (lvl - 1);
  // o herói luta sozinho contra grupos que antes enfrentavam um time de 4: mesma base para todos, mais fôlego e as barras
  const p = UI.perfil && S.players[UI.perfil];
  if (p && p.heroi === k) {
    const g = 1 + 0.06 * (lvl - 1), soma = { vida: 0, ataque: 0, defesa: 0, critico: 0, dom: 0 };
    barrasDe(k).forEach(([c, , ef]) => { soma[ef] += ((p.barras || {})[c] || 0) * BARRA_EFEITO[ef].por; });
    return { hp: r(320 * g + soma.vida), atk: r(40 * g + soma.ataque), def: Math.min(BARRA_EFEITO.defesa.max, soma.defesa),
      crit: Math.min(BARRA_EFEITO.critico.max, 5 + soma.critico), dom: r(soma.dom) };
  }
  return { hp: r(hp * f), atk: r(atk * f), def: 0, crit: 0, dom: 0 };
}
let JOGO = null;
const VERSAO_ASSETS = '14';
function hudJogo() {
  const p = pAtual(), h = document.getElementById('jogo-hud'); if (!h || !p) return;
  h.innerHTML = `<button class="btn sm" data-a="sairJogo">‹ Sair</button><b style="flex:1;text-align:center">${REINO1.nome}</b><span class="ic-chama">🔥${p.chama}</span><span class="ic-lum">✦${p.lumens}</span><span>💊${p.pilulas}</span>`;
}
function abrirJogo() {
  const p = pAtual();
  if (!p.heroi) return abrirDesperta();
  let box = document.getElementById('jogo');
  if (!box) {
    box = document.createElement('div'); box.id = 'jogo';
    box.innerHTML = '<div id="jogo-hud"></div><div id="jogo-canvas"></div>';
    document.body.appendChild(box);
  }
  box.hidden = false; hudJogo();
  const iniciar = () => { if (!JOGO) JOGO = window.criarJogo('jogo-canvas'); else JOGO.scene.start('explorar'); };
  const reino = () => { if (!p.reino.abertura) { p.reino.abertura = true; salvar(); tocarVideo('abertura-r1', iniciar); } else iniciar(); };
  // na primeira vez, o Prólogo (a queda e a origem da Bruma) vem antes de tudo
  if (!p.prologo) { p.prologo = true; salvar(); tocarVideo('prologo', reino); } else reino();
}
function fecharJogo() {
  const box = document.getElementById('jogo'); if (box) box.hidden = true;
  if (JOGO) { JOGO.destroy(true); JOGO = null; const c = document.getElementById('jogo-canvas'); if (c) c.innerHTML = ''; }
  UI.aba = 'mapa'; tocar(REINO1.musica); render();
}
function tocarVideo(nome, depois) {
  const v = document.createElement('div'); v.className = 'video';
  v.innerHTML = `<video src="assets/video/${nome}.mp4" playsinline autoplay ${UI.som ? '' : 'muted'}></video><button class="btn sm">Pular ›</button>`;
  document.body.appendChild(v);
  const fim = () => { if (!v.isConnected) return; v.remove(); depois && depois(); };
  const el = v.querySelector('video'); el.onended = fim; el.onerror = fim; v.querySelector('button').onclick = fim;
  el.play().catch(() => { el.muted = true; el.play().catch(fim); });
}
function mostrarHistoria(n, depois) {
  let k = 0;
  const o = document.createElement('div'); o.className = 'over'; document.body.appendChild(o);
  const passo = () => {
    if (k >= n.txt.length) { o.remove(); return depois(); }
    const expr = k === n.txt.length - 1 ? 'orgulhoso' : k === 0 ? 'rindo' : 'chocado';
    o.innerHTML = `<div class="box"><div class="anjo">${img('assets/anjo/' + expr + '.jpg', 'Anjo')}<div class="bubble">${esc(n.txt[k])}</div></div><button class="btn gold">Continuar</button></div>`;
    k++;
  };
  o.onclick = passo; passo();
}
window.VJ = {
  versao: VERSAO_ASSETS, DEVOTOS, INIMIGOS, COMBOS, reino: REINO1, stats,
  p: () => pAtual(),
  salvar: () => { salvar(); hudJogo(); },
  larvas: () => larvasAtivas(UI.perfil).length,
  musica: f => tocar(f),
  sfx: k => SFX[k] && SFX[k](),
  video: (nome, depois) => tocarVideo(nome, depois),
  sair: () => fecharJogo(),
  // a batalha precisa parar: scene.start pelo jogo não fecha a cena que estava rodando
  // cartas na batalha: a lista do deck, a bandeja para escolher (HTML por cima do jogo) e o contador de uso
  cartas: () => { const p = pAtual(); return (p.deck || []).filter(id => p.cartas?.[id]).map(id => cartaInfo(p, id)); },
  escolherCarta: lista => new Promise(ok => {
    UI.cartaEscolhida = ok;
    UI.overlay = `<div class="over"><div class="box"><span class="sec">Suas cartas</span>
      <div class="cartas">${lista.map(c => `<button class="carta on" data-a="cartaUsar" data-k="${c.id}">${cartaHtml(c)}</button>`).join('')}</div>
      <button class="btn sm" data-a="cartaUsar" data-k="">Voltar</button></div></div>`;
    render();
  }),
  usouCarta: id => {
    const p = pAtual(), c = p.cartas[id]; if (!c) return;
    const antes = nivelCarta(c.usos); c.usos++;
    if (nivelCarta(c.usos) > antes) toast(`🃏 ${cartaInfo(p, id).nome} subiu para Nv${nivelCarta(c.usos)}!`);
    salvar();
  },
  voltarMapa: () => {
    hudJogo(); if (!JOGO) return; JOGO.scene.stop('batalha'); JOGO.scene.start('explorar');
    const p = pAtual();
    if (p.libertar) return mostrarLibertacao(p);
    if (p.pontos > 0 && p.ganhouAgora) { p.ganhouAgora = false; abrirBarras(p); }
  },
  perder: () => { const p = pAtual(); falaAnjo(p, 'derrota'); salvar(); hudJogo(); },
  // chamado quando o herói chega no próximo ponto do mapa
  interagir(i) {
    const p = pAtual(), n = REINO1.nos[i];
    const avisa = (t, som = 'toin') => { toast(t); SFX[som](); return { tipo: 'bloqueado' }; };
    if (larvasAtivas(p.id).length) { falaAnjo(p, 'larva'); salvar(); return avisa('Uma Larva bloqueia o caminho. Repare na vida real e mande a foto.', 'blob'); }
    if (n.t === 'bruma') {
      if (selos(p) < n.selos) return avisa(`A Bruma não deixa passar. Precisa de ${n.selos} Selo${n.selos > 1 ? 's' : ''} de Temperança: cada 3 missões de Temperança aprovadas = 1 Selo.`);
      p.reino.no++; evento(p.id, `Abriu ${n.titulo}`); SFX.sinos(); salvar(); hudJogo(); toast('O Selo dissolveu a Bruma!'); return { tipo: 'ok' };
    }
    if (n.t === 'boss' && !bossSemanaLiberado(p)) return avisa('O boss da semana só sai com a missão grande da semana aprovada.');
    if (p.chama < 1) { falaAnjo(p, 'semChama'); salvar(); return avisa('Sem Chama! Cumpra uma missão de verdade para continuar.'); }
    p.chama--; salvar(); hudJogo();
    if (n.t === 'historia') {
      mostrarHistoria(n, () => {
        if (n.ganha && !p.devotos[n.ganha]) { p.devotos[n.ganha] = { lvl: 1, dup: 0 }; darCarta(p, 'ali:' + n.ganha, false); toast(`${DEVOTOS[n.ganha].nome} virou seu Aliado! Carta nova no deck`); SFX.fanfarra(); }
        p.reino.no++; salvar(); hudJogo(); JOGO && JOGO.scene.start('explorar');
      });
      return { tipo: 'historia' };
    }
    if (n.t === 'bau') { p.lumens += 8; p.pilulas++; p.reino.no++; SFX.moeda(); salvar(); hudJogo(); toast('Baú! +8 Lumens e 1 Pílula de Frei Galvão'); return { tipo: 'ok' }; }
    if (n.t === 'santuario') { p.pilulas += 2; p.chama = Math.min(CHAMA_MAX, p.chama + 1); p.reino.no++; SFX.sinos(); salvar(); hudJogo(); toast('Capela: +2 Pílulas e a Chama de volta'); return { tipo: 'ok' }; }
    if (!p.equipe.some(k => p.devotos[k])) { p.chama++; salvar(); return avisa('Monte um time na aba Equipe.'); }
    return { tipo: 'batalha', video: n.t === 'chefe' ? 'chefe-r1' : null };
  },
  vencer(no) {
    const p = pAtual(); p.lumens += 3; falaAnjo(p, 'vitoria');
    let texto = '+3 Lumens', video = null;
    if (no.t === 'chefe') {
      p.reino.lendas.push(no.lenda); p.lumens += 20; video = 'vitoria-r1'; darCarta(p, 'anjo');
      texto = `As Colinas Brancas estão livres!\nLenda desbloqueada: ${no.lenda}\n+23 Lumens`;
      evento(p.id, `Libertou as Colinas Brancas: Lenda ${no.lenda}`);
    } else evento(p.id, `Venceu: ${no.titulo}`);
    // Diário do Anjo: cada inimigo vencido abre a página dele
    p.diario = p.diario || {};
    no.inimigos.forEach(k => { if (DIARIO.some(x => x.k === k) && !p.diario[k]) { p.diario[k] = Date.now(); p.paginaNova = true; } });
    if (no.t === 'chefe') p.libertar = no.inimigos[0];
    // evolução: XP para o herói e 1 ponto de barra por vitória (a escolha aparece ao voltar para o mapa)
    const xp = no.t === 'chefe' ? 80 : no.t === 'boss' ? 45 : 18;
    ganharXpHeroi(p, xp); p.pontos = (p.pontos || 0) + 1; p.ganhouAgora = true;
    texto += `\n+${xp} XP · +1 ponto de barra`;
    p.reino.no++; salvar(); hudJogo();
    return { texto, video };
  },
};

// ---------- ações ----------
const pAtual = () => S.players[UI.perfil];
const ACOES = {
  async entrar(k) {
    if (k === 'pais') {
      UI.overlay = `<div class="over"><div class="box"><h3>Área dos pais</h3><input id="pin" type="password" placeholder="PIN" autocomplete="off"><button class="btn gold" data-a="pin">Entrar</button><button class="btn sm" data-a="fechar">Cancelar</button><p class="small muted">PIN inicial do protótipo: 1234. Troque em Mais → Ajustes.</p></div></div>`;
      return render();
    }
    UI.perfil = k; UI.aba = 'inicio'; UI.sub = ''; rodadaDiaria(); tocar('01-abertura'); render();
    garantirCartas(S.players[k]);
    if (!S.players[k].heroi) abrirDesperta();
    else if (S.players[k].subiu && S.players[k].pontos > 0) abrirBarras(S.players[k]); // subiu de nível com missão aprovada
  },
  pin() {
    const v = (document.getElementById('pin').value || '').trim().toLowerCase();
    if (v !== String(S.config.pin).trim().toLowerCase()) { SFX.toin(); return toast('PIN errado'); }
    UI.overlay = null; UI.perfil = 'pais'; UI.aba = 'avaliar'; rodadaDiaria(); render();
  },
  sair() { UI.perfil = null; UI.overlay = null; tocar('01-abertura'); render(); },
  som() { UI.som = !UI.som; if (!UI.som) $mus.pause(); else tocar(UI.perfil && UI.perfil !== 'pais' && UI.aba === 'mapa' ? REINO1.musica : '01-abertura'); render(); },
  aba(k) { UI.aba = k; UI.sub = ''; UI.overlay = null; if (UI.perfil !== 'pais') tocar(k === 'mapa' ? REINO1.musica : k === 'equipe' ? '12-invocacao' : '01-abertura'); render(); window.scrollTo(0, 0); },
  sub(k) { UI.sub = k; render(); },
  fechar() { UI.overlay = null; render(); },
  graca() { const p = pAtual(); if (p.gracaDia === hoje()) return; p.gracaDia = hoje(); p.chama = Math.min(CHAMA_MAX, p.chama + 2); p.lumens += 5; falaAnjo(p, 'graca'); SFX.sinos(); salvar(); render(); },
  async enviar(id) {
    const m = S.missoes.find(x => x.id === id); const foto = await escolherFoto(); if (!foto) return;
    m.fotoLocal = foto; m.thumb = await miniatura(foto); m.status = 'enviada'; m.enviadaEm = Date.now(); m.comentario = ''; toque('missoes', m);
    SFX.moeda(); salvar(); toast('Enviada! Agora é com os pais.'); render();
  },
  secreta() {
    UI.overlay = `<div class="over"><div class="box"><h3>🤫 Missão Secreta</h3><input id="sc-t" placeholder="O que você fez sem ninguém pedir?">
      <div class="grid2"><select id="sc-tipo">${['diaria', 'casa', 'escola'].map(k => `<option value="${k}">${TIPOS[k].nome}</option>`).join('')}</select><select id="sc-v">${Object.entries(VIRTUDES).map(([k, v]) => `<option value="${k}">${v.nome}</option>`).join('')}</select></div>
      <button class="btn gold" data-a="secretaEnviar">📸 Tirar foto e enviar</button><button class="btn sm" data-a="fechar">Cancelar</button></div></div>`;
    render();
  },
  async secretaEnviar() {
    const t = document.getElementById('sc-t').value.trim(); if (!t) return toast('Escreva o que você fez');
    const tipo = document.getElementById('sc-tipo').value, v = document.getElementById('sc-v').value;
    const foto = await escolherFoto(); if (!foto) return;
    const m = criarMissao(UI.perfil, { titulo: t, tipo, v }); m.secreta = true; m.fotoLocal = foto; m.thumb = await miniatura(foto); m.status = 'enviada'; m.enviadaEm = Date.now(); toque('missoes', m);
    UI.overlay = null; SFX.moeda(); salvar(); toast('Missão Secreta enviada!'); render();
  },
  async reparar(id) {
    const l = S.larvas.find(x => x.id === id); const foto = await escolherFoto(); if (!foto) return;
    const m = criarMissao(UI.perfil, { titulo: `Reparo: ${LARVAS[l.tipo]}`, tipo: 'diaria', v: 'jus' });
    m.reparo = l.id; m.fotoLocal = foto; m.thumb = await miniatura(foto); m.status = 'enviada'; m.enviadaEm = Date.now(); toque('missoes', m);
    l.status = 'reparo'; toque('larvas', l); salvar(); toast('Reparo enviado para os pais'); render();
  },
  invocar() { invocar(pAtual()); render(); },
  dev(k) { detalheDevoto(pAtual(), k); render(); },
  upar(k) { const p = pAtual(), d = DEVOTOS[k], st = p.devotos[k], c = st.lvl * 3; if (p.frag[d.v] < c) return; p.frag[d.v] -= c; st.lvl++; SFX.fanfarra(); salvar(); detalheDevoto(p, k); render(); },
  timeTroca(k) {
    // a jornada é com um herói só; os outros devotos são Aliados
    const p = pAtual();
    toast(k === p.heroi ? `${DEVOTOS[k].nome} é o seu herói` : `${DEVOTOS[k].nome} é Aliado: entra nas batalhas como carta especial (em breve)`);
  },
  resgatar(id) {
    const p = pAtual(), x = S.premios.find(y => y.id === id); if (!x || p.talentos < x.custo) return;
    p.talentos -= x.custo; const rg = { id: uid(), pid: p.id, premioId: x.id, nome: x.nome, custo: x.custo, status: 'pedido', em: Date.now() }; S.resgates.unshift(rg); toque('resgates', rg);
    evento(p.id, `Pediu: ${x.nome}`); SFX.moeda(); salvar(); toast('Pedido enviado aos pais'); render();
  },
  cofreGuardar() { const p = pAtual(); if (p.talentos < 5) return; p.talentos -= 5; p.cofre.push({ id: uid(), tal: 5, em: Date.now() }); SFX.moeda(); salvar(); render(); },
  cofreSacar(id) { const p = pAtual(), c = p.cofre.find(x => x.id === id); if (!c) return; const ganho = c.tal + Math.max(1, r(c.tal * .1)); p.talentos += ganho; p.emitidos[mesAtual()] = (p.emitidos[mesAtual()] || 0) + (ganho - c.tal); p.cofre = p.cofre.filter(x => x !== c); SFX.fanfarra(); salvar(); toast(`+${ganho} Talentos`); render(); },
  entrarReino() { abrirJogo(); },
  sairJogo() { fecharJogo(); },
  // pais
  aval(id, n) { const m = S.missoes.find(x => x.id === id); aprovar(m, +n); n == 3 ? SFX.fanfarra() : SFX.moeda(); render(); },
  refazer(id) { const m = S.missoes.find(x => x.id === id); pedirRefazer(m, document.getElementById('com-' + id).value.trim()); SFX.toin(); render(); },
  criarMissao() {
    const titulo = document.getElementById('nm-titulo').value.trim(); if (!titulo) return toast('Escreva a missão');
    const tipo = document.getElementById('nm-tipo').value, v = document.getElementById('nm-v').value;
    const para = document.getElementById('nm-para').value === 'ab' ? ['a', 'b'] : [document.getElementById('nm-para').value];
    const rec = document.getElementById('nm-rec').value;
    if (rec === 'extra') { para.forEach(pid => criarMissao(pid, { titulo, tipo, v }, null, true)); toast('Missão extra lançada'); }
    else {
      const mo = { id: uid(), titulo, tipo, v, rec, para }; S.modelos.push(mo); toque('modelos', mo);
      para.forEach(pid => criarMissao(pid, mo, mo.id, false, rec === 'diaria' ? `${mo.id}_${pid}_${hoje()}` : `${mo.id}_${pid}_${semanaDe()}`));
      toast('Missão recorrente criada');
    }
    salvar(); render();
  },
  apagarModelo(id) { const mo = S.modelos.find(m => m.id === id); if (mo) { mo.apagado = true; toque('modelos', mo); } salvar(); render(); },
  larva() {
    const pid = document.getElementById('rg-p').value, tipo = document.getElementById('rg-l').value, p = S.players[pid];
    const semana = S.larvas.filter(l => l.pid === pid && l.tipo === tipo && Date.now() - l.criadaEm < 7 * DIA).length;
    const lv = { id: uid(), pid, tipo, criadaEm: Date.now(), status: 'ativa', ninho: semana >= 2 }; S.larvas.unshift(lv); toque('larvas', lv);
    evento(pid, `Larva: ${LARVAS[tipo]}${semana >= 2 ? ' (virou Ninho)' : ''}`); SFX.blob(); salvar(); toast(`Larva registrada para ${p.nome}`); render();
  },
  comunhao() { const pid = document.getElementById('rg-p').value, p = S.players[pid]; const rg = { id: uid(), tipo: 'comunhao', pid, em: Date.now() }; S.registros.push(rg); toque('registros', rg); evento(pid, 'Comungou: Revigorado (Vigor 100%, +20% por 7 dias)'); SFX.sinos(); salvar(); toast(`${p.nome} foi Revigorado`); render(); },
  bonus(pid) { const rg = { id: uid(), tipo: 'bonus', pid, chama: 3, em: Date.now() }; S.registros.push(rg); toque('registros', rg); evento(pid, 'Bônus dos pais: +3 Chamas'); salvar(); toast('+3 Chamas'); render(); },
  entregue(id) { const x = S.resgates.find(y => y.id === id); x.status = 'entregue'; x.entregueEm = Date.now(); toque('resgates', x); evento(x.pid, `Recebeu: ${x.nome}`); salvar(); render(); },
  criarPremio() {
    const nome = document.getElementById('pr-nome').value.trim(), custo = +document.getElementById('pr-custo').value;
    if (!nome || !custo) return toast('Preencha nome e custo');
    const pr = { id: uid(), nome, tipo: document.getElementById('pr-tipo').value, custo }; S.premios.push(pr); toque('premios', pr); salvar(); render();
  },
  apagarPremio(id) { const pr = S.premios.find(x => x.id === id); if (pr) { pr.apagado = true; toque('premios', pr); } salvar(); render(); },
  salvarAjustes() {
    Object.values(S.players).forEach(p => { const v = document.getElementById('aj-n-' + p.id).value.trim(); if (v) S.config.nomes[p.id] = v; });
    S.config.valorTalento = +document.getElementById('aj-vt').value || S.config.valorTalento;
    S.config.metaSemanal = +document.getElementById('aj-ms').value || S.config.metaSemanal;
    S.config.premioFamilia = document.getElementById('aj-pf').value.trim() || S.config.premioFamilia;
    const pin = document.getElementById('aj-pin').value.trim(); if (pin) S.config.pin = pin;
    toque('config', S.config); aplicarNomes(); salvar(); toast('Ajustes salvos'); render();
  },
  familiaZerar() { S.config.xpFamiliaBase = Object.values(S.players).reduce((s, x) => s + x.xp, 0); toque('config', S.config); salvar(); toast('Barra da Família recomeçou'); render(); },
  resetar() {
    UI.overlay = `<div class="over"><div class="box"><h3>Apagar os dados deste aparelho?</h3><p class="muted">Este aparelho é desconectado e volta ao zero: missões, fotos e personagens daqui somem. O que já foi sincronizado continua salvo na planilha e volta quando você conectar de novo.</p>${deslizar('resetarSim', 'Arraste para apagar tudo')}<button class="btn" data-a="fechar">Cancelar</button></div></div>`; render();
  },
  // filho: recomeçar a jornada do zero (novo Despertar), mantendo missões, XP de rank, Talentos e Cofre
  recomecar() {
    UI.overlay = `<div class="over"><div class="box"><h3>Recomeçar a jornada?</h3>
      <p class="muted small">Você volta ao Despertar e sorteia um herói novo. Zera: herói, nível, barras, Aliados, mapa e Lumens.</p>
      <p class="small" style="color:var(--good);margin:0">Continua: missões, XP de rank, Talentos, Cofre e pedidos da Loja.</p>
      ${deslizar('recomecarSim', 'Arraste para recomeçar')}<button class="btn" data-a="fechar">Cancelar</button></div></div>`; render();
  },
  recomecarSim() {
    const p = pAtual();
    Object.assign(p, { heroi: null, devotos: {}, equipe: [], barras: {}, pontos: 0, hxp: 0, subiu: 0, ganhouAgora: false, cartas: {}, deck: [],
      reino: { no: 0, lendas: [] }, lumens: 20, pity: 0, prologo: false });
    evento(p.id, 'Recomeçou a jornada'); salvar(); UI.overlay = null; render(); abrirDesperta();
  },
  barra(c) {
    const p = pAtual(); if (!(p.pontos > 0)) return;
    p.barras = p.barras || {}; p.barras[c] = (p.barras[c] || 0) + 1; p.pontos--; SFX.moeda(); salvar();
    if (p.pontos > 0) UI.overlay = telaBarras(p, 'Mais pontos para distribuir');
    else { UI.overlay = null; toast(`${barrasDe(p.heroi).find(x => x[0] === c)[1]} subiu!`); }
    render();
  },
  barrasAbrir() { abrirBarras(pAtual()); },
  pagina(k) { const p = pAtual(); p.paginaNova = false; abrirPagina(p, k); render(); },
  libertacaoOk() { const p = pAtual(); UI.overlay = null; render(); if (p.pontos > 0 && p.ganhouAgora) { p.ganhouAgora = false; abrirBarras(p); } },
  deckTroca(id) {
    const p = pAtual();
    if (p.deck.includes(id)) p.deck = p.deck.filter(x => x !== id);
    else if (p.deck.length >= DECK_MAX) return toast(`Deck cheio: tire uma carta antes (máximo ${DECK_MAX})`);
    else p.deck.push(id);
    salvar(); render();
  },
  cartaUsar(id) { const fn = UI.cartaEscolhida; UI.cartaEscolhida = null; UI.overlay = null; render(); fn && fn(id || null); },
  resetarSim() { S = estadoInicial(); localSalvar(); UI.overlay = null; UI.perfil = null; render(); },
  conectarTela() {
    UI.overlay = `<div class="over"><div class="box"><h3>🔗 Conectar este aparelho</h3>
      <p class="small muted">Digite o código da família. Use o mesmo código no celular de cada filho e no de vocês.</p>
      <input id="cx-chave" placeholder="Código da família" value="${esc(S.sync.chave || '')}" autocomplete="off" style="text-transform:uppercase">
      ${window.CONFIG && window.CONFIG.api_url ? '' : `<input id="cx-url" placeholder="Endereço do servidor (https://script.google.com/...)" value="${esc(S.sync.url || '')}">`}
      <button class="btn gold" data-a="conectarSim">Conectar</button><button class="btn sm" data-a="fechar">Cancelar</button></div></div>`;
    render();
  },
  async conectarSim() {
    const chave = document.getElementById('cx-chave').value.trim();
    const url = (document.getElementById('cx-url') || {}).value?.trim() || S.sync.url || (window.CONFIG && window.CONFIG.api_url);
    if (!chave || !url) return toast('Preencha o código');
    toast('Conectando…');
    try { await conectar(url, chave); UI.overlay = null; toast('Aparelho conectado!'); SFX.sinos(); render(); }
    catch (e) { S.sync.chave = ''; localSalvar(); toast('Não conectou: ' + (e.message || e)); }
  },
  sincronizarJa() { sincronizar().then(() => { toast(UI.sync === 'ok' ? 'Tudo sincronizado' : 'Sem conexão agora'); render(); }); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const fn = ACOES[el.dataset.a]; if (!fn) return;
  e.preventDefault();
  // um botão que dá erro não pode congelar a tela: registra qual foi e segue
  try { const r = fn(el.dataset.k, el.dataset.n); if (r && r.catch) r.catch(err => registrarErro(err && err.message || err, 'botão ' + el.dataset.a)); }
  catch (err) { registrarErro(err && err.message || err, 'botão ' + el.dataset.a); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && document.getElementById('pin')) ACOES.pin(); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
render();
if (conectado()) sincronizar();
