# Audio Settings Component Architecture

## Component Tree

```
AudioSettingsModal
│
├── Header
│   ├── Icon (Volume2)
│   ├── Title & Description
│   └── Close Button
│
├── Content (Tabbed)
│   │
│   ├── Tab 1: Text-to-Speech
│   │   ├── Enable Toggle Card
│   │   ├── Model Selector
│   │   ├── Voice Selector
│   │   ├── Auto-play Toggle
│   │   └── Test TTS Section
│   │       ├── Text Area
│   │       ├── Test Button
│   │       └── Stop Button (conditional)
│   │
│   ├── Tab 2: Speech-to-Text
│   │   ├── Enable Toggle Card
│   │   ├── Model Selector
│   │   ├── Language Selector
│   │   └── Test STT Section
│   │       ├── Record Button
│   │       ├── Transcription Display
│   │       └── Loading Indicator
│   │
│   └── Tab 3: Advanced
│       ├── Sample Rate Input
│       ├── Preset Buttons (4)
│       └── Quality Guidelines (4 cards)
│
└── Footer
    ├── Status Indicator
    └── Action Buttons
        ├── Cancel
        └── Save
```

## State Flow

```
┌─────────────────────────────────────────┐
│         AudioSettingsModal              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │      Local State                  │ │
│  │  - settings: AudioSettings        │ │
│  │  - voices: Voice[]                │ │
│  │  - audioModels: AudioModel[]      │ │
│  │  - activeTab: 'tts'|'stt'|'adv'  │ │
│  │  - isLoading: boolean             │ │
│  │  - isSaving: boolean              │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │      TTS Testing State            │ │
│  │  - testText: string               │ │
│  │  - isTestingTTS: boolean          │ │
│  │  - audioElement: HTMLAudioElement │ │
│  │  - isPlaying: boolean             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │      STT Testing State            │ │
│  │  - isRecording: boolean           │ │
│  │  - mediaRecorder: MediaRecorder   │ │
│  │  - transcription: string          │ │
│  │  - isTranscribing: boolean        │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
           │                    │
           │ loadData()         │ handleSave()
           ↓                    ↓
    ┌─────────────────────────────────┐
    │         API Client              │
    │     (api/audio.ts)              │
    │                                 │
    │  - getAudioSettingsAPI()        │
    │  - updateAudioSettingsAPI()     │
    │  - getVoicesAPI()               │
    │  - getAudioModelsAPI()          │
    │  - textToSpeechAPI()            │
    │  - speechToTextAPI()            │
    └─────────────────────────────────┘
                    │
                    ↓
          ┌──────────────────┐
          │   Backend API    │
          │  (FastAPI)       │
          │                  │
          │  /audio/*        │
          └──────────────────┘
```

## Data Flow

### On Modal Open
```
1. isOpen = true
2. loadData() triggered
   └─→ Promise.all([
       getAudioSettingsAPI(),
       getVoicesAPI(),
       getAudioModelsAPI()
     ])
3. State updated:
   - settings
   - voices
   - audioModels
4. isLoading = false
5. UI renders with data
```

### On Save
```
1. User clicks "Save Settings"
2. isSaving = true
3. updateAudioSettingsAPI(settings)
4. Success:
   - Update Zustand store
   - Show toast notification
   - Close modal
5. isSaving = false
```

### TTS Testing Flow
```
1. User enters text
2. User clicks "Test Voice"
3. isTestingTTS = true
4. textToSpeechAPI(text, voice)
5. Receive audio Blob
6. Create audio URL
7. Play audio
   - isPlaying = true
8. On audio end:
   - isPlaying = false
   - Cleanup URL
9. isTestingTTS = false
```

### STT Testing Flow
```
1. User clicks "Start Recording"
2. Request microphone permission
3. Create MediaRecorder
4. isRecording = true
5. Record audio chunks
6. User clicks "Stop Recording"
7. isRecording = false
8. isTranscribing = true
9. speechToTextAPI(audioFile)
10. Display transcription
11. isTranscribing = false
```

## Integration Points

### Zustand Store
```typescript
interface StoreState {
  audioSettings: AudioSettings | null
  setAudioSettings: (settings: AudioSettings) => void
}
```

### Used By Components
```
1. Sidebar.tsx
   - Opens/closes modal
   
2. MessageAudioButton.tsx
   - Uses audioSettings.tts_enabled
   - Uses audioSettings.tts_voice
   
3. VoiceInputButton.tsx
   - Uses audioSettings.stt_enabled
   - Uses audioSettings.stt_model
   
4. useAudioSettings.ts
   - Loads settings on app mount
   - Keeps store in sync
```

## UI Component Dependencies

```
Component Imports:
├── @/components/ui/button
├── @/components/ui/input
├── @/components/ui/label
├── @/components/ui/switch
├── @/components/ui/select
├── @/components/ui/card
├── @/components/ui/textarea
├── @/components/ui/tabs       ← New
├── @/components/ui/badge
└── @/components/ui/separator

Icon Imports:
├── lucide-react/Volume2
├── lucide-react/Mic
├── lucide-react/Play
├── lucide-react/Square
├── lucide-react/X
├── lucide-react/Info
├── lucide-react/Settings2
└── lucide-react/TestTube2
```

## Type Definitions

```typescript
// From @/types/os
interface AudioSettings {
  tts_enabled: boolean
  tts_model: string
  tts_voice: string
  stt_enabled: boolean
  stt_model: string
  stt_language: string
  auto_play_responses: boolean
  audio_sample_rate: number
}

interface Voice {
  id: string
  name: string
  gender: string
  description: string
}

interface AudioModel {
  id: string
  name: string
  type: 'tts' | 'stt'
  description: string
}
```

## Event Handlers

```typescript
// Settings Updates
setSettings({ ...settings, [field]: value })

// Save
handleSave(): Promise<void>

// TTS Testing
handleTestTTS(): Promise<void>
handleStopAudio(): void

// STT Testing
startRecording(): Promise<void>
stopRecording(): void

// Tab Navigation
setActiveTab(tab: 'tts' | 'stt' | 'advanced')
```

## Styling Strategy

### Layout
- Fixed modal overlay (z-50)
- Centered modal (max-w-5xl)
- Scrollable content (max-h-90vh)
- Sticky header and footer

### Theme Support
- Light mode: white, gray-50, gray-100
- Dark mode: gray-900, gray-800, gray-700
- Accent: blue-600, purple-600

### Responsive
- Mobile: Single column, stacked
- Tablet: Adjusted spacing
- Desktop: Full layout

### Animation
- Tab transitions (built-in Radix)
- Recording pulse (animate-pulse)
- Loading spinner (animate-spin)
- Smooth hover states

## Error Handling

```typescript
try {
  // API call
} catch (error) {
  console.error('Error details:', error)
  toast.error('User-friendly message')
}
```

## Accessibility

- ✅ Keyboard navigation (Tab, Enter, Esc)
- ✅ ARIA labels on all interactive elements
- ✅ Focus management
- ✅ Screen reader friendly
- ✅ Color contrast compliance
- ✅ Loading states announced

## Performance Optimizations

1. **Lazy Loading**: Load data only when modal opens
2. **Cleanup**: Remove audio elements on unmount
3. **Memoization**: useCallback for event handlers
4. **Batch Updates**: Single setState calls
5. **Parallel Fetches**: Promise.all for initial load

## Testing Strategy

### Unit Tests
- [ ] State updates correctly
- [ ] Event handlers work
- [ ] API calls triggered
- [ ] Error handling works

### Integration Tests
- [ ] Modal opens/closes
- [ ] Settings save successfully
- [ ] TTS testing works
- [ ] STT testing works

### E2E Tests
- [ ] Full user workflow
- [ ] Audio playback
- [ ] Recording functionality
- [ ] Settings persistence

## File Size

- **Component**: ~800 lines
- **API Client**: ~200 lines
- **Types**: Already defined
- **Documentation**: ~300 lines
- **Total**: ~1300 lines of production code
