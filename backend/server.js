const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const bodyParser = require('body-parser');
const axios = require('axios');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');

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
    secure: process.env.NODE_ENV === 'production', // true só em produção com HTTPS
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// ==============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==============================================

// Middleware para verificar autenticação
function verificarAutenticacao(req, res, next) {
  // Não requer autenticação para rotas públicas
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

  // Verificar se a rota atual é pública
  const isRotaPublica = rotasPublicas.some((rota) => {
    return req.path === rota || req.path.startsWith(rota + '/');
  });

  if (isRotaPublica) {
    return next();
  }

  // Proteger rotas de gerenciamento
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

    // Se for API, retornar erro JSON, senão redirecionar para login
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    return res.redirect('/login');
  }

  // Para todas as outras rotas não especificadas, permitir acesso
  next();
}

// Aplicar middleware de autenticação
app.use(verificarAutenticacao);

// ==============================================
// MIDDLEWARE DE AUTORIZAÇÃO POR SETOR (NOVO)
// ==============================================
// Autenticação (AD) só confirma "quem é você".
// Estes middlewares controlam "o que você pode ver/fazer".

// Permite acesso a admins OU membros do setor GILOG
// (GILOG visualiza as telas de gerenciamento; outros setores não)
function apenasGilog(req, res, next) {
  if (req.session && (req.session.isAdmin || req.session.isGilog)) {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Acesso restrito ao setor GILOG' });
  }
  return res.redirect('/login');
}

// Configuração do banco de dados
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

/// configuração login do AD ///
const ADAuth = require('adauth').default;

let adInstance = null;

async function getADClient() {
  if (adInstance) return adInstance;

  adInstance = await ADAuth.create({
    url: process.env.AD_URL,
    domainDN: process.env.AD_DOMAIN_DN,
    searchBase: process.env.AD_SEARCH_BASE,

    searchAttributes: ['displayName', 'mail', 'memberOf', 'sAMAccountName'],
    connectTimeout: 5000, // 5 segundos
    timeout: 5000,
    reconnect: true,
    referrals: { enabled: false }
  });

  // Evita que erros de conexão derrubem o servidor inteiro
  adInstance.on('error', (err) => {
    console.error('Erro de conexão com o AD (não fatal):', err.message);
  });

  return adInstance;
}

// Grupo do AD que dá acesso total de administrador
const AD_ADMIN_GROUP_DN = process.env.AD_ADMIN_GROUP_DN;

// Grupo do AD do setor GILOG (visualiza as telas de gerenciamento,
// mas não é necessariamente admin total — ajuste a regra conforme necessário)
const AD_GILOG_GROUP_DN = process.env.AD_GILOG_GROUP_DN;

// Permite o usuário digitar só o username, sem prefixo de organização
const AD_ORG_PREFIX = process.env.AD_ORG_PREFIX; // ex: "empresa.com"

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
    return `${user}@${AD_ORG_PREFIX}`; // formato UPN
  }

  return user;
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Variável para controle de polling
let lastUpdateId = 0;
let isPolling = false;

// Função para enviar mensagens para o Telegram
async function enviarParaTelegram(motoristaId, solicitacao) {
  try {
    // Buscar o chatId do motorista no banco
    const result = await pool.query(
      'SELECT telegram_chat_id, nome FROM motoristas WHERE id = $1',
      [motoristaId]
    );

    if (result.rows.length === 0 || !result.rows[0].telegram_chat_id) {
      console.log(`⚠️ Motorista ${motoristaId} não possui telegram_chat_id configurado`);
      return;
    }

    const chatId = result.rows[0].telegram_chat_id;

    // Buscar o nome do setor
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

Envie uma mensagem com:

Finalizado: Transporte concluído com sucesso

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

    // Marcar como aguardando finalização
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

// Função auxiliar para enviar mensagens
async function enviarMensagemTelegram(chatId, texto, parseMode = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: texto,
    };
    if (parseMode) payload.parse_mode = parseMode;

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

// Função para processar mensagens do Telegram
async function processTelegramMessage(message) {
  const chatId = message.chat.id;
  const text = message.text ? message.text.trim() : '';

  console.log(`💬 Mensagem de ${chatId}: "${text}"`);

  try {
    // Verificar se é um comando
    if (text.startsWith('/')) {
      await processarComando(chatId, text);
      return;
    }

    // Buscar motorista pelo chat_id
    const motoristaResult = await pool.query(
      'SELECT id, nome FROM motoristas WHERE telegram_chat_id = $1',
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

    // Buscar solicitações pendentes do motorista
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

    await processarRespostaSolicitacao(
      solicitacao.id,
      text,
      chatId
    );

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);

    await enviarMensagemTelegram(
      chatId,
      '❌ Erro ao processar sua mensagem. Tente novamente.'
    );
  }
}

// Função para processar resposta de solicitação
async function processarRespostaSolicitacao(
  solicitacaoId,
  texto,
  chatId
) {
  try {
    console.log(
      `🔧 Processando resposta para solicitação #${solicitacaoId}: "${texto}"`
    );

    // Texto enviado pelo motorista
    let finalizado = texto.trim();

    // Caso envie no formato "Finalizado: ..."
    if (texto.toLowerCase().startsWith('finalizado')) {
      finalizado = texto.replace(/^finalizado:?\s*/i, '').trim();
    }

    // Caso não envie nada
    if (!finalizado) {
      finalizado = 'Transporte finalizado com sucesso';
    }

    console.log(`✅ Finalização registrada: "${finalizado}"`);

    // Fechar a solicitação
    await pool.query(
      `UPDATE solicitacoes 
       SET status = $1,
           problema = $2,
           data_fechamento = CURRENT_TIMESTAMP,
           aguardando_solucao = FALSE
       WHERE id = $3`,
      ['fechado', finalizado, solicitacaoId]
    );

    // Enviar confirmação
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

///
/// Excluir uma solicitação finalizada (exclusão definitiva) ///
///

app.delete('/api/solicitacao/:id', apenasGilog, async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar a solicitação para verificar o status
    const solicitacaoResult = await pool.query(
      'SELECT status FROM solicitacoes WHERE id = $1',
      [id]
    );

    if (solicitacaoResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Solicitação não encontrada'
      });
    }

    // Só permite excluir solicitações já finalizadas
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

// Processar registro do técnico
async function processarRegistro(chatId) {
  try {
    // Buscar técnico pelo chat_id para ver se já está registrado
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

    // Listar técnicos disponíveis para registro
    const motoristas = await pool.query(
      'SELECT id, nome FROM motoristas WHERE telegram_chat_id IS NULL AND ativo = TRUE'
    );

    if (motoristas.rows.length === 0) {
      await enviarMensagemTelegram(
        chatId,
        '❌ Não há motoristas disponíveis para registro. Entre em contato com o administrador.'
      );
      return;
    }

    let mensagem = `👥 *MOTORISTAS DISPONÍVEIS PARA VINCULAR:*\n\n`;

    motoristas.rows.forEach((motorista, index) => {
      mensagem += `${index + 1}. ${motorista.nome}\n`;
    });

    mensagem += `\n*Para se registrar, responda:*\n`;
    mensagem += `"/vincular [número]"\n\n`;
    mensagem += `*Exemplo:* /vincular 1`;

    await enviarMensagemTelegram(chatId, mensagem);

  } catch (error) {
    console.error('Erro no registro:', error);
    await enviarMensagemTelegram(
      chatId,
      '❌ Erro no processo de registro.'
    );
  }
}

// Processar vinculação
async function processarVinculacao(chatId, texto) {
  try {
    const match = texto.match(/\/vincular\s+(\d+)/);

    if (!match) {
      await enviarMensagemTelegram(
        chatId,
        '❌ Formato incorreto. Use: /vincular [número]'
      );
      return;
    }

    const numero = parseInt(match[1]);

    const motoristas = await pool.query(
      'SELECT id, nome FROM motoristas WHERE telegram_chat_id IS NULL AND ativo = TRUE'
    );

    if (numero < 1 || numero > motoristas.rows.length) {
      await enviarMensagemTelegram(
        chatId,
        '❌ Número inválido. Use um número da lista.'
      );
      return;
    }

    const motorista = motoristas.rows[numero - 1];

    await pool.query(
      'UPDATE motoristas SET telegram_chat_id = $1 WHERE id = $2',
      [chatId.toString(), motorista.id]
    );

    await enviarMensagemTelegram(
      chatId,
      `✅ *REGISTRO CONCLUÍDO!*\n\n` +
      `Você foi vinculado como: *${motorista.nome}*\n\n` +
      `Agora você receberá notificações de novas solicitações!`
    );

    console.log(`✅ Técnico ${motorista.nome} vinculado ao chat ID ${chatId}`);

  } catch (error) {
    console.error('Erro na vinculação:', error);
    await enviarMensagemTelegram(
      chatId,
      '❌ Erro ao processar vinculação.'
    );
  }
}

// Função para processar comandos normais
async function processarComando(chatId, texto) {
  const comando = texto.toLowerCase();

  if (comando === '/start' || comando === '/ajuda') {
    await enviarMensagemTelegram(
      chatId,
      `🤖 *BOT DE SOLICITAÇÃO DE TRANSPORTE* 🤖\n\n` +
      `*Comandos disponíveis:*\n` +
      `/registrar - Vincular este chat ao seu usuário\n` +
      `/solicitacoes - Listar minhas solicitações em aberto\n` +
      `/ajuda - Mostrar esta ajuda\n\n` +
      `*Para fechar uma solicitação:*\n` +
      `Envie a descrição da finalização\n` +
      `*Exemplo:*\n` +
      `Ocorrência: Solicitante levado ao destino com sucesso!\n`
    );
  } else if (comando === '/registrar') {
    await processarRegistro(chatId);
  } else if (comando.startsWith('/vincular')) {
    await processarVinculacao(chatId, texto);
  } else if (comando === '/solicitacoes') {
    await listarSolicitacoesMotorista(chatId);
  } else {
    await enviarMensagemTelegram(
      chatId,
      `❓ Comando não reconhecido. Use /ajuda para ver os comandos disponíveis.`
    );
  }
}

// Listar solicitações do técnico
async function listarSolicitacoesMotorista(chatId) {
  try {
    const result = await pool.query(
      `SELECT s.id, s.titulo, s.status, s.data_abertura, s.nome as setor
       FROM solicitacoes s 
       JOIN motoristas m ON s.motorista_id = m.id 
       JOIN setores setor ON s.setor_id = setor.id
       WHERE m.telegram_chat_id = $1 AND s.status != 'fechado'
       ORDER BY s.data_abertura DESC`,
      [chatId]
    );

    if (result.rows.length === 0) {
      await enviarMensagemTelegram(
        chatId,
        '📋 Você não possui solicitações em aberto.'
      );
      return;
    }

    let mensagem = '📋 *SUAS SOLICITAÇÕES EM ABERTO:*\n\n';

    result.rows.forEach((solicitacao) => {
      mensagem += `*Solicitação #${solicitacao.id}* - ${solicitacao.titulo}\n`;
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

/// rota login AD (admins e GILOG entram por aqui)
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

    console.log('Grupos do usuário:', groups);
    console.log('AD_GILOG_GROUP_DN configurado:', AD_GILOG_GROUP_DN);

    const isAdmin = groups.some((g) => g.toLowerCase() === AD_ADMIN_GROUP_DN.toLowerCase());
    const isGilog = AD_GILOG_GROUP_DN
      ? groups.some((g) => g.toLowerCase() === AD_GILOG_GROUP_DN.toLowerCase())
      : false;

    req.session.autenticado = true;
    req.session.usuario = user.displayName || user.sAMAccountName;
    req.session.isAdmin = isAdmin;
    req.session.isGilog = isGilog;
    req.session.nivelAcesso = isGilog ? 'GILOG' : 'USER';

    return res.json({
      success: true,
      message: 'Login realizado com sucesso',
      isAdmin,
      isGilog,
      usuario: user.displayName || user.sAMAccountName,
      redirectTo: isGilog ? '/manager' : '/chamado'
    });

  } catch (error) {
    console.error('Erro na autenticação AD:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Usuário ou senha inválidos'
    });
  }
});

// Rota de logout
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

// Rota para verificar autenticação
app.get('/api/auth/status', (req, res) => {
  res.json({
    autenticado: !!req.session.autenticado,
    usuario: req.session.usuario,
    usuarioId: req.session.usuarioId || null,
    isAdmin: req.session.isAdmin || false,
    isGilog: req.session.isGilog || false,
    nivelAcesso: req.session.nivelAcesso || null
  });
});

// ==============================================
// ROTAS DA API
// ==============================================

// Obter todos os técnicos
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

// Criar uma nova solicitação
app.post('/api/solicitacao', async (req, res) => {
  const { usuario_nome, destino, setor_id, data, hora } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO solicitacoes (usuario_nome, destino, data, hora, setor_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [usuario_nome, destino, data, hora, setor_id, 'aberto']
    );

    const solicitacao = result.rows[0];
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

// Designar técnico a uma solicitação
app.put('/api/solicitacao/:id/designar', async (req, res) => {
  const { id } = req.params;
  const { motorista_id } = req.body;

  try {
    const result = await pool.query(
      'UPDATE solicitacoes SET motorista_id = $1, status = $2 WHERE id = $3 RETURNING *',
      [motorista_id, 'em_andamento', id]
    );

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

// Obter todas as solicitações com filtros
app.get('/api/solicitacao', async (req, res) => {
  try {
    const { status } = req.query;

    const isAdmin = req.session.isAdmin || false;
    const nivelAcesso = req.session.nivelAcesso;
    const usuarioId = req.session.usuarioId;

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

    // CORRIGIDO: alias errado "c.motorista_id" -> "s.motorista_id"
    // (a query usa "FROM solicitacoes s", não existe alias "c")
    if (
      !isAdmin &&
      nivelAcesso &&
      ['N1', 'N2'].includes(nivelAcesso) &&
      usuarioId
    ) {
      whereConditions.push('(s.motorista_id = $1 OR s.status = $2)');
      params.push(usuarioId, 'aberto');
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

// Atualizar uma solicitação
app.put('/api/solicitacao/:id', async (req, res) => {
  const { id } = req.params;
  const { status, problema, motorista_id } = req.body;

  try {
    let query = '';
    let values = [];

    if (status === 'fechado') {
      query =
        'UPDATE solicitacoes SET status = $1, problema = $2, data_fechamento = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *';
      values = [status, problema, id];

    } else if (status === 'redirecionado') {

      const solicitacaoAtual = await pool.query(
        'SELECT motorista_id FROM solicitacoes WHERE id = $1',
        [id]
      );

      const motoristaAnteriorId =
        solicitacaoAtual.rows[0].motorista_id;

      query = `
    UPDATE solicitacoes 
    SET 
      status = $1,
      motorista_anterior_id = $2,
      motorista_id = $3
    WHERE id = $4
    RETURNING *
  `;

      values = [
        'em_andamento',
        motoristaAnteriorId,
        motorista_id,
        id
      ];

    } else {
      query =
        'UPDATE solicitacoes SET status = $1 WHERE id = $2 RETURNING *';
      values = [status, id];
    }

    const result = await pool.query(query, values);

    const solicitacaoAtualizada = result.rows[0];

    if (status === 'redirecionado') {
      try {
        await enviarParaTelegram(
          motorista_id,
          solicitacaoAtualizada
        );

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
// Gerenciamento de Técnicos (restrito a GILOG/Admin)
// ==============================================

// Obter todos os técnicos (incluindo inativos)
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

// Criar um novo técnico
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

// Excluir um motorista (exclusão lógica)
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

// Obter todos os setores (incluindo inativos)
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

// Criar um novo setor
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

// Atualizar um setor
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

// Excluir um setor (exclusão lógica)
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

// Obter todos os níveis de técnicos
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

// Atualizar um técnico (restrito a GILOG/Admin)
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

// Rota para alterar senha do técnico
app.put('/api/motoristas/:id/senha', async (req, res) => {
  const { id } = req.params;
  const { senhaAtual, novaSenha } = req.body;

  try {
    // Só o próprio técnico ou um admin/GILOG pode alterar
    const podeAlterar =
      req.session.usuarioId === parseInt(id) ||
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
    // Nota: fallback de senha padrão 'senha123' removido aqui também,
    // pelo mesmo motivo de segurança explicado em /api/login.

    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(
      novaSenha,
      saltRounds
    );

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

// Rota para testar Telegram
app.get('/api/test-telegram', async (req, res) => {
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

// Iniciar polling a cada 3 segundos
setInterval(checkTelegramMessages, 3000);

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(
    `🚀 Servidor rodando: http://localhost:${port}`
  );
});