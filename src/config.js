const path = require('path');
require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT || 3000),
  apiKey: process.env.API_KEY || '',
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  headless: String(process.env.HEADLESS || 'true').toLowerCase() === 'true',
  chromeExecutablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
  authPath: path.resolve(process.cwd(), '.wwebjs_auth')
};
