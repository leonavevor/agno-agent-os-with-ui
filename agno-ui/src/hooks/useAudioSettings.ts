import { useEffect } from 'react'
import { useStore } from '@/store'
import { getAudioSettingsAPI } from '@/api/os'

export const useAudioSettings = () => {
  const { selectedEndpoint, authToken, audioSettings, setAudioSettings } = useStore()

  useEffect(() => {
    const loadAudioSettings = async () => {
      if (!selectedEndpoint) return

      try {
        const settings = await getAudioSettingsAPI(selectedEndpoint, authToken)
        if (settings) {
          setAudioSettings(settings)
        }
      } catch (error) {
        console.error('Failed to load audio settings:', error)
      }
    }

    loadAudioSettings()
  }, [selectedEndpoint, authToken, setAudioSettings])

  return audioSettings
}
