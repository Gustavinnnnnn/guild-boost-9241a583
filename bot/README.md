# 🤖 CoinsDM — Bot Discord

Bot oficial do CoinsDM/ServerBoost. Os usuários compram DMs, criam campanhas e veem métricas direto pelo Discord. O bot conversa com a API hospedada no Lovable Cloud (edge function `bot-api`).

## 📋 Comandos disponíveis

| Comando | O que faz |
|---|---|
| `/dashboard` | Saldo de DMs e métricas resumidas |
| `/comprar <quantidade>` | Gera PIX para comprar DMs (mínimo 150 = R$ 30) |
| `/divulgar <quantidade>` | Cria e dispara uma campanha de DMs em massa |
| `/campanhas` | Lista suas últimas campanhas |
| `/afiliado` | Seu link de afiliado e ganhos |
| `/painel` | Link do painel web (gráficos detalhados) |
| `/ajuda` | Lista todos os comandos |

---

## 🛠️ Setup (passo a passo)

### 1. Criar o bot no Discord Developer Portal

1. Acesse <https://discord.com/developers/applications>
2. Clique em **New Application** e dê um nome (ex: "CoinsDM Bot")
3. Vá em **Bot** → clique em **Reset Token** → copie o token
4. Em **Bot** → ative **Server Members Intent** (não obrigatório agora, mas útil) e desative **Public Bot** se quiser que só você adicione
5. Em **OAuth2** → **URL Generator**:
   - Marque scopes: `bot`, `applications.commands`
   - Permissões mínimas: `Send Messages`, `Use Slash Commands`, `Embed Links`, `Attach Files`
   - Copie a URL gerada e abra no navegador para adicionar o bot ao seu servidor

### 2. Configurar variáveis no `.env`

```bash
cp .env.example .env
nano .env   # ou seu editor preferido
```

Preencha:
- `DISCORD_TOKEN` — token do passo 1
- `DISCORD_CLIENT_ID` — Application ID (em **General Information**)
- `DEV_GUILD_ID` — *(opcional)* ID do seu servidor de testes (clica direito no server → Copy Server ID; precisa de modo dev ativado). Se preencher, comandos sobem instantâneo só nesse servidor. Em produção, deixe vazio.
- `BOT_API_URL` — já vem preenchido com a URL do Lovable Cloud
- `BOT_API_KEY` — **mesma string** que você cadastrou como segredo `BOT_API_KEY` no Lovable Cloud

### 3. Instalar e registrar comandos

```bash
npm install
npm run deploy-commands   # registra slash commands no Discord
```

> Rode `deploy-commands` novamente sempre que adicionar/alterar um comando.

### 4. Rodar o bot

```bash
npm start
```

Pronto. Vá ao Discord e digite `/` no servidor — os comandos do bot devem aparecer.

---

## ☁️ Hospedando na Discloud (RECOMENDADO — fácil)

A Discloud já está pré-configurada via `discloud.config`. É só zipar e subir.

### 1. Prepare o `.env`
No seu PC, na pasta `bot/`, copie e preencha:
```bash
cp .env.example .env
```
Preencha **todos** os campos do `.env` (token, client id, BOT_API_KEY, etc).

### 2. Registre os slash commands (uma vez só)
Antes de subir, rode no seu PC pra registrar os comandos no Discord:
```bash
npm install
npm run deploy-commands
```
> Você só precisa rodar isso de novo quando adicionar/alterar comandos. A Discloud não roda esse script — ela só executa o `npm start`.

### 3. Zipe a pasta
**Importante**: zipe o **conteúdo** da pasta `bot/`, não a pasta inteira. O `discloud.config` precisa estar na **raiz do zip**.

No Windows: entre na pasta `bot/`, selecione tudo (Ctrl+A), botão direito → "Compactar para arquivo zip".

No Linux/Mac:
```bash
cd bot
zip -r ../coinsdm-bot.zip . -x "node_modules/*" "*.log"
```

> ⚠️ **Não inclua `node_modules`** — a Discloud instala sozinha. Se incluir, vai estourar o limite de tamanho.

### 4. Suba na Discloud
1. Acesse <https://discloudbot.com/dashboard> e faça login
2. Clique em **"Subir aplicativo"** (ou via comando `.up` no servidor da Discloud)
3. Anexe o `coinsdm-bot.zip`
4. Aguarde o build — a Discloud roda `npm install` e depois `npm start` automaticamente

### 5. Acompanhe os logs
No dashboard da Discloud, abra seu app e veja a aba **Logs**. Procure por:
- `✅ X comandos carregados.`
- `🤖 Logado como NomeDoBot#1234`

Se aparecer `401 unauthorized`, sua `BOT_API_KEY` no `.env` não bate com a do Lovable Cloud.

### Atualizando o bot depois
Faça as alterações, zipe de novo, e na Discloud use a opção **"Commit"** (atualizar app existente) — isso preserva o app e só substitui os arquivos.

---

## 🚀 Alternativas (VPS, PM2, Docker)

<details>
<summary>Clique se preferir VPS ao invés de Discloud</summary>

### PM2 (VPS Linux)
```bash
npm install -g pm2
pm2 start src/index.js --name coinsdm-bot
pm2 save && pm2 startup
pm2 logs coinsdm-bot
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "src/index.js"]
```
```bash
docker build -t coinsdm-bot .
docker run -d --name coinsdm-bot --env-file .env --restart=always coinsdm-bot
```

</details>


---

## 🔄 Como funciona por baixo dos panos

1. Usuário roda `/comprar 200` no Discord
2. Bot envia POST para `BOT_API_URL?action=buy-dms` com header `x-bot-api-key`
3. Edge function valida a chave, identifica/cria o profile pelo `discord_id`, gera o PIX no Paradise e devolve o copia-e-cola + QR
4. Bot mostra o PIX no DM/canal com botão "Já paguei"
5. Ao clicar, bot chama `?action=check-payment` e credita as DMs se aprovado

A conta do usuário é criada automaticamente na primeira interação (sem login, sem OAuth). O `discord_id` é a chave única.

---

## 🆘 Troubleshooting

**Comandos não aparecem no Discord**
- Comandos globais demoram até 1h. Use `DEV_GUILD_ID` para testar instantâneo.
- Re-rode `npm run deploy-commands` após mudanças.

**`401 unauthorized` nos logs**
- `BOT_API_KEY` no `.env` precisa ser **idêntico** ao segredo do Lovable Cloud.

**`gateway_error` ao comprar**
- Verifique o secret `PARADISE_API_KEY` no Lovable Cloud.

**Bot fica offline**
- Use PM2/systemd com `Restart=always`. Sem isso, qualquer crash derruba o bot.

---

## 📞 Suporte

Bug no bot? Abra issue no repositório ou contate o admin.
