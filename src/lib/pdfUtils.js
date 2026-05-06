import * as pdfjsLib from 'pdfjs-dist'

// Version 3.11.174 ka CDN worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

export async function extractTextFromPDF(file) {

  const arrayBuffer = await file.arrayBuffer()

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
  }).promise

  let fullText     = ''
  const totalPages = pdf.numPages

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page    = await pdf.getPage(pageNum)
    const content = await page.getTextContent()

    const pageText = content.items
      .map(item => item.str)
      .join(' ')

    fullText += `\n${pageText}`
  }

  return {
    text:      fullText.trim(),
    totalPages,
    wordCount: fullText.split(/\s+/).filter(Boolean).length
  }
}

export function chunkText(text, maxChars = 3000) {
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