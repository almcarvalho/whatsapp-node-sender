const axios = require('axios');
const FormData = require('form-data');
const { discordWebhookUrl } = require('./config');

function buildDiscordContent(messageData) {
  return [
    '📩 **Nova mensagem recebida no WhatsApp**',
    `**De:** ${messageData.from}`,
    `**Nome:** ${messageData.pushname || 'Não identificado'}`,
    `**Texto:** ${messageData.body || '(sem texto)'}`,
    `**Tipo:** ${messageData.type || 'desconhecido'}`,
    `**Em:** ${new Date().toLocaleString('pt-BR')}`
  ].join('\n');
}

async function postToDiscord(messageData) {
  if (!discordWebhookUrl) {
    console.warn('[Discord] DISCORD_WEBHOOK_URL não configurado. Evento ignorado.');
    return;
  }

  const content = buildDiscordContent(messageData);

  if (messageData.media?.data) {
    const form = new FormData();

    form.append('payload_json', JSON.stringify({ content }));
    form.append('files[0]', Buffer.from(messageData.media.data, 'base64'), {
      filename: messageData.media.filename,
      contentType: messageData.media.mimetype
    });

    await axios.post(discordWebhookUrl, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      timeout: 30000
    });

    return;
  }

  await axios.post(discordWebhookUrl, { content }, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });
}

module.exports = {
  postToDiscord
};
