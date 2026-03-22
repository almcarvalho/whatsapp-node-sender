const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { headless, chromeExecutablePath, authPath } = require('./config');
const { postToDiscord } = require('./discord');

let client;
let isReady = false;

function createWhatsAppClient() {
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: authPath
    }),
    puppeteer: {
      headless,
      executablePath: chromeExecutablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    }
  });

  client.on('qr', (qr) => {
    console.log('\nEscaneie o QR Code abaixo no WhatsApp:\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Autenticado com sucesso.');
  });

  client.on('ready', () => {
    isReady = true;
    console.log('[WhatsApp] Cliente pronto para enviar e receber mensagens.');
  });

  client.on('disconnected', (reason) => {
    isReady = false;
    console.warn(`[WhatsApp] Cliente desconectado. Motivo: ${reason}`);
  });

  client.on('auth_failure', (msg) => {
    isReady = false;
    console.error('[WhatsApp] Falha de autenticação:', msg);
  });

  client.on('message', async (message) => {
    try {
      await postToDiscord({
        from: message.from,
        body: message.body,
        type: message.type,
        pushname: message._data?.notifyName || message._data?.pushname || null
      });
    } catch (error) {
      console.error('[Discord] Erro ao enviar mensagem para o Discord:', error.message);
    }
  });

  return client;
}

async function initWhatsApp() {
  if (!client) {
    createWhatsAppClient();
  }

  await client.initialize();
  return client;
}

function getClient() {
  return client;
}

function getStatus() {
  return {
    ready: isReady,
    hasClient: Boolean(client)
  };
}

async function sendMessage(numero, texto) {
  if (!client || !isReady) {
    throw new Error('Cliente do WhatsApp ainda não está pronto.');
  }

  const sanitized = String(numero).replace(/\D/g, '');
  if (!/^\d{12,14}$/.test(sanitized)) {
    throw new Error('Número inválido. Use o formato 5579991298422.');
  }

  const chatId = `${sanitized}@c.us`;
  const response = await client.sendMessage(chatId, texto);

  return {
    id: response.id?._serialized,
    to: chatId,
    body: response.body,
    timestamp: response.timestamp
  };
}

module.exports = {
  initWhatsApp,
  getClient,
  getStatus,
  sendMessage
};
