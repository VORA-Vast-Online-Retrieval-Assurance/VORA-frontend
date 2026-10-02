import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal Web Speech API types: not in lib.dom.d.ts, and we don't add @types packages for it.
type SpeechRecognitionErrorEvent = Event & { error: string }
type SpeechRecognitionResult = { isFinal: boolean; 0: { transcript: string } }
type SpeechRecognitionResultList = { length: number; [index: number]: SpeechRecognitionResult }
type SpeechRecognitionEvent = Event & { resultIndex: number; results: SpeechRecognitionResultList }
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
}

const ERROR_TEXT: Record<string, string> = {
  'not-allowed': 'Microphone blocked. Allow it in the browser’s site settings, then try again.',
  'service-not-allowed': 'Speech recognition is turned off in this browser',
  'no-speech': 'No speech was heard',
  network: 'A network error interrupted voice input',
  'audio-capture': 'No microphone was found',
  aborted: 'Voice input was stopped',
}

function errorText(code: string) {
  return ERROR_TEXT[code] ?? 'Voice input failed'
}

type Options = {
  onFinal?: (text: string) => void
}

/** Wraps the browser's Web Speech API. Unsupported browsers report `supported: false`. */
export function useSpeechToText({ onFinal }: Options = {}) {
  const Ctor = typeof window !== 'undefined' ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalRef = useRef(onFinal)
  useEffect(() => {
    onFinalRef.current = onFinal
  })

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(
    (lang = 'en-IN') => {
      if (!Ctor) {
        setError('Voice input works in Chrome and Edge')
        return
      }
      setError(null)
      setInterim('')
      const recognition = new Ctor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = lang
      recognition.onresult = (e) => {
        let finalText = ''
        let interimText = ''
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const result = e.results[i]
          if (result.isFinal) finalText += result[0].transcript
          else interimText += result[0].transcript
        }
        if (finalText) onFinalRef.current?.(finalText.trim())
        setInterim(interimText)
      }
      recognition.onerror = (e) => {
        // Stopping on purpose ends with 'aborted'; that's not something to warn about.
        if (e.error !== 'aborted') setError(errorText(e.error))
      }
      recognition.onend = () => {
        setListening(false)
        setInterim('')
      }
      recognitionRef.current = recognition
      recognition.start()
      setListening(true)
    },
    [Ctor],
  )

  useEffect(() => () => recognitionRef.current?.abort(), [])

  return { supported: Boolean(Ctor), listening, interim, error, start, stop }
}
