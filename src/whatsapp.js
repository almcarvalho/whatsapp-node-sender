const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { headless, chromeExecutablePath, authPath } = require('./config');
const { postToDiscord } = require('./discord');

let client;
let isReady = false;
let isInitializing = false;
const monitoredPages = new WeakSet();

function monitorBrowserErrors() {
  const page = client?.pupPage;
  if (!page || monitoredPages.has(page)) return;
  monitoredPages.add(page);

  page.on('pageerror', (error) => {
    console.error('[WhatsApp Browser] Erro JavaScript:', error);
  });
  page.on('error', (error) => {
    console.error('[WhatsApp Browser] Falha na pagina:', error);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      console.error('[WhatsApp Browser] Console:', message.text());
    }
  });
}

async function resolveSenderId(message) {
  const senderId = message.author || message.from;

  if (!senderId) {
    return null;
  }

  if (!senderId.endsWith('@lid')) {
    return senderId;
  }

  try {
    const contacts = await client.getContactLidAndPhone([senderId]);
    const phoneId = contacts?.[0]?.pn;

    if (phoneId) {
      return phoneId;
    }
  } catch (error) {
    console.warn('[WhatsApp] Nao foi possivel converter LID para numero:', error.message);
  }

  try {
    const contact = await message.getContact();

    if (contact?.number) {
      return `${contact.number}@c.us`;
    }
  } catch (error) {
    console.warn('[WhatsApp] Nao foi possivel obter o contato do remetente:', error.message);
  }

  return senderId;
}

function formatSenderId(senderId) {
  const digits = String(senderId || '').replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('55')) {
    return `(${digits.slice(2, 4)})${digits.slice(4)}`;
  }

  if (digits.length === 13 && digits.startsWith('55')) {
    return `(${digits.slice(2, 4)})${digits.slice(4)}`;
  }

  return String(senderId || '')
    .replace(/@c\.us$/i, '')
    .replace(/@lid$/i, '');
}

function shouldForwardMedia(message) {
  return message.hasMedia && ['image', 'audio', 'ptt'].includes(message.type);
}

function getMediaExtension(mimetype, fallback) {
  if (!mimetype) {
    return fallback;
  }

  if (mimetype.includes('jpeg')) return 'jpg';
  if (mimetype.includes('png')) return 'png';
  if (mimetype.includes('webp')) return 'webp';
  if (mimetype.includes('ogg')) return 'ogg';
  if (mimetype.includes('mpeg')) return 'mp3';
  if (mimetype.includes('mp4')) return 'mp4';

  return fallback;
}

function buildMediaFilename(message, media) {
  if (media?.filename) {
    return media.filename;
  }

  const extension = getMediaExtension(
    media?.mimetype,
    message.type === 'image' ? 'jpg' : 'bin'
  );

  return `whatsapp-${message.type || 'arquivo'}-${message.timestamp || Date.now()}.${extension}`;
}

function createWhatsAppClient() {
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: authPath
    }),
    puppeteer: {
      headless,
      executablePath: chromeExecutablePath || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    }
  });

  client.on('qr', (qr) => {
    monitorBrowserErrors();
    console.log('\nEscaneie o QR Code abaixo no WhatsApp:\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    monitorBrowserErrors();
    console.log('[WhatsApp] Autenticado com sucesso.');
  });

  client.on('loading_screen', (percent, message) => {
    monitorBrowserErrors();
    console.log(`[WhatsApp] Carregando: ${percent}% - ${message}`);
  });

  client.on('change_state', (state) => {
    console.log('[WhatsApp] Estado da conexao:', state);
  });

  client.on('error', (error) => {
    console.error('[WhatsApp] Erro do cliente:', error);
  });

  client.on('ready', () => {
    isReady = true;
    isInitializing = false;
    console.log('[WhatsApp] Cliente pronto para enviar e receber mensagens.');
  });

  client.on('disconnected', (reason) => {
    isReady = false;
    isInitializing = false;
    console.warn(`[WhatsApp] Cliente desconectado. Motivo: ${reason}`);
  });

  client.on('auth_failure', (msg) => {
    isReady = false;
    isInitializing = false;
    console.error('[WhatsApp] Falha de autenticação:', msg);
  });

  client.on('message', async (message) => {
    try {
      const senderId = await resolveSenderId(message);
      let media = null;

      if (shouldForwardMedia(message)) {
        const downloadedMedia = await message.downloadMedia();

        if (downloadedMedia?.data) {
          media = {
            data: downloadedMedia.data,
            mimetype: downloadedMedia.mimetype || 'application/octet-stream',
            filename: buildMediaFilename(message, downloadedMedia)
          };
        }
      }

      await postToDiscord({
        from: formatSenderId(senderId),
        body: message.body,
        media,
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
  if (client && isReady) {
    return client;
  }

  if (!client) {
    createWhatsAppClient();
  }

  if (isInitializing) {
    return client;
  }

  isInitializing = true;
  try {
    await client.initialize();
    monitorBrowserErrors();
  } catch (error) {
    isReady = false;
    isInitializing = false;
    throw error;
  }
  return client;
}

function getClient() {
  return client;
}

function getStatus() {
  return {
    ready: isReady,
    hasClient: Boolean(client),
    initializing: isInitializing
  };
}

function normalizeNumber(numero) {
  return String(numero || '').replace(/\D/g, '');
}

function buildChatId(numeroOuChatId) {
  const valor = String(numeroOuChatId || '').trim();

  if (valor.endsWith('@c.us')) {
    const numeroLimpo = valor.replace('@c.us', '').replace(/\D/g, '');

    if (!/^\d{12,14}$/.test(numeroLimpo)) {
      throw new Error('Número inválido. Use o formato 5579991298422.');
    }

    return `${numeroLimpo}@c.us`;
  }

  const sanitized = normalizeNumber(valor);

  if (!/^\d{12,14}$/.test(sanitized)) {
    throw new Error('Número inválido. Use o formato 5579991298422.');
  }

  return `${sanitized}@c.us`;
}

async function sendMessage(numeroOuChatId, texto) {
  if (!client || !isReady) {
    throw new Error('Cliente do WhatsApp ainda não está pronto.');
  }

  if (!texto || !String(texto).trim()) {
    throw new Error('Texto da mensagem é obrigatório.');
  }

  const chatId = buildChatId(numeroOuChatId);

  let numberId = null;

  try {
    numberId = await client.getNumberId(chatId);
  } catch (error) {
    throw new Error(`Erro ao validar número no WhatsApp: ${error.message}`);
  }

  if (!numberId || !numberId._serialized) {
    throw new Error('Número não está registrado no WhatsApp.');
  }

  const destinoFinal = numberId._serialized;

  try {
    const response = await client.sendMessage(destinoFinal, texto, {
      waitUntilMsgSent: true
    });

    if (!response) {
      console.warn('[WhatsApp] Envio concluido sem metadados da mensagem retornados pela biblioteca.');
    }

    return {
      id: response?.id?._serialized || null,
      to: destinoFinal,
      body: response?.body ?? texto,
      timestamp: response?.timestamp ?? null
    };
  } catch (error) {
    if (String(error.message || '').includes('No LID for user')) {
      throw new Error('Não foi possível localizar esse usuário no WhatsApp. Verifique se o número existe e está correto.');
    }

    throw error;
  }
}

module.exports = {
  initWhatsApp,
  getClient,
  getStatus,
  sendMessage
};
