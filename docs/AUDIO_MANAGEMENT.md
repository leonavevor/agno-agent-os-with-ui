# Audio Management - Text-to-Speech and Speech-to-Text

Complete guide for implementing and using audio processing features including text-to-speech (TTS) and speech-to-text (STT) capabilities.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Backend Implementation](#backend-implementation)
- [Frontend Implementation](#frontend-implementation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

The Audio Management system provides:

- **Text-to-Speech (TTS)**: Convert text responses to spoken audio using HuggingFace models
- **Speech-to-Text (STT)**: Convert spoken audio input to text using HuggingFace models
- **Voice Selection**: Multiple voices with different genders and characteristics
- **Model Configuration**: Support for different TTS/STT models
- **Real-time Processing**: Fast, on-demand audio processing with lazy model loading
- **Quality Control**: Configurable sample rates and audio quality settings

### Supported Models

**TTS Models:**
- **Kokoro-82M** (hexgrad/Kokoro-82M) - High-quality, fast text-to-speech
- 8 different voices (4 female, 4 male)

**STT Models:**
- **Moonshine Base** (usefulsensors/moonshine-base) - Fast, accurate speech recognition
- Multi-language support

## Architecture

### Backend Stack

```
app/api/audio.py              # Audio API endpoints
app/config/audio_settings.yaml # Default audio configuration
AudioManager                   # Model management and processing
```

### Frontend Stack

```
agno-ui/src/components/AudioSettingsModal.tsx  # Settings UI
agno-ui/src/api/os.ts                          # Audio API functions
agno-ui/src/types/os.ts                        # TypeScript types
```

### Data Flow

```
┌─────────────┐
│   Frontend  │
│             │
│ AudioSettings│──────┐
│    Modal    │      │
└─────────────┘      │
                     ├──> API Request
┌─────────────┐      │
│  Chat Input │──────┘
│  (Microphone)│
└─────────────┘
       │
       ↓
┌─────────────────────┐
│   FastAPI Backend   │
│                     │
│  AudioManager       │
│  - TTS Engine       │
│  - STT Engine       │
│  - Model Loading    │
└─────────────────────┘
       │
       ↓
┌─────────────────────┐
│  HuggingFace Models │
│  - Kokoro (TTS)     │
│  - Moonshine (STT)  │
└─────────────────────┘
       │
       ↓
┌─────────────────────┐
│   Audio Storage     │
│  (Streaming/Temp)   │
└─────────────────────┘
```

## Backend Implementation

### AudioManager Class

Located in `app/api/audio.py`, the AudioManager handles:

1. **Lazy Model Loading**: Models are loaded only when first needed
2. **Text-to-Speech**: Converts text to WAV audio
3. **Speech-to-Text**: Converts audio files to text
4. **Settings Management**: Loads and saves configuration

```python
class AudioManager:
    def __init__(self, config_path: str):
        self.config_path = config_path
        self.settings = self._load_settings()
        self._tts_model = None
        self._stt_model = None
        self._stt_processor = None

    def text_to_speech(self, text: str, voice: str) -> bytes:
        """Convert text to speech audio"""
        # Implementation...

    def speech_to_text(self, audio_file: BinaryIO) -> dict:
        """Convert speech audio to text"""
        # Implementation...
```

### API Endpoints

#### Get Audio Settings
```http
GET /audio/settings
```

Returns current audio configuration.

#### Update Audio Settings
```http
PUT /audio/settings
Content-Type: application/json

{
  "tts_enabled": true,
  "tts_voice": "af_bella",
  "stt_enabled": true,
  "auto_play_responses": false
}
```

#### Text-to-Speech
```http
POST /audio/tts
Content-Type: application/json

{
  "text": "Hello, world!",
  "voice": "af_bella"
}

Response: audio/wav (binary stream)
```

#### Speech-to-Text
```http
POST /audio/stt
Content-Type: multipart/form-data

audio_file: <audio file>

Response:
{
  "text": "transcribed text",
  "language": "en"
}
```

#### Get Available Voices
```http
GET /audio/voices

Response:
[
  {
    "id": "af_bella",
    "name": "Bella",
    "gender": "female",
    "description": "Warm, friendly female voice"
  },
  ...
]
```

#### Get Available Models
```http
GET /audio/models

Response:
[
  {
    "id": "Kokoro-82M",
    "name": "Kokoro 82M",
    "type": "tts",
    "description": "Fast, high-quality text-to-speech"
  },
  ...
]
```

## Frontend Implementation

### AudioSettingsModal Component

The modal provides a complete UI for:

- Enabling/disabling TTS and STT
- Selecting TTS voices and models
- Configuring STT language
- Testing TTS with live playback
- Testing STT with recording
- Adjusting audio quality settings

```tsx
<AudioSettingsModal
  isOpen={audioSettingsModalOpen}
  onClose={() => setAudioSettingsModalOpen(false)}
  agentOSUrl={agentOSUrl}
  authToken={authToken}
/>
```

### API Functions

```typescript
// Get current settings
const settings = await getAudioSettingsAPI(endpoint, authToken)

// Update settings
const updated = await updateAudioSettingsAPI(endpoint, settings, authToken)

// Convert text to speech
const audioBlob = await textToSpeechAPI(endpoint, "Hello", "af_bella", authToken)

// Convert speech to text
const result = await speechToTextAPI(endpoint, audioFile, authToken)

// Get available voices
const voices = await getVoicesAPI(endpoint, authToken)

// Get available models
const models = await getAudioModelsAPI(endpoint, authToken)
```

### TypeScript Types

```typescript
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

## Configuration

### Default Configuration

Located in `app/config/audio_settings.yaml`:

```yaml
tts_enabled: true
tts_model: "Kokoro-82M"
tts_voice: "af_bella"
stt_enabled: true
stt_model: "moonshine-base"
stt_language: "en"
auto_play_responses: false
audio_sample_rate: 24000
```

### Available Voices

| Voice ID   | Name    | Gender | Description              |
| ---------- | ------- | ------ | ------------------------ |
| af_bella   | Bella   | Female | Warm, friendly           |
| af_sarah   | Sarah   | Female | Professional, clear      |
| af_nicole  | Nicole  | Female | Energetic, expressive    |
| af_sky     | Sky     | Female | Soft, calm               |
| am_adam    | Adam    | Male   | Deep, authoritative      |
| am_michael | Michael | Male   | Friendly, conversational |
| bm_george  | George  | Male   | British, formal          |
| bm_lewis   | Lewis   | Male   | British, warm            |

### Sample Rates

- **8000 Hz**: Telephone quality
- **16000 Hz**: Voice recording quality
- **24000 Hz**: High quality (default)
- **48000 Hz**: Studio quality

## Usage Examples

### Enable TTS for Chat Responses

```python
# Backend: Return audio with response
response_text = "Here is your answer."
if settings["auto_play_responses"]:
    audio_data = audio_manager.text_to_speech(
        response_text, 
        settings["tts_voice"]
    )
    # Include audio in response
```

### Voice Input in Chat

```typescript
// Frontend: Record and transcribe
const startVoiceInput = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const recorder = new MediaRecorder(stream)
  
  recorder.ondataavailable = async (e) => {
    const audioFile = new File([e.data], 'input.webm', { type: 'audio/webm' })
    const result = await speechToTextAPI(endpoint, audioFile, authToken)
    if (result) {
      setChatInput(result.text)
    }
  }
  
  recorder.start()
}
```

### Test TTS with Different Voices

```python
# Try all available voices
for voice in voices:
    audio_data = audio_manager.text_to_speech(
        "Hello, this is a test.",
        voice["id"]
    )
    # Play or save audio
```

## Testing

### Running Tests

```bash
# Run all audio tests
pytest tests/test_audio.py -v

# Run specific test class
pytest tests/test_audio.py::TestTextToSpeech -v

# Run with coverage
pytest tests/test_audio.py --cov=app.api.audio
```

### Test Categories

1. **Settings Tests**: Configuration management
2. **Voices/Models Tests**: Available options
3. **TTS Tests**: Text-to-speech conversion
4. **STT Tests**: Speech-to-text conversion
5. **Integration Tests**: Full workflows
6. **Performance Tests**: Concurrent requests

### Example Test

```python
def test_tts_with_voice():
    """Test text-to-speech with specific voice"""
    request_data = {
        "text": "Hello, world!",
        "voice": "am_adam"
    }
    response = client.post("/audio/tts", json=request_data)
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert len(response.content) > 0
```

## Troubleshooting

### Common Issues

#### 1. Models Not Loading

**Problem**: Audio features fail with model errors

**Solution**:
```bash
# Install required dependencies
pip install transformers torch soundfile kokoro-onnx

# Verify installation
python -c "import kokoro_onnx; print('Kokoro OK')"
python -c "import transformers; print('Transformers OK')"
```

#### 2. Microphone Access Denied

**Problem**: STT recording fails in browser

**Solution**:
- Ensure HTTPS (required for microphone access)
- Check browser permissions
- Use localhost for development

#### 3. Audio Quality Issues

**Problem**: Poor audio quality or artifacts

**Solution**:
```yaml
# Increase sample rate in settings
audio_sample_rate: 48000

# Try different voice
tts_voice: "af_sarah"
```

#### 4. Slow Performance

**Problem**: Audio processing takes too long

**Solution**:
- Models are loaded lazily on first use
- Subsequent requests are much faster
- Consider caching frequently used audio

#### 5. Memory Issues

**Problem**: High memory usage with audio processing

**Solution**:
```python
# Models are singleton instances
# Only one TTS and one STT model loaded at a time
# Adjust batch processing if needed
```

### Debug Mode

Enable detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Audio processing will log:
# - Model loading
# - Audio generation
# - Error details
```

### API Error Responses

```json
{
  "detail": "Empty text provided"
}

{
  "detail": "Kokoro library not installed. Install with: pip install kokoro-onnx"
}

{
  "detail": "Failed to load audio file"
}
```

## Best Practices

1. **Enable lazy loading**: Don't load models until needed
2. **Cache settings**: Load configuration once, reuse
3. **Handle errors gracefully**: Provide fallbacks for audio failures
4. **Test across browsers**: Audio APIs vary by browser
5. **Use appropriate sample rates**: Balance quality and performance
6. **Provide user controls**: Let users disable audio if needed
7. **Stream large audio**: Use streaming responses for long text
8. **Monitor performance**: Track audio generation times

## Next Steps

1. **Add more voices**: Integrate additional voice models
2. **Multi-language support**: Expand STT language coverage
3. **Audio effects**: Add filtering, normalization
4. **Caching**: Cache frequently generated audio
5. **Real-time STT**: Stream audio for live transcription
6. **Voice cloning**: Custom voice training
7. **Emotion detection**: Analyze speech sentiment
8. **Audio analytics**: Track usage patterns

## References

- [Kokoro TTS Documentation](https://huggingface.co/hexgrad/Kokoro-82M)
- [Moonshine STT Documentation](https://huggingface.co/usefulsensors/moonshine-base)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
