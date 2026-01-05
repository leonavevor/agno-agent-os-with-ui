# Audio Settings Quick Reference

## 🎯 Quick Access

**Location**: Sidebar → Misc → Audio Settings

## 🎨 New Features

### Tabbed Interface
- **TTS Tab**: Text-to-Speech configuration
- **STT Tab**: Speech-to-Text configuration  
- **Advanced Tab**: Quality and performance settings

### Visual Improvements
- ✨ Gradient header with icon
- 🏷️ Status badges (Enabled/Disabled)
- 📱 Responsive design
- 🌙 Full dark mode support
- 📊 Quality indicators

## ⚙️ Configuration Options

### Text-to-Speech (TTS)
```
✓ Enable/Disable toggle
✓ Model: Kokoro-82M
✓ Voice: 8 options (Bella, Sarah, Nicole, Sky, Adam, Michael, George, Lewis)
✓ Auto-play: Enable/disable automatic playback
✓ Test: Live preview with any text
```

### Speech-to-Text (STT)
```
✓ Enable/Disable toggle
✓ Model: Moonshine Base
✓ Language: 9 languages (EN, ES, FR, DE, IT, PT, ZH, JA, KO)
✓ Test: Record and transcribe live
```

### Advanced
```
✓ Sample Rate: 8kHz - 48kHz
✓ Quick Presets: 8k, 16k, 24k, 48k
✓ Quality Badges: Basic, Standard, High, Studio
```

## 🧪 Testing

### TTS Testing
1. Select voice
2. Enter test text
3. Click "Test Voice"
4. Click "Stop" to stop playback

### STT Testing
1. Select language
2. Click "Start Recording"
3. Speak into microphone
4. Click "Stop Recording"
5. View transcription

## 📂 File Structure

```
agno-ui/src/
├── components/audio/
│   ├── AudioSettingsModal.tsx  ← Main component
│   └── index.ts                ← Export
├── api/
│   └── audio.ts                ← API functions
└── hooks/
    └── useAudioSettings.ts     ← Settings hook
```

## 🔌 API Endpoints

```
GET  /audio/settings     - Get settings
PUT  /audio/settings     - Update settings
POST /audio/tts          - Text-to-speech
POST /audio/stt          - Speech-to-text
GET  /audio/voices       - List voices
GET  /audio/models       - List models
```

## 💡 Sample Rates Guide

| Rate   | Quality  | Use Case                         |
| ------ | -------- | -------------------------------- |
| 8 kHz  | Basic    | Phone quality, minimal bandwidth |
| 16 kHz | Standard | Voice recording, good balance    |
| 24 kHz | High     | TTS default, excellent quality ⭐ |
| 48 kHz | Studio   | Maximum quality, large files     |

## 🎭 Available Voices

| Voice   | Gender | Style                 |
| ------- | ------ | --------------------- |
| Bella   | F      | Friendly conversation |
| Sarah   | F      | Professional content  |
| Nicole  | F      | Energetic delivery    |
| Sky     | F      | Calm narration        |
| Adam    | M      | Authoritative voice   |
| Michael | M      | Casual conversation   |
| George  | M      | Formal British        |
| Lewis   | M      | Warm British          |

## 🚀 Quick Start

1. Open Sidebar → Audio Settings
2. Enable TTS or STT (or both)
3. Select preferred voice/model
4. Test to verify
5. Click Save

## 🔧 Troubleshooting

### Audio Not Playing
- Check browser audio permissions
- Verify volume is not muted
- Test with different voice

### Recording Not Working
- Check microphone permissions
- Verify microphone is connected
- Test with system audio settings

### Settings Not Saving
- Check network connection
- Verify backend is running
- Check browser console for errors

## 🎨 UI Components

- ✅ Tabs for organization
- ✅ Cards for sections
- ✅ Badges for status
- ✅ Switches for toggles
- ✅ Selects for dropdowns
- ✅ Buttons for actions
- ✅ Toast notifications

## 📝 Code Example

```tsx
import { AudioSettingsModal } from '@/components/audio'

<AudioSettingsModal
  isOpen={audioSettingsModalOpen}
  onClose={() => setAudioSettingsModalOpen(false)}
  agentOSUrl={selectedEndpoint}
  authToken={authToken}
/>
```

## 🔄 State Management

Settings automatically sync with:
- Zustand global store
- Backend configuration
- Message audio playback
- Voice input functionality

## ⚡ Performance

- Lazy loading of audio models
- Optimized re-renders
- Proper cleanup of audio elements
- Efficient state updates

## 🎯 Next Steps

After configuring:
1. Use voice button in chat for STT
2. Click speaker icon on messages for TTS
3. Auto-play will work if enabled
4. Settings persist across sessions
