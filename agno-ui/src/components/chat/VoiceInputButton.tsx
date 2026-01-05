'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { speechToTextAPI } from '@/api/os'
import { useStore } from '@/store'
import { audioBufferToWav } from '@/lib/audio-utils'

interface VoiceInputButtonProps {
  onTranscription: (text: string) => void
  disabled?: boolean
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscription,
  disabled = false
}) => {
  const { selectedEndpoint, authToken, isRecording, setIsRecording, audioSettings } = useStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Check if STT is enabled
  const sttEnabled = audioSettings?.stt_enabled ?? false

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Your browser does not support audio recording. Please use a modern browser.')
        return
      }

      // Check if page is served over HTTPS (required for getUserMedia)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        toast.error('Microphone access requires HTTPS. Please use a secure connection.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())

        // Process the audio
        setIsProcessing(true)
        try {
          // Convert WebM to WAV using Web Audio API
          const audioContext = new AudioContext()
          const arrayBuffer = await audioBlob.arrayBuffer()
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

          // Convert to WAV
          const wavBlob = await audioBufferToWav(audioBuffer)
          const audioFile = new File([wavBlob], 'recording.wav', { type: 'audio/wav' })

          const result = await speechToTextAPI(selectedEndpoint, audioFile, authToken)
          if (result && result.text) {
            onTranscription(result.text)
            toast.success('Transcription complete!')
          } else {
            toast.error('No transcription received from server')
          }
        } catch (error) {
          console.error('Transcription error:', error)
          const errorMessage = error instanceof Error ? error.message : String(error)
          toast.error(`Failed to transcribe audio: ${errorMessage}`)
        } finally {
          setIsProcessing(false)
          setIsRecording(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      toast.info('Recording... Click to stop', { duration: Infinity, id: 'recording' })
    } catch (error: any) {
      console.error('Error accessing microphone:', error)

      // Provide specific error messages based on error type
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Microphone access denied. Please grant permission in your browser settings.', { duration: 5000 })
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('No microphone found. Please connect a microphone and try again.', { duration: 5000 })
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        toast.error('Microphone is already in use by another application.', { duration: 5000 })
      } else if (error.name === 'OverconstrainedError') {
        toast.error('No microphone meets the specified requirements.', { duration: 5000 })
      } else if (error.name === 'SecurityError') {
        toast.error('Microphone access blocked due to security settings.', { duration: 5000 })
      } else {
        toast.error(`Failed to access microphone: ${error.message || 'Unknown error'}`, { duration: 5000 })
      }
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      toast.dismiss('recording')
      toast.info('Processing audio...')
    }
  }

  const handleClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  if (!sttEnabled) {
    return null // Don't show button if STT is disabled
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`h-9 w-9 rounded-lg transition-all ${isRecording
        ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
        : 'hover:bg-accent'
        }`}
      title={isRecording ? 'Stop recording' : 'Start voice input'}
    >
      {isRecording ? (
        <Square className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  )
}
