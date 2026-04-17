import express from 'express'
import cors from 'cors'
import ytdl from '@distube/ytdl-core'
import miniget from 'miniget'

const app = express()
const port = process.env.PORT || 3000
const serviceToken = process.env.YTDL_SERVICE_TOKEN?.trim()

app.use(cors())

function isAuthorized(request) {
  if (!serviceToken) return false

  const authorization = request.get('authorization') || ''
  const token = (
    authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : request.get('x-ytdl-service-token')
  )?.trim()

  return token === serviceToken
}

function requireToken(request, response, next) {
  if (isAuthorized(request)) {
    next()
    return
  }

  response.status(401).json({
    success: false,
    error: serviceToken ? 'Unauthorized' : 'YTDL_SERVICE_TOKEN is not configured.',
  })
}

function isValidYoutubeUrl(url) {
  return typeof url === 'string' && ytdl.validateURL(url)
}

function pickAudioFormat(info) {
  const audioFormats = ytdl.filterFormats(info.formats, 'audioonly')
  return ytdl.chooseFormat(audioFormats, {
    quality: 'highestaudio',
  })
}

app.get('/health', (_request, response) => {
  response.json({ success: true, status: 'ok' })
})

app.get('/info', requireToken, async (request, response) => {
  const url = request.query.url

  if (!isValidYoutubeUrl(url)) {
    response.status(400).json({
      success: false,
      error: 'A valid YouTube url is required.',
    })
    return
  }

  try {
    const info = await ytdl.getInfo(url)
    const details = info.videoDetails

    response.json({
      success: true,
      title: details.title,
      videoid: details.videoId,
      thumb: details.thumbnails?.at(-1)?.url ?? null,
      duration: details.lengthSeconds,
      likes: details.likes ?? null,
    })
  } catch (error) {
    response.status(502).json({
      success: false,
      error: error instanceof Error ? error.message : 'Could not read video info.',
    })
  }
})

app.get('/audio', requireToken, async (request, response) => {
  const url = request.query.url

  if (!isValidYoutubeUrl(url)) {
    response.status(400).json({
      success: false,
      error: 'A valid YouTube url is required.',
    })
    return
  }

  try {
    const info = await ytdl.getInfo(url)
    const format = pickAudioFormat(info)

    if (!format?.url) {
      response.status(404).json({
        success: false,
        error: 'No audio format found for this video.',
      })
      return
    }

    response.json({
      success: true,
      file: format.url,
      title: info.videoDetails.title,
      duration: info.videoDetails.lengthSeconds,
      mimeType: format.mimeType ?? null,
      bitrate: format.audioBitrate ?? null,
    })
  } catch (error) {
    response.status(502).json({
      success: false,
      error: error instanceof Error ? error.message : 'Could not prepare audio.',
    })
  }
})

app.get('/stream', requireToken, async (request, response) => {
  const url = request.query.url

  if (!isValidYoutubeUrl(url)) {
    response.status(400).json({
      success: false,
      error: 'A valid YouTube url is required.',
    })
    return
  }

  try {
    const info = await ytdl.getInfo(url)
    const format = pickAudioFormat(info)

    if (!format?.url) {
      response.status(404).json({
        success: false,
        error: 'No audio format found for this video.',
      })
      return
    }

    response.setHeader('Content-Type', format.mimeType?.split(';')[0] ?? 'audio/mp4')
    miniget(format.url).pipe(response)
  } catch (error) {
    response.status(502).json({
      success: false,
      error: error instanceof Error ? error.message : 'Could not stream audio.',
    })
  }
})

app.use((_request, response) => {
  response.status(404).json({
    success: false,
    error: 'Not found',
  })
})

app.listen(port, () => {
  console.log(`AtalaYah ytdl service running on port ${port}`)
})
