// src/lib/youtubeUtils.js
// YouTube URL se video ID nikalo aur transcript fetch karo

// ================================
// YouTube URL se Video ID nikalo
// ================================
export function extractVideoId(url) {
  if (!url) return null

  // Different YouTube URL formats handle karo
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/v\/)([^&\n?#]+)/,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

// ================================
// Video ka thumbnail URL banao
// ================================
export function getThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}

// ================================
// Video title fetch karo
// ================================
export async function getVideoTitle(videoId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    )
    if (!res.ok) return 'YouTube Video'
    const data = await res.json()
    return data.title || 'YouTube Video'
  } catch {
    return 'YouTube Video'
  }
}

// ================================
// Transcript fetch karo
// ================================
export async function fetchTranscript(videoId) {

  try {
    // Method 1 — youtube-transcript package
    const { YoutubeTranscript } = await import('youtube-transcript')

    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en'  // English prefer karo
    })

    if (transcript && transcript.length > 0) {
      const text = transcript
        .map(item => item.text)
        .join(' ')
        .replace(/\[.*?\]/g, '') // Remove [Music] etc
        .replace(/\s+/g, ' ')
        .trim()

      return { text, method: 'transcript' }
    }

  } catch (err) {
    console.log('youtube-transcript failed:', err.message)
  }

  // Method 2 — Manual transcript fetch
  try {
    const text = await fetchManualTranscript(videoId)
    if (text) return { text, method: 'manual' }
  } catch (err) {
    console.log('Manual fetch failed:', err.message)
  }

  return null
}

// ================================
// Manual transcript fetch
// ================================
async function fetchManualTranscript(videoId) {
  const res = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }
  )

  if (!res.ok) throw new Error('Video page fetch failed')

  const html    = await res.text()
  const captionMatch = html.match(/"captionTracks":\[{"baseUrl":"(.*?)"/)

  if (!captionMatch) throw new Error('No captions found')

  const captionUrl = JSON.parse(`"${captionMatch[1]}"`)
  const captionRes = await fetch(captionUrl)
  const captionXml = await captionRes.text()

  // XML parse karo
  const textMatches = captionXml.match(/<text[^>]*>(.*?)<\/text>/g) || []
  const text = textMatches
    .map(t => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'"))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text
}

// ================================
// Text chunks mein toddo
// ================================
export function chunkTranscript(text, maxChars = 3000) {
  if (text.length <= maxChars) return [text]

  const chunks    = []
  const sentences = text.split(/[.!?]+/)
  let current     = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars) {
      if (current) chunks.push(current.trim())
      current = sentence
    } else {
      current += sentence + '. '
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks
}