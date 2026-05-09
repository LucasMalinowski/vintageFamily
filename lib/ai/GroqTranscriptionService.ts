export type TranscriptionResult = {
  text: string
  model: string
}

const TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo'

export class GroqTranscriptionService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY!
  }

  async transcribeAudio(
    audio: Buffer,
    mimeType: string,
    filename = 'whatsapp-audio.ogg'
  ): Promise<TranscriptionResult> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)

    try {
      const form = new FormData()
      form.append('model', TRANSCRIPTION_MODEL)
      form.append('language', 'pt')
      form.append('response_format', 'json')
      const audioBytes = new Uint8Array(audio)
      form.append('file', new Blob([audioBytes], { type: mimeType }), filename)

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: form,
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Groq transcription error ${response.status}: ${body}`)
      }

      const data = await response.json() as { text?: string }
      const text = (data.text ?? '').trim()
      if (!text) throw new Error('Groq transcription returned empty text')

      return { text, model: TRANSCRIPTION_MODEL }
    } finally {
      clearTimeout(timeout)
    }
  }
}

export const groqTranscriptionService = new GroqTranscriptionService()
