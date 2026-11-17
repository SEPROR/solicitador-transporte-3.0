const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const bodyParser = require('body-parser');
const axios = require('axios');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');
const nodemailer = require('nodemailer');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT;
const host = process.env.HOST;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(cors({
  origin: [
    "http://localhost:5173",
  ],
  credentials: true
}));

// Configuração de sessão PRIMEIRO
app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// ==============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==============================================

function verificarAutenticacao(req, res, next) {
  const rotasPublicas = [
    '/api/login-ad',
    '/api/logout',
    '/api/auth/status',
    '/api/motoristas',
    '/api/setores',
    '/api/solicitacao',
    '/historico.html',
    '/login.html',
    '/index.html',
    '/',
    '/style.css',
    '/favicon.ico'
  ];

  const isRotaPublica = rotasPublicas.some((rota) => {
    return req.path === rota || req.path.startsWith(rota + '/');
  });

  if (isRotaPublica) {
    return next();
  }

  const rotasProtegidas = [
    'manager',
    'motoristas',
    'setores',
    'historico',
    '/api/motoristas/todos',
    '/api/setores/todos'
  ];

  const isRotaProtegida = rotasProtegidas.some((rota) => {
    return req.path.includes(rota);
  });

  if (isRotaProtegida) {
    if (req.session && req.session.autenticado) {
      return next();
    }

    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    return res.redirect('/login');
  }

  next();
}

app.use(verificarAutenticacao);

// ==============================================
// MIDDLEWARES DE AUTORIZAÇÃO
// ==============================================
// Autenticação (AD) só confirma "quem é você".
// Estes middlewares controlam "o que você pode ver/fazer".

// Admins OU membros do setor GILOG
function apenasGilog(req, res, next) {
  if (req.session && (req.session.isAdmin || req.session.isGilog)) {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Acesso restrito ao setor GILOG' });
  }
  return res.redirect('/login');
}

// AJUSTADO: autorização da rota PUT /api/solicitacao/:id
//  - Fechar: admin, GILOG, sub-admin (Ney) ou o MOTORISTA DESIGNADO naquela solicitação
//  - Redirecionar / demais alterações: apenas admin ou GILOG
async function autorizarAtualizacao(req, res, next) {
  try {
    if (!req.session || !req.session.autenticado) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const { isAdmin, isGilog, isSubAdmin, motoristaId } = req.session;
    const { status } = req.body;

    if (status === 'fechado') {
      if (isAdmin || isGilog || isSubAdmin) return next();

      if (motoristaId) {
        const r = await pool.query(
          'SELECT 1 FROM solicitacoes WHERE id = $1 AND motorista_id = $2 AND status = $3',
          [req.params.id, motoristaId, 'em_andamento']
        );
        if (r.rowCount > 0) return next();
      }

      return res.status(403).json({ error: 'Sem permissão para fechar esta solicitação' });
    }

    if (isAdmin || isGilog) return next();

    return res.status(403).json({ error: 'Sem permissão' });
  } catch (err) {
    console.error('Erro na autorização:', err);
    return res.status(500).json({ error: 'Erro ao validar permissão' });
  }
}

// Configuração do banco de dados
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// ==============================================
// FUNÇÃO ÚNICA PARA FECHAR SOLICITAÇÃO (NOVO)
// Usada pelo site e pelo Telegram, assim a regra fica em um só lugar.
// Só fecha se estiver 'em_andamento'. Retorna a linha fechada ou null.
// ==============================================
async function fecharSolicitacao(id, problema) {
  const r = await pool.query(
    `UPDATE solicitacoes
     SET status = 'fechado',
         problema = $1,
         data_fechamento = CURRENT_TIMESTAMP,
         aguardando_solucao = FALSE
     WHERE id = $2 AND status = 'em_andamento'
     RETURNING *`,
    [problema || 'Não informado', id]
  );
  return r.rows[0] || null;
}

// ==============================================
// CONFIGURAÇÃO DE E-MAIL
// ==============================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function enviarConfirmacaoEmail(solicitacao) {
  if (!solicitacao.email) {
    console.log(`⚠️ Solicitação #${solicitacao.id} sem e-mail informado, confirmação não enviada.`);
    return;
  }

  try {
    const setorResult = await pool.query(
      'SELECT nome FROM setores WHERE id = $1',
      [solicitacao.setor_id]
    );
    const setorNome = setorResult.rows.length > 0 ? setorResult.rows[0].nome : 'Não informado';

    const dataFormatada = new Date(solicitacao.data).toLocaleDateString('pt-BR', {
      timeZone: 'America/Manaus',
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: solicitacao.email,
      subject: `Confirmação de solicitação de transporte #${solicitacao.id}`,
      html: `
        <h2>Olá, ${solicitacao.usuario_nome}!</h2>
        <p>Sua solicitação de transporte foi registrada com os seguintes detalhes:</p>
        <ul>
          <li><strong>Número da solicitação:</strong> #${solicitacao.id}</li>
          <li><strong>Setor:</strong> ${setorNome}</li>
          <li><strong>Destino:</strong> ${solicitacao.destino}</li>
          <li><strong>Data:</strong> ${dataFormatada}</li>
          <li><strong>Horário:</strong> ${solicitacao.hora}</li>
        </ul>
        <p>Você será notificado assim que um motorista for designado.</p>
      `,
    });

    console.log(`✅ E-mail de confirmação enviado para ${solicitacao.email} (solicitação #${solicitacao.id})`);
  } catch (erroEmail) {
    console.error(`❌ Falha ao enviar e-mail de confirmação (solicitação #${solicitacao.id}):`, erroEmail.message);
  }
}

/// configuração login do AD ///
const ADAuth = require('adauth').default;

let adInstance = null;

async function getADClient() {
  if (adInstance) return adInstance;

  adInstance = await ADAuth.create({
    url: process.env.AD_URL,
    domainDN: process.env.AD_DOMAIN_DN,
    searchBase: process.env.AD_SEARCH_BASE,

    searchAttributes: ['displayName', 'mail', 'memberOf', 'sAMAccountName', 'distinguishedName'],
    connectTimeout: 5000,
    timeout: 5000,
    reconnect: true,
    referrals: { enabled: false }
  });

  adInstance.on('error', (err) => {
    console.error('Erro de conexão com o AD (não fatal):', err.message);
  });

  return adInstance;
}

// Grupo do AD que dá acesso total de administrador
const AD_ADMIN_GROUP_DN = process.env.AD_ADMIN_GROUP_DN;

// Grupo do AD do setor GILOG
const AD_GILOG_GROUP_DN = process.env.AD_GILOG_GROUP_DN;

// NOVO: DNs dos sub-admins (ex: Ney), separados por ponto e vírgula, pois o DN tem vírgulas.
// SUBADMIN_DNS=CN=Julcinei Freitas Soares,OU=SGTRANS,OU=USUARIOS,OU=SEPROR,DC=sepror,DC=am,DC=gov,DC=br
const SUBADMIN_DNS = (process.env.SUBADMIN_DNS || '')
  .split(';')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const AD_ORG_PREFIX = process.env.AD_ORG_PREFIX;

function normalizeUsername(input) {
  if (!input) return input;
  let user = input.trim();

  if (user.includes('\\')) {
    user = user.split('\\').pop();
  }
  if (user.includes('@')) {
    user = user.split('@')[0];
  }

  if (AD_ORG_PREFIX) {
    return `${user}@${AD_ORG_PREFIX}`;
  }

  return user;
}

// ==============================================
// SETOR AUTOMÁTICO A PARTIR DA OU DO AD
// ==============================================
function extrairSetorDoDN(dn) {
  if (!dn) return null;

  const partes = dn.split(',').map((p) => p.trim());
  const primeiraOU = partes.find((p) => p.toUpperCase().startsWith('OU='));

  if (!primeiraOU) return null;

  return primeiraOU.substring(3).trim();
}

async function buscarOuCriarSetor(nomeSetorAD) {
  if (!nomeSetorAD) return null;

  try {
    const existente = await pool.query(
      'SELECT id, nome FROM setores WHERE UPPER(nome) = UPPER($1)',
      [nomeSetorAD]
    );

    if (existente.rows.length > 0) {
      return existente.rows[0];
    }

    const novo = await pool.query(
      'INSERT INTO setores (nome) VALUES ($1) RETURNING id, nome',
      [nomeSetorAD]
    );

    console.log(`🆕 Setor "${nomeSetorAD}" criado automaticamente a partir do AD`);
    return novo.rows[0];

  } catch (err) {
    console.error('❌ Erro ao buscar/criar setor a partir do AD:', err.message);
    return null;
  }
}

// ==============================================
// TELEGRAM
// ==============================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let lastUpdateId = 0;
let isPolling = false;

async function enviarParaTelegram(motoristaId, solicitacao) {
  try {
    const result = await pool.query(
      'SELECT telegram_chat_id, nome FROM motoristas WHERE id = $1',
      [motoristaId]
    );

    if (result.rows.length === 0 || !result.rows[0].telegram_chat_id) {
      console.log(`⚠️ Motorista ${motoristaId} não possui telegram_chat_id configurado`);
      return;
    }

    const chatId = result.rows[0].telegram_chat_id;

    const setorResult = await pool.query(
      'SELECT nome FROM setores WHERE id = $1',
      [solicitacao.setor_id]
    );

    const setorNome =
      setorResult.rows.length > 0
        ? setorResult.rows[0].nome
        : 'Setor não encontrado';

    const mensagem = `🚗 *NOVA SOLICITAÇÃO DE TRANSPORTE* 🚗

👤 *Solicitante:* ${solicitacao.usuario_nome}
🏢 *Local:* ${setorNome}
👨‍✈️ *Motorista Designado:* ${result.rows[0].nome}
🔢 *Número da Solicitação:* #${solicitacao.id}
⏰ *Data/Hora da partida:* ${new Date(solicitacao.data).toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })} *ás* ${solicitacao.hora}

--------------------------------

💡 *PARA FINALIZAR O TRANSPORTE:*

Envie uma mensagem começando com "Finalizado:"

*Exemplo:*
Finalizado: Solicitante levado ao destino com sucesso`;

    console.log(
      `📤 Enviando mensagem para chatId: ${chatId}, Motorista: ${result.rows[0].nome}`
    );

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: mensagem,
        parse_mode: 'Markdown'
      }
    );

    await pool.query(
      'UPDATE solicitacoes SET aguardando_solucao = TRUE WHERE id = $1',
      [solicitacao.id]
    );

    console.log(
      `✅ Notificação enviada e solicitação #${solicitacao.id} marcada como aguardando finalização`
    );

  } catch (error) {
    console.error(
      '❌ Erro ao enviar para Telegram:',
      error.response?.data || error.message
    );
  }
}

// AJUSTADO: aceita reply_markup opcional (usado no botão de compartilhar contato)
async function enviarMensagemTelegram(chatId, texto, parseMode = null, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: texto,
    };
    if (parseMode) payload.parse_mode = parseMode;
    if (replyMarkup) payload.reply_markup = replyMarkup;

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      payload
    );
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
  }
}

async function checkTelegramMessages() {
  if (isPolling) return;
  isPolling = true;

  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`
    );

    if (response.data.ok && response.data.result.length > 0) {
      console.log(`📨 ${response.data.result.length} mensagem(s) recebida(s)`);

      for (const update of response.data.result) {
        lastUpdateId = update.update_id;

        if (update.message) {
          await processTelegramMessage(update.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar mensagens:', error.message);
  } finally {
    isPolling = false;
  }
}

// NOVO: vínculo seguro pelo contato do Telegram.
// O número compartilhado é comparado ao WhatsApp cadastrado do motorista.
async function processarContato(message) {
  const chatId = message.chat.id;
  const contato = message.contact;

  if (contato.user_id !== message.from.id) {
    await enviarMensagemTelegram(chatId, '❌ Envie o seu próprio contato, não o de outra pessoa.');
    return;
  }

  // Remove tudo que não é dígito e o código do país (55)
  const numero = contato.phone_number.replace(/\D/g, '').replace(/^55/, '');

  // Compara só os dígitos do WhatsApp cadastrado (ignora formatação)
  const r = await pool.query(
    `UPDATE motoristas
     SET telegram_chat_id = $1
     WHERE REGEXP_REPLACE(COALESCE(whatsapp, ''), '\\D', '', 'g') = $2
       AND ativo = TRUE
       AND telegram_chat_id IS NULL
     RETURNING nome`,
    [chatId.toString(), numero]
  );

  if (r.rowCount > 0) {
    await enviarMensagemTelegram(
      chatId,
      `✅ Vinculado com sucesso como: ${r.rows[0].nome}\n\nAgora você receberá as solicitações aqui.`
    );
    console.log(`✅ Motorista ${r.rows[0].nome} vinculado ao chat ID ${chatId}`);
  } else {
    await enviarMensagemTelegram(
      chatId,
      '❌ Número não encontrado entre os motoristas ativos (ou já vinculado).\nFale com o administrador para conferir o WhatsApp cadastrado.',
    );
  }
}

async function processTelegramMessage(message) {
  const chatId = message.chat.id;
  const text = message.text ? message.text.trim() : '';

  console.log(`💬 Mensagem de ${chatId}: "${text}"`);

  try {
    // NOVO: contato compartilhado para vínculo
    if (message.contact) {
      await processarContato(message);
      return;
    }

    if (text.startsWith('/')) {
      await processarComando(chatId, text);
      return;
    }

    const motoristaResult = await pool.query(
      'SELECT id, nome FROM motoristas WHERE telegram_chat_id = $1 AND ativo = TRUE',
      [chatId.toString()]
    );

    if (motoristaResult.rows.length === 0) {
      console.log(`⚠️ Chat ID ${chatId} não está associado a nenhum motorista`);

      await enviarMensagemTelegram(
        chatId,
        '❌ Você não está registrado como motorista. Use /registrar para se cadastrar.'
      );

      return;
    }

    const motorista = motoristaResult.rows[0];

    // AJUSTADO: só fecha se a mensagem começar com "Finalizado".
    // Evita fechar o transporte com um "oi" ou "ok" por engano.
    if (!/^finalizado/i.test(text)) {
      await enviarMensagemTelegram(
        chatId,
        'ℹ️ Para fechar o transporte, envie uma mensagem começando com "Finalizado:"\n\nExemplo:\nFinalizado: Solicitante levado ao destino com sucesso'
      );
      return;
    }

    const solicitacoesPendentes = await pool.query(
      `SELECT * FROM solicitacoes 
       WHERE motorista_id = $1 
       AND aguardando_solucao = TRUE 
       AND status = 'em_andamento'
       ORDER BY data_abertura DESC 
       LIMIT 1`,
      [motorista.id]
    );

    if (solicitacoesPendentes.rows.length === 0) {
      await enviarMensagemTelegram(
        chatId,
        '📋 Você não possui transportes pendentes para finalizar.'
      );

      return;
    }

    const solicitacao = solicitacoesPendentes.rows[0];

    await processarRespostaSolicitacao(solicitacao.id, text, chatId);

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);

    await enviarMensagemTelegram(
      chatId,
      '❌ Erro ao processar sua mensagem. Tente novamente.'
    );
  }
}

// AJUSTADO: usa a função única fecharSolicitacao
async function processarRespostaSolicitacao(solicitacaoId, texto, chatId) {
  try {
    console.log(
      `🔧 Processando resposta para solicitação #${solicitacaoId}: "${texto}"`
    );

    let finalizado = texto.replace(/^finalizado:?\s*/i, '').trim();

    if (!finalizado) {
      finalizado = 'Transporte finalizado com sucesso';
    }

    const fechada = await fecharSolicitacao(solicitacaoId, finalizado);

    if (!fechada) {
      throw new Error('Solicitação não está em andamento');
    }

    await enviarMensagemTelegram(
      chatId,
      `✅ TRANSPORTE FINALIZADO COM SUCESSO!\n\n` +
      `Solicitação: #${solicitacaoId}\n` +
      `Status: ${finalizado}\n\n` +
      `O solicitante foi levado ao destino informado.`
    );

    console.log(`✅ Solicitação #${solicitacaoId} finalizada via Telegram`);

  } catch (error) {
    console.error('❌ Erro ao processar resposta:', error.message);
    console.error(error.stack);

    await enviarMensagemTelegram(
      chatId,
      '❌ ERRO AO FINALIZAR TRANSPORTE\n\n' +
      'Envie no formato:\n\n' +
      'Finalizado: Transporte concluído com sucesso'
    );
  }
}

// AJUSTADO: /registrar pede o contato (vínculo por número de telefone)
async function processarRegistro(chatId) {
  try {
    const motoristaExistente = await pool.query(
      'SELECT id, nome FROM motoristas WHERE telegram_chat_id = $1',
      [chatId.toString()]
    );

    if (motoristaExistente.rows.length > 0) {
      await enviarMensagemTelegram(
        chatId,
        `✅ Você já está registrado como: ${motoristaExistente.rows[0].nome}`
      );
      return;
    }

    await enviarMensagemTelegram(
      chatId,
      '📱 Toque no botão abaixo para compartilhar seu número.\n\nEle precisa ser o mesmo WhatsApp cadastrado para você no sistema.',
      null,
      {
        keyboard: [[{ text: '📱 Compartilhar meu número', request_contact: true }]],
        one_time_keyboard: true,
        resize_keyboard: true
      }
    );

  } catch (error) {
    console.error('Erro no registro:', error);
    await enviarMensagemTelegram(chatId, '❌ Erro no processo de registro.');
  }
}

async function processarComando(chatId, texto) {
  const comando = texto.toLowerCase();

  if (comando === '/start' || comando === '/ajuda') {
    await enviarMensagemTelegram(
      chatId,
      `🤖 *BOT DE SOLICITAÇÃO DE TRANSPORTE* 🤖\n\n` +
      `*Comandos disponíveis:*\n` +
      `/registrar - Vincular este chat ao seu cadastro de motorista\n` +
      `/solicitacoes - Listar minhas solicitações em aberto\n` +
      `/ajuda - Mostrar esta ajuda\n\n` +
      `*Para fechar uma solicitação:*\n` +
      `Envie uma mensagem começando com "Finalizado:"\n` +
      `*Exemplo:*\n` +
      `Finalizado: Solicitante levado ao destino com sucesso!\n`,
      'Markdown'
    );
  } else if (comando === '/registrar') {
    await processarRegistro(chatId);
  } else if (comando === '/solicitacoes') {
    await listarSolicitacoesMotorista(chatId);
  } else {
    await enviarMensagemTelegram(
      chatId,
      `❓ Comando não reconhecido. Use /ajuda para ver os comandos disponíveis.`
    );
  }
}

// AJUSTADO: colunas corrigidas (a tabela não tem "titulo" nem "nome" em solicitacoes)
async function listarSolicitacoesMotorista(chatId) {
  try {
    const result = await pool.query(
      `SELECT s.id, s.destino, s.status, s.data_abertura, setor.nome AS setor
       FROM solicitacoes s 
       JOIN motoristas m ON s.motorista_id = m.id 
       JOIN setores setor ON s.setor_id = setor.id
       WHERE m.telegram_chat_id = $1 AND s.status != 'fechado'
       ORDER BY s.data_abertura DESC`,
      [chatId.toString()]
    );

    if (result.rows.length === 0) {
      await enviarMensagemTelegram(
        chatId,
        '📋 Você não possui solicitações em aberto.'
      );
      return;
    }

    let mensagem = '📋 SUAS SOLICITAÇÕES EM ABERTO:\n\n';

    result.rows.forEach((solicitacao) => {
      mensagem += `Solicitação #${solicitacao.id} - ${solicitacao.destino}\n`;
      mensagem += `Setor: ${solicitacao.setor}\n`;
      mensagem += `Status: ${solicitacao.status}\n`;
      mensagem += `Aberta em: ${new Date(
        solicitacao.data_abertura
      ).toLocaleString('pt-BR')}\n`;
      mensagem += `--------------------------------\n\n`;
    });

    await enviarMensagemTelegram(chatId, mensagem);

  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    await enviarMensagemTelegram(
      chatId,
      '❌ Erro ao carregar suas solicitações.'
    );
  }
}

// ==============================================
// ROTAS DE AUTENTICAÇÃO
// ==============================================

/// rota login AD
app.post('/api/login-ad', async (req, res) => {
  const { usuario, senha } = req.body;

  console.log('Recebeu tentativa de login:', usuario);

  if (!usuario || !senha) {
    return res.status(400).json({ success: false, error: 'Usuário e senha são obrigatórios' });
  }

  try {
    const ad = await getADClient();
    const loginNormalizado = normalizeUsername(usuario);
    const user = await ad.authenticate(loginNormalizado, senha);

    const groups = Array.isArray(user.memberOf)
      ? user.memberOf
      : (user.memberOf ? [user.memberOf] : []);
    const groupsLower = groups.map((g) => g.toLowerCase());

    console.log('Grupos do usuário:', groups);
    console.log('AD_GILOG_GROUP_DN configurado:', AD_GILOG_GROUP_DN);

    const isAdmin = AD_ADMIN_GROUP_DN
      ? groupsLower.includes(AD_ADMIN_GROUP_DN.toLowerCase())
      : false;
    const isGilog = AD_GILOG_GROUP_DN
      ? groupsLower.includes(AD_GILOG_GROUP_DN.toLowerCase())
      : false;

    const dnUsuario = user.dn || user.distinguishedName;
    const nomeSetorAD = extrairSetorDoDN(dnUsuario);
    const setorInfo = await buscarOuCriarSetor(nomeSetorAD);

    console.log('Setor detectado automaticamente do AD:', nomeSetorAD, '-> setor_id:', setorInfo?.id);

    // NOVO: sub-admin (Ney), identificado pelo DN
    const isSubAdmin = SUBADMIN_DNS.includes((dnUsuario || '').toLowerCase());

    // NOVO: motorista cadastrado e ativo, ligado pelo usuario_login = sAMAccountName
    const motResult = await pool.query(
      'SELECT id FROM motoristas WHERE LOWER(usuario_login) = LOWER($1) AND ativo = TRUE',
      [user.sAMAccountName]
    );
    const motoristaId = motResult.rows[0]?.id || null;

    console.log('Sub-admin:', isSubAdmin, '| motoristaId:', motoristaId);

    req.session.autenticado = true;
    req.session.usuario = user.displayName || user.sAMAccountName;
    req.session.usuarioLogin = user.sAMAccountName;
    req.session.isAdmin = isAdmin;
    req.session.isGilog = isGilog;
    req.session.isSubAdmin = isSubAdmin;
    req.session.motoristaId = motoristaId;
    // usuarioId passa a ser o id do motorista (compatível com o front antigo)
    req.session.usuarioId = motoristaId;
    req.session.nivelAcesso = isGilog ? 'GILOG' : 'USER';
    req.session.setorId = setorInfo ? setorInfo.id : null;
    req.session.setorNome = setorInfo ? setorInfo.nome : null;

    const acessaManager = isGilog || isAdmin || isSubAdmin || !!motoristaId;

    return res.json({
      success: true,
      message: 'Login realizado com sucesso',
      isAdmin,
      isGilog,
      isSubAdmin,
      motoristaId,
      usuario: user.displayName || user.sAMAccountName,
      setorId: req.session.setorId,
      setorNome: req.session.setorNome,
      redirectTo: acessaManager ? '/manager' : '/solicitacao'
    });

  } catch (error) {
    console.error('Erro na autenticação AD:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Usuário ou senha inválidos'
    });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao fazer logout'
      });
    }

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  });
});

app.get('/api/auth/status', (req, res) => {
  res.json({
    autenticado: !!req.session.autenticado,
    usuario: req.session.usuario,
    usuarioId: req.session.usuarioId || null,
    isAdmin: req.session.isAdmin || false,
    isGilog: req.session.isGilog || false,
    isSubAdmin: req.session.isSubAdmin || false,   // NOVO
    motoristaId: req.session.motoristaId || null,  // NOVO
    nivelAcesso: req.session.nivelAcesso || null,
    setorId: req.session.setorId || null,
    setorNome: req.session.setorNome || null
  });
});

// ==============================================
// ROTAS DA API
// ==============================================

///
/// Excluir uma solicitação finalizada (exclusão definitiva)
///
app.delete('/api/solicitacao/:id', apenasGilog, async (req, res) => {
  const { id } = req.params;

  try {
    const solicitacaoResult = await pool.query(
      'SELECT status FROM solicitacoes WHERE id = $1',
      [id]
    );

    if (solicitacaoResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Solicitação não encontrada'
      });
    }

    if (solicitacaoResult.rows[0].status !== 'fechado') {
      return res.status(400).json({
        error: 'Apenas solicitações finalizadas podem ser excluídas'
      });
    }

    await pool.query('DELETE FROM solicitacoes WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Solicitação excluída com sucesso'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Erro ao excluir solicitação'
    });
  }
});

// Obter todos os motoristas ativos
app.get('/api/motoristas', async (req, res) => {
  try {
    const query = `
      SELECT m.*, n.nome as nivel_nome, n.codigo_acesso
      FROM motoristas m
      LEFT JOIN nivel_tecnico n ON m.nivel_id = n.id
      WHERE m.ativo = TRUE
      ORDER BY m.nome
    `;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar técnicos' });
  }
});

// Obter todos os setores
app.get('/api/setores', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM setores ORDER BY nome'
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar setores' });
  }
});

// Criar uma nova solicitação (setor vem da sessão, detectado pelo AD)
app.post('/api/solicitacao', async (req, res) => {
  if (!req.session.autenticado) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { usuario_nome, email, destino, data, hora } = req.body;
  const setor_id = req.session.setorId;

  if (!setor_id) {
    return res.status(400).json({
      error: 'Não foi possível identificar seu setor no Active Directory. Contate o administrador.'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO solicitacoes (usuario_nome, email, destino, data, hora, setor_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [usuario_nome, email, destino, data, hora, setor_id, 'aberto']
    );

    const solicitacao = result.rows[0];

    enviarConfirmacaoEmail(solicitacao).catch(console.error);

    res.json(solicitacao);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar solicitação' });
  }
});

// Obter uma solicitação específica
app.get('/api/solicitacao/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT s.*, m.nome as motorista_nome, setor.nome as setor_nome,
             ma.nome as motorista_anterior_nome
      FROM solicitacoes s
      LEFT JOIN motoristas m ON s.motorista_id = m.id
      LEFT JOIN setores setor ON s.setor_id = setor.id
      LEFT JOIN motoristas ma ON s.motorista_anterior_id = ma.id
      WHERE s.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Solicitação não encontrada'
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Erro ao buscar solicitação'
    });
  }
});

// AJUSTADO: designar agora exige admin/GILOG (antes estava aberta)
app.put('/api/solicitacao/:id/designar', apenasGilog, async (req, res) => {
  const { id } = req.params;
  const { motorista_id } = req.body;

  try {
    const result = await pool.query(
      'UPDATE solicitacoes SET motorista_id = $1, status = $2 WHERE id = $3 RETURNING *',
      [motorista_id, 'em_andamento', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    const solicitacao = result.rows[0];

    const solicitacaoCompleta = await pool.query(
      `
      SELECT s.*, m.nome as motorista_nome, setor.nome as setor_nome
      FROM solicitacoes s
      LEFT JOIN motoristas m ON s.motorista_id = m.id
      LEFT JOIN setores setor ON s.setor_id = setor.id
      WHERE s.id = $1
      `,
      [solicitacao.id]
    );

    if (solicitacaoCompleta.rows[0].motorista_id) {
      enviarParaTelegram(
        motorista_id,
        solicitacaoCompleta.rows[0]
      ).catch(console.error);
    }

    res.json(solicitacao);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Erro ao designar técnico'
    });
  }
});

// AJUSTADO: exige login e filtra para quem é só motorista
// (motorista comum vê as próprias solicitações + as abertas;
//  admin, GILOG e Ney veem tudo)
app.get('/api/solicitacao', async (req, res) => {
  if (!req.session.autenticado) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const { status } = req.query;

    const { isAdmin, isGilog, isSubAdmin, motoristaId } = req.session;
    const veTudo = isAdmin || isGilog || isSubAdmin;

    let query = `
      SELECT s.*, m.nome as motorista_nome, setor.nome as setor_nome,
             ma.nome as motorista_anterior_nome
      FROM solicitacoes s
      LEFT JOIN motoristas m ON s.motorista_id = m.id
      LEFT JOIN setores setor ON s.setor_id = setor.id
      LEFT JOIN motoristas ma ON s.motorista_anterior_id = ma.id
    `;

    let params = [];
    let whereConditions = [];

    if (!veTudo && motoristaId) {
      whereConditions.push('(s.motorista_id = $1 OR s.status = $2)');
      params.push(motoristaId, 'aberto');
    }

    if (status) {
      whereConditions.push('s.status = $' + (params.length + 1));
      params.push(status);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' ORDER BY s.data_abertura DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Erro ao buscar solicitações'
    });
  }
});

// AJUSTADO: protegida por autorizarAtualizacao e usando fecharSolicitacao
app.put('/api/solicitacao/:id', autorizarAtualizacao, async (req, res) => {
  const { id } = req.params;
  const { status, problema, motorista_id } = req.body;

  try {
    // FECHAR (admin, GILOG, Ney ou motorista designado)
    if (status === 'fechado') {
      const fechada = await fecharSolicitacao(id, problema);

      if (!fechada) {
        return res.status(400).json({
          error: 'Solicitação não está em andamento'
        });
      }

      return res.json(fechada);
    }

    let query = '';
    let values = [];

    if (status === 'redirecionado') {
      const solicitacaoAtual = await pool.query(
        'SELECT motorista_id FROM solicitacoes WHERE id = $1',
        [id]
      );

      if (solicitacaoAtual.rows.length === 0) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }

      const motoristaAnteriorId = solicitacaoAtual.rows[0].motorista_id;

      query = `
        UPDATE solicitacoes 
        SET 
          status = $1,
          motorista_anterior_id = $2,
          motorista_id = $3
        WHERE id = $4
        RETURNING *
      `;

      values = ['em_andamento', motoristaAnteriorId, motorista_id, id];

    } else {
      query = 'UPDATE solicitacoes SET status = $1 WHERE id = $2 RETURNING *';
      values = [status, id];
    }

    const result = await pool.query(query, values);
    const solicitacaoAtualizada = result.rows[0];

    if (status === 'redirecionado') {
      try {
        await enviarParaTelegram(motorista_id, solicitacaoAtualizada);

        console.log(
          `📤 Solicitação ${id} redirecionada e enviada ao novo motorista`
        );

      } catch (telegramError) {
        console.error(
          'Erro ao enviar Telegram após redirecionamento:',
          telegramError
        );
      }
    }

    res.json(solicitacaoAtualizada);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Erro ao atualizar solicitação'
    });
  }
});

// ==============================================
// Gerenciamento de Motoristas (restrito a GILOG/Admin)
// ==============================================

app.get('/api/motoristas/todos', apenasGilog, async (req, res) => {
  try {
    const query = `
      SELECT m.*, n.nome as nivel_nome, n.codigo_acesso
      FROM motoristas m
      LEFT JOIN nivel_tecnico n ON m.nivel_id = n.id
      ORDER BY m.nome
    `;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar motoristas' });
  }
});

app.post('/api/motoristas', apenasGilog, async (req, res) => {
  const { nome, whatsapp, usuario_login } = req.body;

  try {
    const login = usuario_login || nome.toLowerCase().replace(/\s+/g, '.');

    const result = await pool.query(
      'INSERT INTO motoristas (nome, whatsapp, usuario_login) VALUES ($1, $2, $3) RETURNING *',
      [nome, whatsapp, login]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar motorista' });
  }
});

app.delete('/api/motoristas/:id', apenasGilog, async (req, res) => {
  const { id } = req.params;

  try {
    const solicitacoesResult = await pool.query(
      'SELECT COUNT(*) FROM solicitacoes WHERE motorista_id = $1 AND status != $2',
      [id, 'fechado']
    );

    if (parseInt(solicitacoesResult.rows[0].count) > 0) {
      return res.status(400).json({
        error:
          'Não é possível excluir o técnico pois existem solicitações em andamento atribuídas a ele.'
      });
    }

    const result = await pool.query(
      'UPDATE motoristas SET ativo = FALSE WHERE id = $1 RETURNING *',
      [id]
    );

    res.json({
      message: 'Técnico excluído com sucesso',
      motorista: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir técnico' });
  }
});

// ==============================================
// Gerenciamento de Setores (restrito a GILOG/Admin)
// ==============================================

app.get('/api/setores/todos', apenasGilog, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM setores ORDER BY nome'
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar setores' });
  }
});

app.post('/api/setores', apenasGilog, async (req, res) => {
  const { nome } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO setores (nome) VALUES ($1) RETURNING *',
      [nome]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar setor' });
  }
});

app.put('/api/setores/:id', apenasGilog, async (req, res) => {
  const { id } = req.params;
  const { nome, ativo } = req.body;

  try {
    const result = await pool.query(
      'UPDATE setores SET nome = $1, ativo = $2 WHERE id = $3 RETURNING *',
      [nome, ativo, id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar setor' });
  }
});

app.delete('/api/setores/:id', apenasGilog, async (req, res) => {
  const { id } = req.params;

  try {
    const solicitacoesResult = await pool.query(
      'SELECT COUNT(*) FROM solicitacoes WHERE setor_id = $1',
      [id]
    );

    if (parseInt(solicitacoesResult.rows[0].count) > 0) {
      return res.status(400).json({
        error:
          'Não é possível excluir o setor pois existem solicitações atribuídas a ele.'
      });
    }

    const result = await pool.query(
      'UPDATE setores SET ativo = FALSE WHERE id = $1 RETURNING *',
      [id]
    );

    res.json({
      message: 'Setor excluído com sucesso',
      setor: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir setor' });
  }
});

app.get('/api/nivel-motorista', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM nivel_tecnico ORDER BY id'
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Erro ao buscar níveis de técnico'
    });
  }
});

app.put('/api/motoristas/:id', apenasGilog, async (req, res) => {
  const { id } = req.params;
  const {
    nome,
    whatsapp,
    ativo,
    usuario_login
  } = req.body;

  try {
    const result = await pool.query(
      'UPDATE motoristas SET nome = $1, whatsapp = $2, ativo = $3, usuario_login = $4 WHERE id = $5 RETURNING *',
      [nome, whatsapp, ativo, usuario_login, id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar técnico' });
  }
});

// Alterar senha do motorista
app.put('/api/motoristas/:id/senha', async (req, res) => {
  const { id } = req.params;
  const { senhaAtual, novaSenha } = req.body;

  try {
    const podeAlterar =
      (req.session.usuarioId && req.session.usuarioId === parseInt(id)) ||
      req.session.isAdmin ||
      req.session.isGilog;

    if (!podeAlterar) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    const motoristaResult = await pool.query(
      'SELECT * FROM motoristas WHERE id = $1',
      [id]
    );

    if (motoristaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Motorista não encontrado' });
    }

    const motorista = motoristaResult.rows[0];

    if (motorista.senha_hash) {
      const senhaAtualValida = await bcrypt.compare(
        senhaAtual,
        motorista.senha_hash
      );

      if (!senhaAtualValida) {
        return res.status(401).json({
          error: 'Senha atual incorreta'
        });
      }
    }

    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(novaSenha, saltRounds);

    await pool.query(
      'UPDATE motoristas SET senha_hash = $1 WHERE id = $2',
      [senhaHash, id]
    );

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Erro ao alterar senha'
    });
  }
});

// Rota para testar Telegram (AJUSTADO: só admin/GILOG)
app.get('/api/test-telegram', apenasGilog, async (req, res) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const response = await axios.get(
      `https://api.telegram.org/bot${token}/getMe`
    );

    res.json(response.data);

  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message
    });
  }
});



// ===== TEMPORÁRIO: REMOVER DEPOIS DOS TESTES =====
if (process.env.TESTE_SIMULAR === 'true') {
  app.post('/api/dev/simular', (req, res) => {
    if (!req.session.autenticado) return res.status(401).json({ error: 'Não autorizado' });

    // guarda os papéis reais na primeira vez
    if (!req.session.real) {
      req.session.real = {
        isAdmin: req.session.isAdmin, isGilog: req.session.isGilog,
        isSubAdmin: req.session.isSubAdmin, motoristaId: req.session.motoristaId,
        usuarioId: req.session.usuarioId
      };
    }
    if (!req.session.real.isAdmin) return res.status(403).json({ error: 'Só admin real pode simular' });

    const { perfil, motoristaId } = req.body;
    const r = req.session.real;

    if (perfil === 'real') {
      Object.assign(req.session, r);
    } else {
      req.session.isAdmin = false;
      req.session.isGilog = perfil === 'gilog';
      req.session.isSubAdmin = perfil === 'ney';
      req.session.motoristaId = perfil === 'motorista' ? Number(motoristaId) : null;
      req.session.usuarioId = req.session.motoristaId;
    }
    res.json({ ok: true, perfil, motoristaId: req.session.motoristaId });
  });
}


// Iniciar polling a cada 3 segundos
setInterval(checkTelegramMessages, 3000);

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(
    `🚀 Servidor rodando: http://localhost:${port}`
  );
});