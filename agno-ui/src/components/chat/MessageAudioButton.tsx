'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Volume2, Square, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { textToSpeechAPI } from '@/api/os'
import { useStore } from '@/store'

interface MessageAudioButtonProps {
  text: string
  messageId: string
}

export const MessageAudioButton: React.FC<MessageAudioButtonProps> = ({
  text,
  messageId
}) => {
  const {
    selectedEndpoint,
    authToken,
    audioSettings,
    currentlyPlayingMessageId,
    setCurrentlyPlayingMessageId,
    setIsPlayingAudio
  } = useStore()

  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Check if this message is currently playing
  const isPlaying = currentlyPlayingMessageId === messageId

  // Check if TTS is enabled
  const ttsEnabled = audioSettings?.tts_enabled ?? false

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  // Stop audio if another message starts playing
  useEffect(() => {
    if (currentlyPlayingMessageId !== messageId && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
  }, [currentlyPlayingMessageId, messageId])

  const playAudio = async () => {
    if (!text || !text.trim()) {
      toast.error('No text to convert to speech')
      return
    }

    setIsLoading(true)
    try {
      const voice = audioSettings?.tts_voice || undefined
      const audioBlob = await textToSpeechAPI(
        selectedEndpoint,
        text,
        voice,
        authToken
      )

      if (audioBlob) {
        // Stop any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.src = ''
        }

        const url = URL.createObjectURL(audioBlob)
        const audio = new Audio(url)
        audioRef.current = audio

        audio.onplay = () => {
          setCurrentlyPlayingMessageId(messageId)
          setIsPlayingAudio(true)
        }

        audio.onended = () => {
          setCurrentlyPlayingMessageId(null)
          setIsPlayingAudio(false)
          URL.revokeObjectURL(url)
        }

        audio.onerror = () => {
          setCurrentlyPlayingMessageId(null)
          setIsPlayingAudio(false)
          toast.error('Failed to play audio')
          URL.revokeObjectURL(url)
        }

        await audio.play()
      }
    } catch (error) {
      console.error('Error playing audio:', error)
      toast.error('Failed to generate audio')
      setCurrentlyPlayingMessageId(null)
      setIsPlayingAudio(false)
    } finally {
      setIsLoading(false)
    }
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      setCurrentlyPlayingMessageId(null)
      setIsPlayingAudio(false)
    }
  }

  const handleClick = () => {
    if (isPlaying) {
      stopAudio()
    } else {
      playAudio()
    }
  }

  if (!ttsEnabled) {
    return null // Don't show button if TTS is disabled
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isLoading}
      className={`h-7 w-7 rounded-lg transition-all ${isPlaying
          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
          : 'hover:bg-accent'
        }`}
      title={isPlaying ? 'Stop audio' : 'Play as audio'}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isPlaying ? (
        <Square className="h-3.5 w-3.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </Button>
  )
}
