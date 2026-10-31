// VITRAL — "O Despertar": quiz de 5 perguntas + roleta que sorteia o herói inicial.
// O quiz soma pontos por Virtude; as 3 mais fortes entram na roleta (peso maior para a mais forte).
'use strict';

const HEROI_DA_VIRTUDE = { fe: 'simo', esp: 'gio', car: 'guto', tem: 'clara', pru: 'kael', for: 'luzia', jus: 'tonho' };

const QUIZ = [
  { p: 'Sábado livre. Você…', r: [['car', 'chama a galera pra fazer alguma coisa'], ['pru', 'se fecha no PC editando ou montando algo'], ['for', 'vai treinar ou jogar bola'], ['tem', 'some no mato, na praia ou no silêncio']] },
  { p: 'Seu amigo tá mal. Você…', r: [['esp', 'fica do lado dele, mesmo sem falar nada'], ['jus', 'vai lá e resolve o problema'], ['car', 'faz ele rir até esquecer'], ['fe', 'reza por ele e fala que vai passar']] },
  { p: 'No trabalho em grupo você é…', r: [['fe', 'quem puxa e lidera'], ['pru', 'quem pesquisa e acha a resposta'], ['jus', 'quem cobra o prazo de todo mundo'], ['tem', 'quem acalma a briga']] },
  { p: 'Pode escolher um superpoder:', r: [['for', 'nunca se cansar'], ['pru', 'saber o que os outros pensam'], ['esp', 'curar qualquer ferida'], ['tem', 'voar']] },
  { p: 'O que mais te tira do sério?', r: [['jus', 'injustiça'], ['for', 'gente que desiste fácil'], ['fe', 'mentira'], ['car', 'ver alguém sozinho e largado']] },
];

const DESP = { passo: 0, pontos: {}, ordem: [], top: [], escolhido: null };
const embaralha = a => a.map(x => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map(x => x[1]);

function abrirDesperta() {
  DESP.passo = 0; DESP.pontos = {}; DESP.top = []; DESP.escolhido = null;
  DESP.ordem = QUIZ.map(q => embaralha(q.r));
  telaDesperta();
}

function telaDesperta() {
  const p = pAtual();
  let corpo;
  if (DESP.passo === 0) {
    corpo = `<div class="anjo">${img('assets/anjo/rindo.jpg', 'Anjo')}<div class="bubble">E aí, ${esc(p.nome)}! Sou o seu Anjo da Guarda. Antes de entrar na Bruma, preciso saber quem você é de verdade. São 5 perguntas, e não tem resposta errada.</div></div>
      <button class="btn gold full" data-a="despSeguir">Bora</button>`;
  } else if (DESP.passo <= QUIZ.length) {
    const i = DESP.passo - 1, q = QUIZ[i];
    corpo = `<span class="sec">Pergunta ${DESP.passo} de ${QUIZ.length}</span><h2 class="desp-q">${q.p}</h2>
      <div class="desp-ops">${DESP.ordem[i].map(([v, t]) => `<button class="btn" data-a="despResp" data-k="${v}">${t}</button>`).join('')}</div>`;
  } else {
    corpo = `<span class="sec">O Despertar</span><h2 class="desp-q">Três devotos responderam ao seu chamado</h2>
      <p class="small muted">Só um vai caminhar com você. Gire e deixa a luz escolher.</p>
      <div class="roleta">${DESP.top.map((v, j) => { const k = HEROI_DA_VIRTUDE[v]; return `<div class="rcarta" id="rc${j}" style="--cor:${VIRTUDES[v].cor}"><img src="${devImg(k)}" alt="Devoto misterioso"><span>${VIRTUDES[v].nome}</span></div>`; }).join('')}</div>
      <div id="desp-fim"><button class="btn gold full" id="btnGirar" data-a="despGirar">✦ Girar</button></div>`;
  }
  UI.overlay = `<div class="over desp"><div class="box">${corpo}</div></div>`;
  render();
}

function sortearHeroi() {
  // desempate aleatório entre Virtudes com a mesma pontuação
  const vs = embaralha(Object.keys(VIRTUDES)).sort((a, b) => (DESP.pontos[b] || 0) - (DESP.pontos[a] || 0));
  DESP.top = vs.slice(0, 3);
  const pesos = DESP.top.map(v => ((DESP.pontos[v] || 0) + 1) ** 2);
  let x = Math.random() * pesos.reduce((s, n) => s + n, 0);
  DESP.escolhido = DESP.top.find((v, j) => (x -= pesos[j]) < 0) || DESP.top[0];
}

function girarRoleta() {
  const fim = DESP.top.indexOf(DESP.escolhido);
  // várias voltas, desacelerando; a penúltima parada é a do lado ("passou raspando")
  const passos = 3 * 4 + fim + 1;
  let n = 0;
  document.getElementById('btnGirar').disabled = true;
  tocar('12-invocacao');
  const marca = j => DESP.top.forEach((_, i) => document.getElementById('rc' + i).classList.toggle('vez', i === j));
  const passo = () => {
    marca(n % 3); SFX.moeda && n % 2 === 0 && SFX.moeda();
    n++;
    if (n < passos) return setTimeout(passo, 70 + 520 * (n / passos) ** 3);
    setTimeout(revelar, 650);
  };
  passo();
}

function revelar() {
  const p = pAtual(), v = DESP.escolhido, k = HEROI_DA_VIRTUDE[v], d = DEVOTOS[k], j = DESP.top.indexOf(v);
  DESP.top.forEach((_, i) => { if (i !== j) document.getElementById('rc' + i).classList.add('some'); });
  document.getElementById('rc' + j).classList.add('ganhou');
  SFX.fanfarra();
  // o herói passa a ser o único do time; quem já estava na conta vira Aliado
  p.heroi = k;
  p.devotos[k] = p.devotos[k] || { lvl: 1, dup: 0 };
  p.equipe = [k];
  evento(p.id, `Despertou com ${d.nome}, ${FEM.has(k) ? 'devota' : 'devoto'} de ${d.santo}`);
  salvar();
  setTimeout(() => {
    document.getElementById('desp-fim').innerHTML = `<h2 style="text-align:center;margin:0">${d.nome}</h2>
      <p class="small muted" style="text-align:center;margin:0">${FEM.has(k) ? 'devota' : 'devoto'} de ${d.santo} · ${VIRTUDES[v].nome}</p>
      <p style="text-align:center"><i>“${esc(d.fala)}”</i></p>
      <button class="btn gold full" data-a="despFim">Começar a jornada</button>`;
  }, 1500);
}

Object.assign(ACOES, {
  despSeguir() { DESP.passo++; telaDesperta(); },
  despResp(v) {
    DESP.pontos[v] = (DESP.pontos[v] || 0) + 1; DESP.passo++;
    if (DESP.passo > QUIZ.length) sortearHeroi();
    SFX.moeda && SFX.moeda(); telaDesperta();
  },
  despGirar() { girarRoleta(); },
  despFim() { UI.overlay = null; tocar('01-abertura'); render(); },
});
