# WhatsApp Puppeteer API

Projeto em Node.js que:

- conecta ao WhatsApp usando **whatsapp-web.js** + **Puppeteer**;
- expõe `POST /enviar` com autenticação por `x-api-key`;
- expõe `GET /health`;
- envia mensagens recebidas no WhatsApp para um canal do Discord via webhook;
- publica a documentação Swagger em `/docs`.

## Requisitos

- Node.js 18+
- Google Chrome/Chromium instalado
- Conta do WhatsApp para escanear o QR Code
- Webhook do Discord apontando para o canal desejado

## Instalação

```bash
npm install
```

## Configuração

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Preencha:

```env
PORT=3000
API_KEY=sua-chave-super-secreta
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/SEU_ID/SEU_TOKEN
HEADLESS=true
CHROME_EXECUTABLE_PATH=
NODE_ENV=development
```

### Observações

- `API_KEY`: chave usada no header `x-api-key` do endpoint `/enviar`.
- `DISCORD_WEBHOOK_URL`: webhook do canal fixo do Discord.
- `HEADLESS=false`: útil na primeira autenticação, caso queira depurar.
- `CHROME_EXECUTABLE_PATH`: informe apenas se o Chrome não for encontrado automaticamente.

## Executando

```bash
npm run dev
```

ou

```bash
npm start
```

Ao iniciar, um QR Code será exibido no terminal. Escaneie com o WhatsApp.

## Endpoints

### GET /health

Retorna o status da aplicação.

Exemplo:

```json
{
  "status": "ok",
  "whatsapp": {
    "ready": true,
    "hasClient": true
  }
}
```

### POST /enviar

Header obrigatório:

```http
x-api-key: sua-chave-super-secreta
```

Body:

```json
{
  "numero": "5579991298422",
  "texto": "Olá, tudo bem?"
}
```

Resposta de sucesso:

```json
{
  "success": true,
  "message": "Mensagem enviada com sucesso.",
  "data": {
    "id": "true_5511999999999@c.us_3EB0...",
    "to": "5579991298422@c.us",
    "body": "Olá, tudo bem?",
    "timestamp": 1710000000
  }
}
```

## Swagger

Abra:

```text
http://localhost:3000/docs
```

## Estrutura

```text
src/
  config.js
  discord.js
  server.js
  swagger.js
  whatsapp.js
```

## Teste com cURL

```bash
curl --request POST \
  --url http://localhost:3000/enviar \
  --header 'Content-Type: application/json' \
  --header 'x-api-key: sua-chave-super-secreta' \
  --data '{
    "numero": "5579991298422",
    "texto": "Mensagem de teste"
  }'
```

## Importante

Integrações com WhatsApp Web podem sofrer quebras quando o WhatsApp altera o funcionamento do web client. Se ocorrer, atualize as dependências e valide a sessão novamente.
