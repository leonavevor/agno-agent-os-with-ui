"""
Audio API for Text-to-Speech and Speech-to-Text using HuggingFace models
"""

import io
import logging
from pathlib import Path
from typing import Optional

import yaml
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/os/audio", tags=["audio"])

# Audio settings file path
AUDIO_CONFIG_DIR = Path(__file__).parent.parent / "config"
AUDIO_SETTINGS_FILE = AUDIO_CONFIG_DIR / "audio_settings.yaml"


class AudioSettings(BaseModel):
    """Audio configuration settings"""

    tts_enabled: bool = True
    tts_model: str = "facebook/mms-tts-eng"  # Default TTS model (working local model)
    tts_voice: str = "af_bella"  # Default voice
    stt_enabled: bool = True
    stt_model: str = (
        "openai/whisper-tiny"  # Default STT model (fast, accurate local model)
    )
    stt_language: str = "en"  # Default language
    auto_play_responses: bool = False
    audio_sample_rate: int = 24000


class TTSRequest(BaseModel):
    """Request for text-to-speech conversion"""

    text: str
    voice: Optional[str] = None
    speed: Optional[float] = 1.0


class AudioManager:
    """Manager for audio operations"""

    def __init__(self, config_dir: Path | str = AUDIO_CONFIG_DIR):
        self.config_dir = (
            Path(config_dir) if isinstance(config_dir, str) else config_dir
        )
        self.settings_file = self.config_dir / "audio_settings.yaml"
        self._ensure_config_exists()
        self._tts_model = None
        self._stt_model = None

    def _ensure_config_exists(self):
        """Ensure audio settings file exists"""
        self.config_dir.mkdir(parents=True, exist_ok=True)
        if not self.settings_file.exists():
            default_settings = {
                "tts_enabled": True,
                "tts_model": "hexgrad/Kokoro-82M",
                "tts_voice": "af_bella",
                "stt_enabled": True,
                "stt_model": "usefulsensors/moonshine-base",
                "stt_language": "en",
                "auto_play_responses": False,
                "audio_sample_rate": 24000,
            }
            with open(self.settings_file, "w", encoding="utf-8") as f:
                yaml.dump(default_settings, f, default_flow_style=False)

    def _load_settings(self) -> dict:
        """Load audio settings from file"""
        with open(self.settings_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def _save_settings(self, settings: dict):
        """Save audio settings to file"""
        with open(self.settings_file, "w", encoding="utf-8") as f:
            yaml.dump(settings, f, default_flow_style=False)

    def get_settings(self) -> AudioSettings:
        """Get current audio settings"""
        settings = self._load_settings()
        return AudioSettings(**settings)

    def update_settings(self, new_settings: AudioSettings) -> AudioSettings:
        """Update audio settings"""
        settings_dict = new_settings.model_dump()
        self._save_settings(settings_dict)
        # Clear cached models if model changed
        if self._tts_model is not None:
            self._tts_model = None
        if self._stt_model is not None:
            self._stt_model = None
        return new_settings

    def _get_tts_model(self):
        """Load TTS model (lazy loading)"""
        if self._tts_model is None:
            settings = self.get_settings()

            # Try HuggingFace local TTS models first
            try:
                import torch
                from transformers import VitsModel, AutoTokenizer
                import numpy as np

                device = "cuda" if torch.cuda.is_available() else "cpu"

                # Map of TTS models - use standard models that work with transformers
                tts_model_map = {
                    "hexgrad/Kokoro-82M": "facebook/mms-tts-eng",  # Fallback to working model
                    "kokoro": "facebook/mms-tts-eng",
                }

                model_name = tts_model_map.get(settings.tts_model, settings.tts_model)
                logger.info(f"Loading TTS model {model_name} on {device}...")

                # Load model and tokenizer
                model = VitsModel.from_pretrained(model_name)
                tokenizer = AutoTokenizer.from_pretrained(model_name)
                model = model.to(device)

                self._tts_model = {
                    "type": "vits",
                    "model": model,
                    "tokenizer": tokenizer,
                    "device": device,
                    "model_name": model_name,
                    "voice": settings.tts_voice,
                }
                logger.info(f"Loaded HuggingFace TTS model {model_name} successfully")
                return self._tts_model

            except Exception as e:
                logger.warning(f"Failed to load HuggingFace TTS: {e}, trying OpenAI...")

            # Try OpenAI if API key is available
            import os

            openai_key = os.getenv("OPENAI_API_KEY")

            if openai_key:
                try:
                    from openai import OpenAI

                    client = OpenAI(api_key=openai_key)
                    self._tts_model = {
                        "type": "openai",
                        "client": client,
                        "model": "tts-1",
                        "voice": settings.tts_voice,
                    }
                    logger.info("Loaded OpenAI TTS model successfully")
                    return self._tts_model
                except Exception as e:
                    logger.warning(f"Failed to load OpenAI TTS: {e}")

            # If all else fails, raise error
            logger.error("No TTS model could be loaded")
            raise HTTPException(
                status_code=500,
                detail="No TTS library available. Please install transformers and torch.",
            )
        return self._tts_model

    def _get_stt_model(self):
        """Load STT model (lazy loading)"""
        if self._stt_model is None:
            try:
                import torch
                from transformers import pipeline

                settings = self.get_settings()

                # Map unsupported models to working alternatives
                stt_model_map = {
                    "usefulsensors/moonshine-base": "openai/whisper-tiny",  # Fast, small model
                    "usefulsensors/moonshine-tiny": "openai/whisper-tiny",
                    "moonshine": "openai/whisper-tiny",
                }

                model_name = stt_model_map.get(settings.stt_model, settings.stt_model)
                logger.info(f"Loading STT model {model_name}...")

                device = "cuda" if torch.cuda.is_available() else "cpu"
                self._stt_model = pipeline(
                    "automatic-speech-recognition",
                    model=model_name,
                    device=device,
                )
                logger.info(f"Loaded STT model {model_name} successfully")
            except ImportError:
                logger.error(
                    "Transformers library not installed. Install with: pip install transformers torch"
                )
                raise HTTPException(
                    status_code=500,
                    detail="STT library not installed. Please install transformers and torch packages.",
                )
            except Exception as e:
                logger.error(f"Error loading STT model: {e}")
                raise HTTPException(
                    status_code=500, detail=f"Failed to load STT model: {str(e)}"
                )
        return self._stt_model

    def text_to_speech(
        self, text: str, voice: Optional[str] = None, speed: float = 1.0
    ) -> bytes:
        """Convert text to speech"""
        settings = self.get_settings()

        if not settings.tts_enabled:
            raise HTTPException(status_code=400, detail="TTS is disabled")

        # Use provided voice or fall back to settings default
        selected_voice = voice or settings.tts_voice
        logger.info(f"TTS request - Voice: {selected_voice}, Speed: {speed}")

        try:
            tts = self._get_tts_model()

            if tts["type"] == "vits":
                # Use VITS model (facebook/mms-tts-eng or similar)
                import torch
                import soundfile as sf
                import io
                import numpy as np

                model = tts["model"]
                tokenizer = tts["tokenizer"]
                device = tts["device"]

                # Note: facebook/mms-tts-eng is a single-voice model
                # Voice parameter is logged but not used by this model
                logger.info(
                    f"Using VITS model: {tts.get('model_name', 'unknown')} (single-voice)"
                )

                # Tokenize text
                inputs = tokenizer(text, return_tensors="pt")
                inputs = {k: v.to(device) for k, v in inputs.items()}

                # Generate speech
                with torch.no_grad():
                    output = model(**inputs).waveform

                # Convert to numpy array
                audio_array = output.squeeze().cpu().numpy()

                # Convert to WAV format
                buffer = io.BytesIO()
                sample_rate = model.config.sampling_rate

                # Ensure audio is float32
                if audio_array.dtype != np.float32:
                    audio_array = audio_array.astype(np.float32)

                sf.write(buffer, audio_array, sample_rate, format="WAV")
                buffer.seek(0)

                return buffer.read()

            elif tts["type"] == "huggingface":
                # Use HuggingFace TTS pipeline
                pipeline = tts["pipeline"]

                # Generate speech
                speech = pipeline(text)

                # Extract audio data
                if hasattr(speech, "audio"):
                    audio_array = speech.audio
                elif isinstance(speech, dict) and "audio" in speech:
                    audio_array = speech["audio"]
                else:
                    audio_array = speech

                # Convert to WAV format
                import soundfile as sf
                import io

                buffer = io.BytesIO()
                sample_rate = (
                    speech.sampling_rate
                    if hasattr(speech, "sampling_rate")
                    else settings.audio_sample_rate
                )

                sf.write(buffer, audio_array, sample_rate, format="WAV")
                buffer.seek(0)

                return buffer.read()

            elif tts["type"] == "openai":
                # Use OpenAI TTS
                client = tts["client"]

                # Map voice names to OpenAI voices
                voice_map = {
                    "af_bella": "alloy",
                    "af_sarah": "nova",
                    "am_adam": "onyx",
                    "am_michael": "echo",
                    "bf_emma": "shimmer",
                    "bf_isabella": "nova",
                    "bm_george": "onyx",
                    "bm_lewis": "fable",
                }

                openai_voice = voice_map.get(selected_voice, "alloy")
                logger.info(
                    f"Using OpenAI TTS with voice: {openai_voice} (mapped from {selected_voice})"
                )

                response = client.audio.speech.create(
                    model="tts-1", voice=openai_voice, input=text, speed=speed
                )

                return response.content

            elif tts["type"] == "pyttsx3":
                # Use pyttsx3 (offline)
                engine = tts["engine"]
                engine.setProperty("rate", 150 * speed)

                # Save to temporary file
                import tempfile

                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=".wav"
                ) as tmp_file:
                    engine.save_to_file(text, tmp_file.name)
                    engine.runAndWait()

                    # Read the file
                    with open(tmp_file.name, "rb") as f:
                        audio_data = f.read()

                    # Clean up
                    import os

                    os.unlink(tmp_file.name)

                    return audio_data

            else:
                raise HTTPException(status_code=500, detail="Unknown TTS engine type")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"TTS error: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"TTS generation failed: {str(e)}"
            )

    def speech_to_text(self, audio_data: bytes) -> str:
        """Convert speech to text using Whisper STT"""
        settings = self.get_settings()

        if not settings.stt_enabled:
            raise HTTPException(status_code=400, detail="STT is disabled")

        try:
            import numpy as np
            import wave
            import tempfile
            import os

            # Try to read as WAV first (most common format from browser recording)
            try:
                # Save to temp file to use wave module
                with tempfile.NamedTemporaryFile(
                    suffix=".wav", delete=False
                ) as tmp_file:
                    tmp_file.write(audio_data)
                    tmp_path = tmp_file.name

                try:
                    # Read WAV file
                    with wave.open(tmp_path, "rb") as wav_file:
                        # Get audio parameters
                        n_channels = wav_file.getnchannels()
                        sample_width = wav_file.getsampwidth()
                        framerate = wav_file.getframerate()
                        n_frames = wav_file.getnframes()

                        # Read audio data
                        audio_bytes = wav_file.readframes(n_frames)

                        # Convert to numpy array
                        if sample_width == 2:  # 16-bit
                            audio_array = np.frombuffer(audio_bytes, dtype=np.int16)
                        elif sample_width == 4:  # 32-bit
                            audio_array = np.frombuffer(audio_bytes, dtype=np.int32)
                        else:
                            audio_array = np.frombuffer(audio_bytes, dtype=np.uint8)

                        # Convert to float32 and normalize
                        audio_array = audio_array.astype(np.float32)
                        if sample_width == 2:
                            audio_array = audio_array / 32768.0
                        elif sample_width == 4:
                            audio_array = audio_array / 2147483648.0

                        # Handle stereo by taking mean
                        if n_channels == 2:
                            audio_array = audio_array.reshape(-1, 2).mean(axis=1)
                finally:
                    # Clean up temp file
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)

            except wave.Error:
                # If not WAV, try other formats (requires ffmpeg, which we don't have)
                raise HTTPException(
                    status_code=400,
                    detail="Audio format not supported. Please use WAV format for recording.",
                )

            # Get STT model
            stt = self._get_stt_model()

            # Transcribe - Whisper pipeline handles resampling automatically
            result = stt(audio_array)
            transcription = result["text"]

            return transcription

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"STT error: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"STT transcription failed: {str(e)}"
            )


# Initialize audio manager
audio_manager = AudioManager()


@router.get("/settings", response_model=AudioSettings)
async def get_audio_settings():
    """Get current audio settings"""
    return audio_manager.get_settings()


@router.put("/settings", response_model=AudioSettings)
async def update_audio_settings(settings: AudioSettings):
    """Update audio settings"""
    return audio_manager.update_settings(settings)


@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech
    Returns audio file as streaming response
    """
    try:
        audio_bytes = audio_manager.text_to_speech(
            text=request.text, voice=request.voice, speed=request.speed or 1.0
        )

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=speech.wav"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    """
    Convert speech to text
    Accepts audio file upload
    """
    try:
        # Read audio data
        audio_data = await audio.read()

        # Transcribe
        transcription = audio_manager.speech_to_text(audio_data)

        return {"text": transcription, "success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"STT endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voices")
async def get_available_voices():
    """Get list of available TTS voices"""
    # Kokoro voices with proper metadata
    voices = [
        {
            "id": "af_bella",
            "name": "Bella",
            "gender": "F",
            "language": "en-US",
            "description": "American Female voice",
        },
        {
            "id": "af_sarah",
            "name": "Sarah",
            "gender": "F",
            "language": "en-US",
            "description": "American Female voice",
        },
        {
            "id": "am_adam",
            "name": "Adam",
            "gender": "M",
            "language": "en-US",
            "description": "American Male voice",
        },
        {
            "id": "am_michael",
            "name": "Michael",
            "gender": "M",
            "language": "en-US",
            "description": "American Male voice",
        },
        {
            "id": "bf_emma",
            "name": "Emma",
            "gender": "F",
            "language": "en-GB",
            "description": "British Female voice",
        },
        {
            "id": "bf_isabella",
            "name": "Isabella",
            "gender": "F",
            "language": "en-GB",
            "description": "British Female voice",
        },
        {
            "id": "bm_george",
            "name": "George",
            "gender": "M",
            "language": "en-GB",
            "description": "British Male voice",
        },
        {
            "id": "bm_lewis",
            "name": "Lewis",
            "gender": "M",
            "language": "en-GB",
            "description": "British Male voice",
        },
    ]
    return {"voices": voices}


@router.get("/models")
async def get_available_models():
    """Get list of available audio models"""
    return {
        "models": [
            {
                "id": "hexgrad/Kokoro-82M",
                "name": "Kokoro 82M",
                "type": "tts",
                "description": "Fast and high-quality local TTS model",
            },
            {
                "id": "usefulsensors/moonshine-base",
                "name": "Moonshine Base",
                "type": "stt",
                "description": "Fast and accurate local STT model",
            },
            {
                "id": "usefulsensors/moonshine-tiny",
                "name": "Moonshine Tiny",
                "type": "stt",
                "description": "Lightweight local STT model",
            },
        ]
    }
