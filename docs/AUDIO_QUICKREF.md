# Audio Quick Reference

Quick reference guide for text-to-speech (TTS) and speech-to-text (STT) features.

## Quick Start

### 1. Install Dependencies

```bash
pip install transformers torch soundfile kokoro-onnx
```

### 2. Start Backend

```bash
# Backend will auto-load audio configuration
python -m uvicorn app.main:app --reload
```

### 3. Access Audio Settings

- Open sidebar → Misc → Audio Settings
- Enable TTS/STT
- Select voice and model
- Test audio

## API Endpoints

### Get Settings
```bash
curl http://localhost:8000/audio/settings
```

### Update Settings
```bash
curl -X PUT http://localhost:8000/audio/settings \
  -H "Content-Type: application/json" \
  -d '{"tts_enabled": true, "tts_voice": "af_bella"}'
```

### Text-to-Speech
```bash
curl -X POST http://localhost:8000/audio/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world"}' \
  --output audio.wav
```

### Speech-to-Text
```bash
curl -X POST http://localhost:8000/audio/stt \
  -F "audio_file=@recording.wav"
```

### Get Voices
```bash
curl http://localhost:8000/audio/voices
```

### Get Models
```bash
curl http://localhost:8000/audio/models
```

## Available Voices

| ID         | Name    | Gender | Best For              |
| ---------- | ------- | ------ | --------------------- |
| af_bella   | Bella   | F      | Friendly conversation |
| af_sarah   | Sarah   | F      | Professional content  |
| af_nicole  | Nicole  | F      | Energetic delivery    |
| af_sky     | Sky     | F      | Calm narration        |
| am_adam    | Adam    | M      | Authoritative voice   |
| am_michael | Michael | M      | Casual conversation   |
| bm_george  | George  | M      | Formal British        |
| bm_lewis   | Lewis   | M      | Warm British          |

## Configuration

### Default Settings
```yaml
# app/config/audio_settings.yaml
tts_enabled: true
tts_model: "Kokoro-82M"
tts_voice: "af_bella"
stt_enabled: true
stt_model: "moonshine-base"
stt_language: "en"
auto_play_responses: false
audio_sample_rate: 24000
```

### Sample Rates
- 8000 Hz - Phone quality
- 16000 Hz - Voice recording
- 24000 Hz - High quality (default)
- 48000 Hz - Studio quality

## Frontend Usage

### Import Components
```typescript
import { AudioSettingsModal } from '@/components/AudioSettingsModal'
```

### Use Modal
```tsx
<AudioSettingsModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  agentOSUrl="http://localhost:8000"
  authToken={token}
/>
```

### API Functions
```typescript
import {
  getAudioSettingsAPI,
  updateAudioSettingsAPI,
  textToSpeechAPI,
  speechToTextAPI,
  getVoicesAPI,
  getAudioModelsAPI
} from '@/api/os'

// Get settings
const settings = await getAudioSettingsAPI(endpoint, token)

// Convert text to speech
const audioBlob = await textToSpeechAPI(endpoint, "Hello", "af_bella", token)

// Convert speech to text
const result = await speechToTextAPI(endpoint, audioFile, token)
```

## Testing

### Run Tests
```bash
# All audio tests
pytest tests/test_audio.py -v

# Specific test
pytest tests/test_audio.py::TestTextToSpeech::test_tts_basic -v

# With coverage
pytest tests/test_audio.py --cov=app.api.audio --cov-report=html
```

### Test Example
```python
def test_tts_basic():
    response = client.post("/audio/tts", json={"text": "Hello"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
```

## Common Tasks

### Change Voice
```typescript
await updateAudioSettingsAPI(endpoint, {
  tts_voice: "am_adam"
}, token)
```

### Enable Auto-play
```typescript
await updateAudioSettingsAPI(endpoint, {
  auto_play_responses: true
}, token)
```

### Record Audio
```typescript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const recorder = new MediaRecorder(stream)
recorder.ondataavailable = async (e) => {
  const file = new File([e.data], 'audio.webm', { type: 'audio/webm' })
  const result = await speechToTextAPI(endpoint, file, token)
  console.log('Transcription:', result.text)
}
recorder.start()
```

### Play Audio
```typescript
const audioBlob = await textToSpeechAPI(endpoint, "Hello", voice, token)
if (audioBlob) {
  const url = URL.createObjectURL(audioBlob)
  const audio = new Audio(url)
  audio.play()
}
```

## Troubleshooting

### Issue: Models not loading
```bash
# Install dependencies
pip install transformers torch soundfile kokoro-onnx

# Check installation
python -c "import kokoro_onnx"
python -c "import transformers"
```

### Issue: Microphone access denied
- Use HTTPS or localhost
- Check browser permissions
- Try different browser

### Issue: Poor audio quality
```yaml
# Increase sample rate
audio_sample_rate: 48000
```

### Issue: Slow performance
- Models load on first use (slower)
- Subsequent requests are fast
- Consider model caching

## Docker Integration

### Dockerfile
```dockerfile
# Install audio dependencies
RUN pip install transformers torch soundfile kokoro-onnx

# Download models (optional, for faster startup)
RUN python -c "from transformers import AutoModelForSpeechSeq2Seq; \
    AutoModelForSpeechSeq2Seq.from_pretrained('usefulsensors/moonshine-base')"
```

### docker-compose.yaml
```yaml
services:
  backend:
    volumes:
      - ./app/config/audio_settings.yaml:/app/app/config/audio_settings.yaml
    environment:
      - TRANSFORMERS_CACHE=/app/.cache
```

## Performance Tips

1. **Lazy loading**: Models load on first use
2. **Cache responses**: Save frequently used audio
3. **Adjust sample rate**: Lower = faster, smaller files
4. **Use streaming**: For long text conversions
5. **Monitor memory**: Each model uses ~500MB RAM

## Error Codes

| Code | Meaning            | Solution               |
| ---- | ------------------ | ---------------------- |
| 400  | Empty text         | Provide non-empty text |
| 422  | Invalid data       | Check request format   |
| 500  | Model error        | Check dependencies     |
| 404  | Endpoint not found | Verify URL             |

## TypeScript Types

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

interface TTSRequest {
  text: string
  voice?: string
}

interface STTResponse {
  text: string
  language: string
}
```

## Resources

- [Full Documentation](./AUDIO_MANAGEMENT.md)
- [API Reference](./AUDIO_MANAGEMENT.md#api-reference)
- [Kokoro TTS](https://huggingface.co/hexgrad/Kokoro-82M)
- [Moonshine STT](https://huggingface.co/usefulsensors/moonshine-base)
