'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Volume2, Mic, Play, Square, Info, Settings2, TestTube2 } from 'lucide-react'
import { toast } from 'sonner'

import {
    getAudioSettingsAPI,
    updateAudioSettingsAPI,
    getVoicesAPI,
    getAudioModelsAPI,
    textToSpeechAPI,
    speechToTextAPI
} from '@/api/os'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TextArea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useStore } from '@/store'
import { audioBufferToWav } from '@/lib/audio-utils'

import type { AudioSettings, Voice, AudioModel } from '@/types/os'

interface AudioSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    agentOSUrl: string
    authToken?: string
}

/**
 * AudioSettingsModal - Modern audio configuration interface
 * Provides comprehensive TTS and STT settings with live testing capabilities
 */
export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
    isOpen,
    onClose,
    agentOSUrl,
    authToken
}) => {
    // State Management
    const [settings, setSettings] = useState<AudioSettings>({
        tts_enabled: true,
        tts_model: 'facebook/mms-tts-eng',
        tts_voice: 'af_bella',
        stt_enabled: true,
        stt_model: 'openai/whisper-tiny',
        stt_language: 'en',
        auto_play_responses: false,
        audio_sample_rate: 24000
    })

    const [voices, setVoices] = useState<Voice[]>([])
    const [audioModels, setAudioModels] = useState<AudioModel[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'tts' | 'stt' | 'advanced'>('tts')

    // TTS Testing State
    const [testText, setTestText] = useState('Hello! This is a test of text to speech.')
    const [isTestingTTS, setIsTestingTTS] = useState(false)
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)

    // STT Testing State
    const [isRecording, setIsRecording] = useState(false)
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
    const [transcription, setTranscription] = useState('')
    const [isTranscribing, setIsTranscribing] = useState(false)

    // Load data on modal open
    useEffect(() => {
        if (isOpen) {
            loadData()
        }
        return () => {
            // Cleanup audio on unmount
            if (audioElement) {
                audioElement.pause()
                audioElement.src = ''
            }
        }
    }, [isOpen])

    /**
     * Load all audio configuration data
     */
    const loadData = async () => {
        setIsLoading(true)
        try {
            const [settingsData, voicesData, modelsData] = await Promise.all([
                getAudioSettingsAPI(agentOSUrl, authToken),
                getVoicesAPI(agentOSUrl, authToken),
                getAudioModelsAPI(agentOSUrl, authToken)
            ])

            if (settingsData) setSettings(settingsData)
            setVoices(Array.isArray(voicesData) ? voicesData : [])
            setAudioModels(Array.isArray(modelsData) ? modelsData : [])
        } catch (error) {
            console.error('Failed to load audio data:', error)
            toast.error('Failed to load audio settings')
        } finally {
            setIsLoading(false)
        }
    }

    /**
     * Save audio settings to backend and update store
     */
    const handleSave = async () => {
        setIsSaving(true)
        try {
            const result = await updateAudioSettingsAPI(agentOSUrl, settings, authToken)
            if (result) {
                // Update global store
                const store = useStore.getState()
                store.setAudioSettings(result)

                toast.success('Audio settings saved successfully')
                onClose()
            }
        } catch (error) {
            console.error('Failed to save settings:', error)
            toast.error('Failed to save audio settings')
        } finally {
            setIsSaving(false)
        }
    }

    /**
     * Test TTS with current settings
     */
    const handleTestTTS = async () => {
        if (!testText.trim()) {
            toast.error('Please enter text to test')
            return
        }

        setIsTestingTTS(true)
        try {
            const audioBlob = await textToSpeechAPI(
                agentOSUrl,
                testText,
                settings.tts_voice,
                authToken
            )

            if (audioBlob) {
                // Stop any currently playing audio
                if (audioElement) {
                    audioElement.pause()
                    audioElement.src = ''
                }

                const url = URL.createObjectURL(audioBlob)
                const audio = new Audio(url)

                audio.onplay = () => setIsPlaying(true)
                audio.onended = () => {
                    setIsPlaying(false)
                    URL.revokeObjectURL(url)
                }
                audio.onerror = () => {
                    setIsPlaying(false)
                    toast.error('Failed to play audio')
                    URL.revokeObjectURL(url)
                }

                setAudioElement(audio)
                await audio.play()
                toast.success('Playing audio...')
            }
        } catch (error) {
            console.error('TTS test failed:', error)
            toast.error('Failed to generate speech')
        } finally {
            setIsTestingTTS(false)
        }
    }

    /**
     * Stop currently playing audio
     */
    const handleStopAudio = useCallback(() => {
        if (audioElement) {
            audioElement.pause()
            audioElement.src = ''
            setIsPlaying(false)
        }
    }, [audioElement])

    /**
     * Start recording audio for STT testing
     */
    const startRecording = async () => {
        try {
            // Check if mediaDevices is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                toast.error('Your browser does not support audio recording. Please use a modern browser.')
                return
            }

            // Check if page is served over HTTPS (required for getUserMedia)
            if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                toast.error('Microphone access requires HTTPS. Please use a secure connection.')
                return
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream)
            const chunks: Blob[] = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data)
                }
            }

            recorder.onstop = async () => {
                setIsTranscribing(true)
                try {
                    const audioBlob = new Blob(chunks, { type: 'audio/webm' })

                    // Convert WebM to WAV using Web Audio API
                    const audioContext = new AudioContext()
                    const arrayBuffer = await audioBlob.arrayBuffer()
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

                    // Convert to WAV
                    const wavBlob = await audioBufferToWav(audioBuffer)
                    const audioFile = new File([wavBlob], 'recording.wav', { type: 'audio/wav' })

                    // Convert to text
                    const result = await speechToTextAPI(agentOSUrl, audioFile, authToken)
                    if (result) {
                        setTranscription(result.text)
                        toast.success('Transcription complete!')
                    }
                } catch (error) {
                    console.error('Transcription failed:', error)
                    toast.error('Failed to transcribe audio')
                } finally {
                    setIsTranscribing(false)
                }

                // Stop all tracks
                stream.getTracks().forEach((track) => track.stop())
            }

            recorder.start()
            setMediaRecorder(recorder)
            setIsRecording(true)
            toast.success('Recording started...')
        } catch (error: any) {
            console.error('Failed to start recording:', error)

            // Provide specific error messages based on error type
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                toast.error('Microphone access denied. Please grant permission in your browser settings.')
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                toast.error('No microphone found. Please connect a microphone and try again.')
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                toast.error('Microphone is already in use by another application.')
            } else if (error.name === 'OverconstrainedError') {
                toast.error('No microphone meets the specified requirements.')
            } else if (error.name === 'SecurityError') {
                toast.error('Microphone access blocked due to security settings.')
            } else {
                toast.error('Failed to access microphone. Please check your device settings.')
            }
        }
    }

    /**
     * Stop recording audio
     */
    const stopRecording = useCallback(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop()
            setIsRecording(false)
            setMediaRecorder(null)
        }
    }, [mediaRecorder])

    /**
     * Get voice details for display
     */
    const getSelectedVoice = () => {
        return voices.find((v) => v.id === settings.tts_voice)
    }

    if (!isOpen) return null

    const ttsModels = Array.isArray(audioModels) ? audioModels.filter((m) => m && m.type === 'tts') : []
    const sttModels = Array.isArray(audioModels) ? audioModels.filter((m) => m && m.type === 'stt') : []
    const selectedVoice = getSelectedVoice()

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="p-4 md:p-6 border-b border-border space-y-2">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-1.5 md:p-2 bg-accent rounded-lg">
                            <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg md:text-xl font-bold text-primary">
                                Audio Settings
                            </DialogTitle>
                            <DialogDescription className="text-xs md:text-sm text-muted hidden sm:block">
                                Configure text-to-speech and speech-to-text capabilities
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-muted">Loading audio settings...</p>
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'tts' | 'stt' | 'advanced')} className="p-4 md:p-6">
                            <TabsList className="grid w-full grid-cols-3 mb-4 md:mb-6 bg-accent">
                                <TabsTrigger value="tts" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                                    <Volume2 className="w-3 h-3 md:w-4 md:h-4" />
                                    <span className="hidden sm:inline">Text-to-Speech</span>
                                    <span className="sm:hidden">TTS</span>
                                </TabsTrigger>
                                <TabsTrigger value="stt" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                                    <Mic className="w-3 h-3 md:w-4 md:h-4" />
                                    <span className="hidden sm:inline">Speech-to-Text</span>
                                    <span className="sm:hidden">STT</span>
                                </TabsTrigger>
                                <TabsTrigger value="advanced" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                                    <Settings2 className="w-3 h-3 md:w-4 md:h-4" />
                                    <span className="hidden sm:inline">Advanced</span>
                                    <span className="sm:hidden">Adv</span>
                                </TabsTrigger>
                            </TabsList>

                            {/* TTS Tab */}
                            <TabsContent value="tts" className="space-y-4 md:space-y-6">
                                <Card className="bg-background border-border">
                                    <CardHeader className="pb-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <div>
                                                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                                                    <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                                    Text-to-Speech Configuration
                                                </CardTitle>
                                                <CardDescription className="mt-1 text-xs md:text-sm">
                                                    Convert text responses to natural-sounding speech
                                                </CardDescription>
                                            </div>
                                            <Badge variant={settings.tts_enabled ? 'default' : 'secondary'} className="w-fit">
                                                {settings.tts_enabled ? 'Enabled' : 'Disabled'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 md:space-y-6">
                                        {/* Enable TTS */}
                                        <div className={`flex items-center justify-between p-3 md:p-4 rounded-lg transition-colors ${settings.tts_enabled
                                            ? 'bg-primary/10 border border-primary/20'
                                            : 'bg-accent'
                                            }`}>
                                            <div className="flex-1">
                                                <Label htmlFor="tts-enabled" className="text-sm md:text-base font-semibold text-primary">
                                                    Enable Text-to-Speech
                                                </Label>
                                                <p className="text-xs md:text-sm text-muted mt-1">
                                                    Generate audio for AI responses
                                                </p>
                                            </div>
                                            <Switch
                                                id="tts-enabled"
                                                checked={settings.tts_enabled}
                                                onCheckedChange={(checked) =>
                                                    setSettings({ ...settings, tts_enabled: checked })
                                                }
                                            />
                                        </div>

                                        {settings.tts_enabled && (
                                            <>
                                                <Separator />

                                                {/* Model Selection */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="tts-model" className="text-sm font-semibold text-primary">
                                                        TTS Model
                                                    </Label>
                                                    <Select
                                                        value={settings.tts_model}
                                                        onValueChange={(value) =>
                                                            setSettings({ ...settings, tts_model: value })
                                                        }
                                                    >
                                                        <SelectTrigger id="tts-model" className="w-full bg-background">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-background-secondary">\n                                                            {ttsModels.length > 0 ? (
                                                            ttsModels.map((model) => (
                                                                <SelectItem key={model.id} value={model.id}>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium text-primary">{model.name}</span>
                                                                        <span className="text-xs text-muted">{model.description}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <SelectItem value="Kokoro-82M">Kokoro-82M</SelectItem>
                                                        )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Voice Selection */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="tts-voice" className="text-sm font-semibold text-primary">
                                                        Voice Selection
                                                    </Label>
                                                    <Select
                                                        value={settings.tts_voice}
                                                        onValueChange={(value) =>
                                                            setSettings({ ...settings, tts_voice: value })
                                                        }
                                                    >
                                                        <SelectTrigger id="tts-voice" className="w-full bg-background">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-background-secondary">
                                                            {voices.map((voice) => (
                                                                <SelectItem key={voice.id} value={voice.id}>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant={voice.gender === 'F' ? 'default' : 'secondary'} className="text-xs">
                                                                            {voice.gender}
                                                                        </Badge>
                                                                        <span className="font-medium text-primary">{voice.name}</span>
                                                                        <span className="text-xs text-muted hidden sm:inline">({voice.id})</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {selectedVoice && (
                                                        <p className="text-xs text-muted flex items-center gap-1 mt-2">
                                                            <Info className="w-3 h-3" />
                                                            {selectedVoice.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Auto-play */}
                                                <div className={`flex items-center justify-between p-3 md:p-4 rounded-lg transition-colors ${settings.auto_play_responses
                                                    ? 'bg-primary/10 border border-primary/20'
                                                    : 'bg-accent'
                                                    }`}>
                                                    <div className="flex-1">
                                                        <Label htmlFor="auto-play" className="text-sm font-semibold text-primary">
                                                            Auto-play Responses
                                                        </Label>
                                                        <p className="text-xs text-muted mt-1">
                                                            Automatically play audio when AI responds
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        id="auto-play"
                                                        checked={settings.auto_play_responses}
                                                        onCheckedChange={(checked) =>
                                                            setSettings({ ...settings, auto_play_responses: checked })
                                                        }
                                                    />
                                                </div>

                                                <Separator />

                                                {/* Test TTS */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <TestTube2 className="w-4 h-4 text-primary" />
                                                        <Label htmlFor="test-text" className="text-sm font-semibold text-primary">
                                                            Test Text-to-Speech
                                                        </Label>
                                                    </div>
                                                    <TextArea
                                                        id="test-text"
                                                        value={testText}
                                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTestText(e.target.value)}
                                                        placeholder="Enter text to convert to speech..."
                                                        rows={4}
                                                        className="resize-none bg-background text-sm"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={handleTestTTS}
                                                            disabled={isTestingTTS || isPlaying || !testText.trim()}
                                                            className="flex items-center gap-2 h-9 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium uppercase"
                                                            size="sm"
                                                        >
                                                            <Play className="w-4 h-4" />
                                                            {isTestingTTS ? 'Generating...' : 'Test Voice'}
                                                        </Button>
                                                        {isPlaying && (
                                                            <Button
                                                                onClick={handleStopAudio}
                                                                className="flex items-center gap-2 h-9 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-medium uppercase"
                                                                size="sm"
                                                            >
                                                                <Square className="w-4 h-4" />
                                                                Stop
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* STT Tab */}
                            <TabsContent value="stt" className="space-y-4 md:space-y-6">
                                <Card className="bg-background border-border">
                                    <CardHeader className="pb-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <div>
                                                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                                                    <Mic className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                                    Speech-to-Text Configuration
                                                </CardTitle>
                                                <CardDescription className="mt-1 text-xs md:text-sm">
                                                    Convert spoken audio to text input
                                                </CardDescription>
                                            </div>
                                            <Badge variant={settings.stt_enabled ? 'default' : 'secondary'} className="w-fit">
                                                {settings.stt_enabled ? 'Enabled' : 'Disabled'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 md:space-y-6">
                                        {/* Enable STT */}
                                        <div className={`flex items-center justify-between p-3 md:p-4 rounded-lg transition-colors ${settings.stt_enabled
                                            ? 'bg-primary/10 border border-primary/20'
                                            : 'bg-accent'
                                            }`}>
                                            <div className="flex-1">
                                                <Label htmlFor="stt-enabled" className="text-sm md:text-base font-semibold text-primary">
                                                    Enable Speech-to-Text
                                                </Label>
                                                <p className="text-xs md:text-sm text-muted mt-1">
                                                    Use voice input for messages
                                                </p>
                                            </div>
                                            <Switch
                                                id="stt-enabled"
                                                checked={settings.stt_enabled}
                                                onCheckedChange={(checked) =>
                                                    setSettings({ ...settings, stt_enabled: checked })
                                                }
                                            />
                                        </div>

                                        {settings.stt_enabled && (
                                            <>
                                                <Separator />

                                                {/* Model Selection */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="stt-model" className="text-sm font-semibold">
                                                        STT Model
                                                    </Label>
                                                    <Select
                                                        value={settings.stt_model}
                                                        onValueChange={(value) =>
                                                            setSettings({ ...settings, stt_model: value })
                                                        }
                                                    >
                                                        <SelectTrigger id="stt-model" className="w-full">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {sttModels.length > 0 ? (
                                                                sttModels.map((model) => (
                                                                    <SelectItem key={model.id} value={model.id}>
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium">{model.name}</span>
                                                                            <span className="text-xs text-gray-500">{model.description}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))
                                                            ) : (
                                                                <SelectItem value="moonshine-base">Moonshine Base</SelectItem>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Language Selection */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="stt-language" className="text-sm font-semibold">
                                                        Recognition Language
                                                    </Label>
                                                    <Select
                                                        value={settings.stt_language}
                                                        onValueChange={(value) =>
                                                            setSettings({ ...settings, stt_language: value })
                                                        }
                                                    >
                                                        <SelectTrigger id="stt-language" className="w-full">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="en">🇬🇧 English</SelectItem>
                                                            <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                                                            <SelectItem value="fr">🇫🇷 French</SelectItem>
                                                            <SelectItem value="de">🇩🇪 German</SelectItem>
                                                            <SelectItem value="it">🇮🇹 Italian</SelectItem>
                                                            <SelectItem value="pt">🇵🇹 Portuguese</SelectItem>
                                                            <SelectItem value="zh">🇨🇳 Chinese</SelectItem>
                                                            <SelectItem value="ja">🇯🇵 Japanese</SelectItem>
                                                            <SelectItem value="ko">🇰🇷 Korean</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <Separator />

                                                {/* Test STT */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <TestTube2 className="w-4 h-4 text-primary" />
                                                        <Label className="text-sm font-semibold text-primary">Test Speech-to-Text</Label>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {!isRecording ? (
                                                            <Button
                                                                onClick={startRecording}
                                                                className="flex items-center gap-2 h-9 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium uppercase"
                                                                size="sm"
                                                                disabled={isTranscribing}
                                                            >
                                                                <Mic className="w-4 h-4" />
                                                                <span className="hidden sm:inline">Start Recording</span>
                                                                <span className="sm:hidden">Record</span>
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                onClick={stopRecording}
                                                                className="flex items-center gap-2 h-9 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-medium uppercase animate-pulse"
                                                                size="sm"
                                                            >
                                                                <Square className="w-4 h-4" />
                                                                <span className="hidden sm:inline">Stop Recording</span>
                                                                <span className="sm:hidden">Stop</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {isTranscribing && (
                                                        <div className="flex items-center gap-2 text-sm text-muted">
                                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                            Transcribing...
                                                        </div>
                                                    )}
                                                    {transcription && (
                                                        <div className="p-3 md:p-4 bg-accent rounded-lg border border-border">
                                                            <p className="text-sm font-semibold mb-2 text-primary">Transcription Result:</p>
                                                            <p className="text-sm text-muted">
                                                                {transcription}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Advanced Tab */}
                            <TabsContent value="advanced" className="space-y-4 md:space-y-6">
                                <Card className="bg-background border-border">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                                            <Settings2 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                            Advanced Audio Settings
                                        </CardTitle>
                                        <CardDescription className="text-xs md:text-sm">
                                            Fine-tune audio quality and performance
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 md:space-y-6">
                                        {/* Sample Rate */}
                                        <div className="space-y-3">
                                            <Label htmlFor="sample-rate" className="text-sm font-semibold text-primary">
                                                Audio Sample Rate (Hz)
                                            </Label>
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                                                <Input
                                                    id="sample-rate"
                                                    type="number"
                                                    value={settings.audio_sample_rate}
                                                    onChange={(e) =>
                                                        setSettings({
                                                            ...settings,
                                                            audio_sample_rate: parseInt(e.target.value) || 24000
                                                        })
                                                    }
                                                    min="8000"
                                                    max="48000"
                                                    step="1000"
                                                    className="w-full sm:max-w-xs bg-background"
                                                />
                                                <Badge variant="outline">
                                                    {settings.audio_sample_rate >= 40000 ? 'Studio' :
                                                        settings.audio_sample_rate >= 20000 ? 'High' :
                                                            settings.audio_sample_rate >= 15000 ? 'Standard' : 'Basic'}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                                                {[8000, 16000, 24000, 48000].map((rate) => (
                                                    <Button
                                                        key={rate}
                                                        size="sm"
                                                        onClick={() => setSettings({ ...settings, audio_sample_rate: rate })}
                                                        className={`text-xs h-9 rounded-xl font-medium uppercase ${settings.audio_sample_rate === rate
                                                            ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                                            : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'
                                                            }`}
                                                    >
                                                        {rate / 1000}kHz
                                                    </Button>
                                                ))}
                                            </div>
                                            <div className="p-3 bg-accent rounded-lg border border-border">
                                                <p className="text-xs text-muted flex items-center gap-2">
                                                    <Info className="w-3 h-3" />
                                                    Higher sample rates provide better quality but require more bandwidth and storage
                                                </p>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Info Panel */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-primary">
                                                Sample Rate Guidelines
                                            </h4>
                                            <div className="grid gap-2 md:gap-3">
                                                <div className="p-2 md:p-3 bg-accent rounded-lg">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                                                        <span className="text-xs md:text-sm font-medium text-primary">8 kHz - Phone Quality</span>
                                                        <Badge variant="outline" className="text-xs w-fit">Basic</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted">
                                                        Minimal quality, suitable for low-bandwidth scenarios
                                                    </p>
                                                </div>
                                                <div className="p-2 md:p-3 bg-accent rounded-lg">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                                                        <span className="text-xs md:text-sm font-medium text-primary">16 kHz - Voice Recording</span>
                                                        <Badge variant="outline" className="text-xs w-fit">Standard</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted">
                                                        Good balance of quality and file size
                                                    </p>
                                                </div>
                                                <div className="p-2 md:p-3 bg-accent rounded-lg border border-primary/20">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                                                        <span className="text-xs md:text-sm font-medium text-primary">24 kHz - High Quality</span>
                                                        <Badge className="text-xs w-fit">Recommended</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted">
                                                        Excellent quality for speech synthesis (default)
                                                    </p>
                                                </div>
                                                <div className="p-2 md:p-3 bg-accent rounded-lg">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                                                        <span className="text-xs md:text-sm font-medium text-primary">48 kHz - Studio Quality</span>
                                                        <Badge variant="outline" className="text-xs w-fit">Premium</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted">
                                                        Maximum quality, larger files
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 md:p-6 border-t border-border bg-background">
                    <div className="text-xs text-muted">
                        {settings.tts_enabled && settings.stt_enabled ? (
                            <span>✓ Both TTS and STT enabled</span>
                        ) : settings.tts_enabled ? (
                            <span>✓ TTS enabled</span>
                        ) : settings.stt_enabled ? (
                            <span>✓ STT enabled</span>
                        ) : (
                            <span>No audio features enabled</span>
                        )}
                    </div>
                    <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isSaving}
                            className="flex-1 sm:flex-none h-9 rounded-xl bg-accent/30 text-xs font-medium uppercase hover:bg-accent/50"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || isLoading}
                            className="flex-1 sm:flex-none h-9 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium uppercase"
                        >
                            {isSaving ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>)
}