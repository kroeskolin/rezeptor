import { useState, useRef } from 'react'
import './VoiceInput.css'

function VoiceInput({ onTranscript }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const startRecording = async () => {
    setError('')
    setTranscript('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // iOS unterstützt am besten audio/mp4, andere Browser webm
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/aac'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setIsRecording(false)
        setIsProcessing(true)
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType })
          const base64 = await blobToBase64(blob)
          const { transcribeAudio } = await import('../db/ai')
          const text = await transcribeAudio(base64, mimeType)
          setTranscript(text)
        } catch (e) {
          setError('Transkription fehlgeschlagen: ' + e.message)
        } finally {
          setIsProcessing(false)
        }
      }

      recorder.start()
      setIsRecording(true)
    } catch (e) {
      setError('Mikrofon konnte nicht gestartet werden. Bitte Berechtigung prüfen.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  return (
    <div className="voice-input">
      {!isRecording && !isProcessing && (
        <button className="voice-button" onClick={startRecording}>
          🎤 Sprechen
        </button>
      )}

      {isRecording && (
        <button className="voice-button recording" onClick={stopRecording}>
          ⏹ Aufnahme stoppen
        </button>
      )}

      {isProcessing && (
        <div className="voice-processing">
          <div className="voice-spinner" />
          <span>Wird transkribiert …</span>
        </div>
      )}

      {error && (
        <div className="voice-error">{error}</div>
      )}

      {transcript && !isProcessing && (
        <>
          <div className="transcript">
            <p>{transcript}</p>
          </div>
          <button className="save-button" onClick={() => onTranscript(transcript)}>
            Rezept daraus erstellen ✨
          </button>
        </>
      )}
    </div>
  )
}

export default VoiceInput
