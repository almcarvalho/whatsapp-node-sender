const express = require('express');
const cors = require('cors');
const { port, apiKey } = require('./config');
const { swaggerUi, swaggerSpec } = require('./swagger');
const { initWhatsApp, getStatus, sendMessage } = require('./whatsapp');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

function apiKeyGuard(req, res, next) {
  const requestKey = req.header('x-api-key');

  if (!apiKey) {
    return res.status(500).json({ error: 'API_KEY não configurada no ambiente.' });
  }

  if (!requestKey || requestKey !== apiKey) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  return next();
}

function normalizeWhatsAppNumber(numero) {
  if (!numero) return '';

  return String(numero).replace(/\D/g, '');
}

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Verifica a saúde da aplicação
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Aplicação funcionando
 */
app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    whatsapp: getStatus()
  });
});

/**
 * @openapi
 * /enviar:
 *   post:
 *     summary: Envia uma mensagem para um número no WhatsApp
 *     tags: [Mensagens]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         schema:
 *           type: string
 *         description: Chave da API para autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EnviarMensagemRequest'
 *     responses:
 *       200:
 *         description: Mensagem enviada com sucesso
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro ao enviar mensagem
 */
app.post('/enviar', apiKeyGuard, async (req, res) => {
  try {
    const { numero, texto } = req.body || {};

    if (!numero || !texto) {
      return res.status(400).json({
        error: 'Os campos numero e texto são obrigatórios.'
      });
    }

    const numeroLimpo = normalizeWhatsAppNumber(numero);

    if (!numeroLimpo) {
      return res.status(400).json({
        error: 'Número inválido.'
      });
    }

    if (numeroLimpo.length < 12 || numeroLimpo.length > 13) {
      return res.status(400).json({
        error: 'O número deve estar no formato DDI + DDD + número, sem símbolos.'
      });
    }

    const chatId = `${numeroLimpo}@c.us`;

    const result = await sendMessage(chatId, texto);

    return res.status(200).json({
      success: true,
      message: 'Mensagem enviada com sucesso.',
      data: {
        numero: numeroLimpo,
        chatId,
        result
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Erro interno ao enviar mensagem.'
    });
  }
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((req, res) => {
  return res.status(404).json({ error: 'Rota não encontrada.' });
});

app.listen(port, async () => {
  console.log(`API rodando em http://localhost:${port}`);
  console.log(`Swagger disponível em http://localhost:${port}/docs`);

  try {
    await initWhatsApp();
  } catch (error) {
    console.error('[WhatsApp] Erro ao inicializar cliente:', error.message);
  }
});