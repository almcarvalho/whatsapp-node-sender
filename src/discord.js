const axios = require('axios');
const { discordWebhookUrl } = require('./config');

async function postToDiscord(messageData) {
  if (!discordWebhookUrl) {
    console.warn('[Discord] DISCORD_WEBHOOK_URL não configurado. Evento ignorado.');
    return;
  }

  const payload = {
    content: [
      '📩 **Nova mensagem recebida no WhatsApp**',
      `**De:** ${messageData.from}`,
      `**Nome:** ${messageData.pushname || 'Não identificado'}`,
      `**Texto:** ${messageData.body || '(sem texto)'}`,
      `**Tipo:** ${messageData.type || 'desconhecido'}`,
      `**Em:** ${new Date().toLocaleString('pt-BR')}`
    ].join('\n')
  };

  await axios.post(discordWebhookUrl, payload, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });
}

module.exports = {
  postToDiscord
};
