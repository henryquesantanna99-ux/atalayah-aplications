# AtalaYah YTDL Service

Serviço privado para preparar uma URL direta de áudio a partir de um vídeo do YouTube.

O AtalaYah usa este serviço apenas no backend, no fluxo:

1. Usuário escolhe uma música do YouTube no AtalaYah.
2. AtalaYah chama `GET /audio?url=...` neste serviço.
3. Este serviço retorna uma URL temporária de áudio.
4. AtalaYah envia essa URL para a MusicGPT separar as faixas.

## Variáveis

```bash
YTDL_SERVICE_TOKEN=um_token_forte
PORT=3000
```

## Endpoints

Todos os endpoints, exceto `/health`, exigem:

```txt
Authorization: Bearer YTDL_SERVICE_TOKEN
```

### Health

```txt
GET /health
```

### Info

```txt
GET /info?url=https://www.youtube.com/watch?v=...
```

### Audio

```txt
GET /audio?url=https://www.youtube.com/watch?v=...
```

Resposta esperada:

```json
{
  "success": true,
  "file": "https://..."
}
```

### Stream

```txt
GET /stream?url=https://www.youtube.com/watch?v=...
```

## Deploy

No Railway/Render/Fly.io, aponte o root directory para:

```txt
services/ytdl
```

Use o Dockerfile dessa pasta ou o comando:

```bash
npm start
```
