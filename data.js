// VITRAL — dados fixos do jogo (Bíblia: https://claude.ai/artifact/FmTzWaYF1TCzNXeTMQRACz)

const VIRTUDES = {
  fe:  { nome: 'Fé',         cor: '#e9c46a' },
  esp: { nome: 'Esperança',  cor: '#4cc38a' },
  car: { nome: 'Caridade',   cor: '#e5546b' },
  tem: { nome: 'Temperança', cor: '#5aa9e6' },
  pru: { nome: 'Prudência',  cor: '#a77bf3' },
  for: { nome: 'Fortaleza',  cor: '#f08a3c' },
  jus: { nome: 'Justiça',    cor: '#c9d1dc' },
};

// efeito: dano | area | cura | escudo | buff | atordoa | revive | sorte
const DEVOTOS = {
  jana:  { nome: 'Jana',  est: 5, v: 'fe',  santo: 'Santa Joana d\'Arc',      dom: ['As Vozes', 'buff'],          sup: ['Avante!', 'area'],              fala: 'Não tenho medo. Nasci pra isso.' },
  simo:  { nome: 'Simo',  est: 4, v: 'fe',  santo: 'São Pedro',               dom: ['Rede Cheia', 'atordoa'],     sup: ['Sobre as Águas', 'area'],       fala: 'Eu vou primeiro! …alguém me segura?' },
  tessa: { nome: 'Tessa', est: 5, v: 'esp', santo: 'Santa Teresinha',         dom: ['Pequeno Caminho', 'cura'],   sup: ['Chuva de Rosas', 'cura'],       fala: 'Não precisa ser grande. Só precisa ser com amor.' },
  gio:   { nome: 'Gio',   est: 4, v: 'esp', santo: 'São Padre Pio',           dom: ['Bilocação', 'dano'],         sup: ['Reza, Espera e Não se Preocupa', 'escudo'], fala: 'Reza, espera e não se preocupa. O resto é comigo.' },
  duda:  { nome: 'Duda',  est: 5, v: 'car', santo: 'Santa Dulce dos Pobres',  dom: ['O Galinheiro', 'cura'],      sup: ['Anjo Bom', 'revive'],           fala: 'Tem sempre lugar pra mais um.' },
  guto:  { nome: 'Guto',  est: 4, v: 'car', santo: 'Santo Agostinho',         dom: ['Tolle Lege', 'sorte'],       sup: ['Coração Inquieto', 'dano'],     fala: 'Já procurei felicidade em todo lugar.' },
  cisco: { nome: 'Cisco', est: 5, v: 'tem', santo: 'São Francisco de Assis',  dom: ['Irmãos Animais', 'area'],    sup: ['Cântico das Criaturas', 'area'], fala: 'Menos é mais. Muito mais.' },
  clara: { nome: 'Clara', est: 4, v: 'tem', santo: 'Santa Clara',             dom: ['Luz que Afasta', 'escudo'],  sup: ['Escudo do Sol', 'escudo'],      fala: 'Fica atrás de mim.' },
  kael:  { nome: 'Kael',  est: 5, v: 'pru', santo: 'São Carlo Acutis',        dom: ['Mapa dos Milagres', 'atordoa'], sup: ['Autoestrada pro Céu', 'dano'], fala: 'Original. Nunca cópia.' },
  avila: { nome: 'Ávila', est: 4, v: 'pru', santo: 'Santa Teresa d\'Ávila',   dom: ['Castelo Interior', 'escudo'], sup: ['Flecha de Fogo', 'dano'],      fala: 'Só Deus basta. E um bom plano também ajuda.' },
  yuri:  { nome: 'Yuri',  est: 5, v: 'for', santo: 'São Jorge',               dom: ['Investida', 'dano'],         sup: ['Lança do Dragão', 'dano'],      fala: 'Quanto maior o dragão, melhor.' },
  luzia: { nome: 'Luzia', est: 4, v: 'for', santo: 'Santa Luzia',             dom: ['Inabalável', 'escudo'],      sup: ['Olhos de Luz', 'atordoa'],      fala: 'Pode empurrar. Eu não saio daqui.' },
  zeca:  { nome: 'Zeca',  est: 5, v: 'jus', santo: 'São José',                dom: ['Construir', 'escudo'],       sup: ['O Sonho', 'dano'],              fala: '…Deixa comigo.' },
  tonho: { nome: 'Tonho', est: 4, v: 'jus', santo: 'Santo Antônio',           dom: ['Achados e Perdidos', 'area'], sup: ['Sermão aos Peixes', 'area'],   fala: 'Perdeu? Relaxa, eu acho.' },
};
const FEM = new Set(['jana', 'tessa', 'duda', 'clara', 'avila', 'luzia']);
const DEVOTOS_INICIAIS =['clara', 'simo', 'tonho', 'luzia'];

// Duas virtudes seguidas no mesmo turno disparam um combo
const COMBOS = [
  { a: 'fe',  b: 'for', nome: 'Cruzada',         ef: 'atordoa' },
  { a: 'car', b: 'esp', nome: 'Coração Aberto',  ef: 'cura' },
  { a: 'tem', b: 'pru', nome: 'Mente Serena',    ef: 'carga' },
  { a: 'jus', b: 'for', nome: 'Martelo Justo',   ef: 'dano' },
  { a: 'fe',  b: 'esp', nome: 'Âncora',          ef: 'escudo' },
  { a: 'car', b: 'jus', nome: 'Reparação',       ef: 'cura' },
  { a: 'tem', b: 'car', nome: 'Partilha',        ef: 'carga' },
];

// Valores base por tipo de missão (Bíblia, seção Economia e Jogabilidade)
const TIPOS = {
  diaria: { nome: 'Diária',       xp: 10,  frag: 1,  tal: 0,  chama: 1, lum: 2 },
  casa:   { nome: 'Casa',         xp: 20,  frag: 2,  tal: 0,  chama: 1, lum: 2 },
  escola: { nome: 'Escola',       xp: 25,  frag: 2,  tal: 0,  chama: 1, lum: 2 },
  boss:   { nome: 'Boss semanal', xp: 100, frag: 5,  tal: 3,  chama: 3, lum: 5 },
  epica:  { nome: 'Épica',        xp: 250, frag: 10, tal: 10, chama: 5, lum: 10 },
};
const ESTRELAS = { 1: 1, 2: 1.5, 3: 2 };

const RANKS = [
  { nome: 'Peregrino', xp: 0 }, { nome: 'Explorador', xp: 4000 }, { nome: 'Escudeiro', xp: 10000 },
  { nome: 'Cavaleiro', xp: 17000 }, { nome: 'Guardião', xp: 25000 }, { nome: 'Sal da Terra', xp: 34000 },
  { nome: 'Luz do Mundo', xp: 44000 }, { nome: 'Original', xp: 55000 },
];

const CHAMA_MAX = 20;
const CUSTO_INVOCACAO = 10;
const PITY_5 = 40;

// Exemplos de missões recorrentes (os pais editam no painel)
const MISSOES_EXEMPLO = [
  { titulo: 'Tomar o remédio na hora', tipo: 'diaria', v: 'tem', rec: 'diaria' },
  { titulo: 'Arrumar a cama',          tipo: 'diaria', v: 'tem', rec: 'diaria' },
  { titulo: 'Dever de casa',           tipo: 'escola', v: 'pru', rec: 'diaria' },
  { titulo: 'Lavar a louça do almoço', tipo: 'casa',   v: 'car', rec: 'diaria' },
  { titulo: 'Guardar a roupa lavada',  tipo: 'casa',   v: 'car', rec: 'unica' },
  { titulo: 'Faxina completa do quarto', tipo: 'boss', v: 'for', rec: 'semanal' },
];

const LARVAS = {
  copo:  'Copo ou prato largado',
  roupa: 'Roupa pelo chão',
  bagunca: 'Bagunça deixada',
  combinado: 'Combinado não cumprido',
};

// Reino I — Colinas Brancas (Temperança). Selo: 3 missões de Temperança aprovadas.
const REINO1 = {
  nome: 'Colinas Brancas', v: 'tem', vitral: 'r1', musica: '02-colinas-brancas',
  nos: [
    { t: 'historia', titulo: 'O chamado', txt: ['Aí, finalmente! Sou o seu Anjo da Guarda. Antes que você pergunte: sim, a espada é de luz de verdade.', 'Tá vendo aquele cinza descendo as colinas? É a Bruma. Ela apaga a cor das coisas e deixa as pessoas iguaizinhas, umas cópias sem graça.', 'A gente vai devolver a cor, peça por peça. Bora?'] },
    { t: 'batalha',  titulo: 'Larvas na estrada', inimigos: ['larva', 'larva'] },
    { t: 'bau',      titulo: 'Baú do vinhedo' },
    { t: 'batalha',  titulo: 'Cópias no olival', inimigos: ['copia', 'larva', 'copia'] },
    { t: 'bruma',    titulo: 'Portão das Oliveiras', selos: 1 },
    { t: 'historia', titulo: 'O garoto do lobo', ganha: 'cisco', txt: ['Ó, um lobo gigante! Calma… ele tá abanando o rabo.', 'Esse é o Cisco. Largou tudo o que tinha e anda descalço por aí. O lobo é o Gúbio, melhor amigo dele.', 'O Cisco entrou pro seu time. Menos é mais, né?'] },
    { t: 'santuario', titulo: 'Capela de pedra' },
    { t: 'batalha',  titulo: 'Emboscada da Bruma', inimigos: ['copia', 'copia', 'copia'] },
    { t: 'bruma',    titulo: 'Portão do Moinho', selos: 2 },
    { t: 'bau',      titulo: 'Baú da torre' },
    { t: 'boss',     titulo: 'Servo do Insaciável', semanal: true, inimigos: ['servo'] },
    { t: 'batalha',  titulo: 'Última trincheira', inimigos: ['copia', 'servo', 'copia'] },
    { t: 'chefe',    titulo: 'O Insaciável', inimigos: ['insaciavel'], lenda: 'São Francisco de Assis' },
  ],
};

const INIMIGOS = {
  larva:      { nome: 'Larva da Preguiça', hp: 60,  atk: 9,  arte: 'larva' },
  copia:      { nome: 'Cópia cinzenta',    hp: 90,  atk: 13, arte: 'copia' },
  servo:      { nome: 'Servo do Insaciável', hp: 260, atk: 17, arte: 'servo' },
  insaciavel: { nome: 'O Insaciável',      hp: 620, atk: 22, arte: 'insaciavel' },
};

// Falas do Anjo por situação: [expressão, texto]
const ANJO = {
  oi:        [['rindo', 'E aí, sumido! Bora devolver umas cores hoje?'], ['orgulhoso', 'Chegou o herói. Ou quase herói. Vamos ver.']],
  semChama:  [['testa', 'Seu time tá sem Chama, hein. Missão de verdade primeiro, aí a gente joga.'], ['bravo', 'Sem Chama não rola. Vai lá cumprir uma missão que eu espero aqui.']],
  aprovada3: [['chocado', 'TRÊS ESTRELAS. Seu pai ficou impressionado. Até eu tô.'], ['orgulhoso', 'Três estrelas! Isso aí é nível lenda.']],
  aprovada:  [['orgulhoso', 'Missão aprovada. Chama no bolso, bora!'], ['rindo', 'Aprovada! Viu como nem doeu?']],
  refazer:   [['testa', 'Pediram pra refazer. Acontece, campeão. Dá uma olhada no comentário.']],
  larva:     [['bravo', 'Ô, campeão. Larva nova na área. Eu carrego espada de luz e tô aqui recolhendo copo? Resolve isso aí.'], ['testa', 'Mano… nasceu uma Larva. Ela tá te olhando.']],
  reparou:   [['rindo', 'Larva eliminada. Errar é normal, reparar é coisa de lenda.']],
  secreta:   [['emocionado', 'Ninguém pediu, você foi lá e fez. Isso é Fé, a moeda mais rara do jogo.']],
  comunhao:  [['emocionado', 'Revigorado. Agora sim, bora.']],
  graca:     [['rindo', 'Sua Graça de hoje. De graça mesmo, é presente.']],
  rank:      [['emocionado', 'RANK NOVO! Eu não tô chorando, é a luz da espada.']],
  vitoria:   [['rindo', 'Ganhamos! Quero ver a Bruma se recuperar dessa.']],
  derrota:   [['testa', 'Perdemos essa. Time mais forte = Fragmentos = missões. Você sabe o caminho.']],
};
