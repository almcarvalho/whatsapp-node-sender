const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'WhatsApp Puppeteer API',
      version: '1.0.0',
      description: 'API para envio de mensagens via WhatsApp Web JS e integração com Discord.'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor local'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key'
        }
      },
      schemas: {
        EnviarMensagemRequest: {
          type: 'object',
          required: ['numero', 'texto'],
          properties: {
            numero: {
              type: 'string',
              example: '5579991298422',
              description: 'Número no formato DDI + DDD + número, sem símbolos.'
            },
            texto: {
              type: 'string',
              example: 'Olá! Esta é uma mensagem enviada pela API.'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./src/server.js']
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec
};
