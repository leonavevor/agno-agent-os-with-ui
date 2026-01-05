/**
 * Audio API Client
 * Provides comprehensive audio functionality for TTS and STT
 */

import { audioRoutes } from './routes'
import type {
    AudioSettings,
    AudioSettingsUpdate,
    Voice,
    AudioModel,
    TTSRequest,
    STTResponse
} from '@/types/os'

/**
 * Get current audio settings
 */
export const getAudioSettingsAPI = async (
    agentOSUrl: string,
    authToken?: string
): Promise<AudioSettings | null> => {
    try {
        const response = await fetch(`${agentOSUrl}${audioRoutes.settings}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to get audio settings: ${response.statusText}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error fetching audio settings:', error)
        return null
    }
}

/**
 * Update audio settings
 */
export const updateAudioSettingsAPI = async (
    agentOSUrl: string,
    settings: AudioSettingsUpdate,
    authToken?: string
): Promise<AudioSettings | null> => {
    try {
        const response = await fetch(`${agentOSUrl}${audioRoutes.settings}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify(settings)
        })

        if (!response.ok) {
            throw new Error(`Failed to update audio settings: ${response.statusText}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error updating audio settings:', error)
        return null
    }
}

/**
 * Convert text to speech
 * @returns Audio blob for playback
 */
export const textToSpeechAPI = async (
    agentOSUrl: string,
    text: string,
    voice?: string,
    authToken?: string
): Promise<Blob | null> => {
    try {
        const payload: TTSRequest = { text, voice }

        const response = await fetch(`${agentOSUrl}${audioRoutes.tts}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            throw new Error(`Failed to generate speech: ${response.statusText}`)
        }

        return await response.blob()
    } catch (error) {
        console.error('Error generating speech:', error)
        return null
    }
}

/**
 * Convert speech to text
 * @param audioFile Audio file to transcribe (WAV, MP3, WEBM, etc.)
 */
export const speechToTextAPI = async (
    agentOSUrl: string,
    audioFile: File,
    authToken?: string
): Promise<STTResponse | null> => {
    try {
        const formData = new FormData()
        formData.append('audio', audioFile) // Changed from 'audio_file' to match backend

        const response = await fetch(`${agentOSUrl}${audioRoutes.stt}`, {
            method: 'POST',
            headers: {
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
            },
            body: formData
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const errorMessage = errorData.detail || response.statusText
            throw new Error(`Failed to transcribe speech: ${errorMessage}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error transcribing speech:', error)
        return null
    }
}

/**
 * Get available TTS voices
 */
export const getVoicesAPI = async (
    agentOSUrl: string,
    authToken?: string
): Promise<Voice[]> => {
    try {
        const response = await fetch(`${agentOSUrl}${audioRoutes.voices}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to get voices: ${response.statusText}`)
        }

        const data = await response.json()
        return data.voices || []
    } catch (error) {
        console.error('Error fetching voices:', error)
        return []
    }
}

/**
 * Get available audio models (TTS and STT)
 */
export const getAudioModelsAPI = async (
    agentOSUrl: string,
    authToken?: string
): Promise<AudioModel[]> => {
    try {
        const response = await fetch(`${agentOSUrl}${audioRoutes.models}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to get audio models: ${response.statusText}`)
        }

        const data = await response.json()
        return data.models || []
    } catch (error) {
        console.error('Error fetching audio models:', error)
        return []
    }
}
