// VITRAL — sincronização entre aparelhos (servidor: apps_script/Code.gs)
// Cada registro (missão, Larva, pedido...) sincroniza sozinho e vale a versão mais nova ("upd").
// O personagem de cada filho só é alterado no aparelho do próprio filho; os pais aprovam e
// registram, e a recompensa cai quando o aparelho do filho recebe a aprovação (processar()).
'use strict';

const CAMPOS_LOCAIS = ['fotoLocal'];
let syncRodando = false, syncTimer = null;
const fotosCache = {}, fotosPedidas = {};

function marcar(col, id) {
  const pend = S.sync.pend;
  (pend[col] = pend[col] || []).includes(id) || pend[col].push(id);
}
function toque(col, rec) { rec.upd = Date.now(); marcar(col, rec.id); }
function registroDe(col, id) {
  if (col === 'players') return S.players[id];
  if (col === 'config') return S.config;
  return (S[col] || []).find(x => x.id === id);
}
function semLocais(rec) { const o = { ...rec }; CAMPOS_LOCAIS.forEach(k => delete o[k]); return o; }
const conectado = () => !!(S.sync && S.sync.url && S.sync.chave);

async function api(corpo) {
  const r = await fetch(S.sync.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...corpo, chave: S.sync.chave }) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.erro || 'erro no servidor');
  return j;
}
function agendarSync(ms = 1200) { if (!conectado()) return; clearTimeout(syncTimer); syncTimer = setTimeout(sincronizar, ms); }

async function sincronizar() {
  if (!conectado() || syncRodando || !navigator.onLine) { pintarSync(); return; }
  syncRodando = true; UI.sync = 'indo'; pintarSync();
  try {
    for (const m of S.missoes.filter(x => x.fotoLocal && !x.fotoId)) {
      const j = await api({ acao: 'foto', dataUrl: m.fotoLocal, nome: m.id });
      m.fotoId = j.id; fotosCache[j.id] = m.fotoLocal; delete m.fotoLocal; toque('missoes', m);
    }
    const pend = S.sync.pend; S.sync.pend = {};
    const recs = [];
    Object.entries(pend).forEach(([col, ids]) => ids.forEach(id => {
      const rec = registroDe(col, id); if (rec) recs.push({ col, id, upd: rec.upd || 0, dado: semLocais(rec) });
    }));
    let j;
    try { j = await api({ acao: 'sync', desde: S.sync.desde || 0, recs }); }
    catch (e) { Object.entries(pend).forEach(([col, ids]) => ids.forEach(id => marcar(col, id))); throw e; }
    mesclar(j.recs);
    S.sync.desde = j.agora - 5000; S.sync.ultima = Date.now(); UI.sync = 'ok'; UI.syncErro = '';
  } catch (e) {
    UI.sync = 'erro'; UI.syncErro = String(e.message || e);
  } finally {
    syncRodando = false; localSalvar(); pintarSync();
  }
}

function mesclar(recs) {
  let mudou = false;
  recs.forEach(({ col, id, upd, dado }) => {
    if (col === 'players') {
      const loc = S.players[id];
      if (!loc || upd > (loc.upd || 0)) { S.players[id] = dado; mudou = true; }
      return;
    }
    if (col === 'config') { if (upd >= (S.config.upd || 0)) { S.config = { ...S.config, ...dado }; mudou = true; } return; }
    const lista = S[col] || (S[col] = []);
    const i = lista.findIndex(x => x.id === id);
    if (i < 0) { lista.push(dado); mudou = true; }
    else if (upd > (lista[i].upd || 0)) {
      const local = lista[i]; lista[i] = { ...dado };
      if (local.fotoLocal && !dado.fotoId) lista[i].fotoLocal = local.fotoLocal;
      mudou = true;
    }
  });
  if (!mudou) return;
  S.eventos.sort((a, b) => b.em - a.em); S.eventos.length = Math.min(S.eventos.length, 300);
  S.missoes.sort((a, b) => (b.criadaEm || 0) - (a.criadaEm || 0));
  aplicarNomes();
  if (UI.perfil && UI.perfil !== 'pais' && S.players[UI.perfil]) processar(S.players[UI.perfil]);
  redesenhar();
}

// Depois de sincronizar, redesenha sem atrapalhar quem está digitando ou jogando
function redesenhar() {
  const jogo = document.getElementById('jogo');
  if (jogo && !jogo.hidden) { hudJogo(); return; }
  const foco = document.activeElement;
  if (foco && /INPUT|SELECT|TEXTAREA/.test(foco.tagName)) return;
  if (document.querySelector('.over')) return;
  render();
}

// Primeira conexão de um aparelho: se o servidor já tem dados, este aparelho adota os do servidor;
// se o servidor está vazio, este aparelho envia tudo o que tem.
async function conectar(url, chave) {
  S.sync = { url, chave: chave.trim().toUpperCase(), desde: 0, pend: {} };
  const j = await api({ acao: 'sync', desde: 0, recs: [] });
  if (j.recs.length) {
    ['missoes', 'larvas', 'resgates', 'eventos', 'modelos', 'premios', 'registros'].forEach(c => S[c] = []);
    const temPlayers = j.recs.some(x => x.col === 'players');
    if (temPlayers) S.players = {};
    mesclar(j.recs);
    if (!temPlayers) Object.values(S.players).forEach(p => marcar('players', p.id));
  } else {
    ['missoes', 'larvas', 'resgates', 'eventos', 'modelos', 'premios', 'registros'].forEach(c => (S[c] || []).forEach(r => marcar(c, r.id)));
    Object.values(S.players).forEach(p => marcar('players', p.id));
    S.config.id = 'config'; marcar('config', 'config');
  }
  S.sync.desde = j.agora - 5000;
  localSalvar();
  await sincronizar();
}

function fotoSrc(m) {
  if (m.fotoLocal) return m.fotoLocal;
  if (m.fotoId) {
    if (fotosCache[m.fotoId]) return fotosCache[m.fotoId];
    if (!fotosPedidas[m.fotoId] && conectado()) {
      fotosPedidas[m.fotoId] = 1;
      api({ acao: 'verFoto', id: m.fotoId }).then(j => { fotosCache[m.fotoId] = j.dataUrl; redesenhar(); }).catch(() => { delete fotosPedidas[m.fotoId]; });
    }
  }
  return m.thumb || null;
}

function syncDot() {
  if (!conectado()) return '<span class="sdot off" title="Este aparelho não está conectado"></span>';
  const pend = Object.values(S.sync.pend || {}).reduce((s, l) => s + l.length, 0);
  const c = UI.sync === 'erro' ? 'erro' : (pend || UI.sync === 'indo') ? 'indo' : 'ok';
  return `<span class="sdot ${c}" title="${c === 'ok' ? 'Sincronizado' : c === 'erro' ? 'Sem conexão: ' + esc(UI.syncErro || '') : 'Sincronizando…'}"></span>`;
}
function pintarSync() { document.querySelectorAll('.sdot').forEach(el => el.outerHTML = syncDot()); }

if (typeof window !== 'undefined') {
  setInterval(() => sincronizar(), 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sincronizar(); });
  window.addEventListener('online', () => sincronizar());
}
