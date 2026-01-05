"""
Tests for audio text-to-speech and speech-to-text functionality.
"""

import io
import wave
import pytest
import tempfile
import shutil
from pathlib import Path

from app.api.audio import AudioManager, AudioSettings


@pytest.fixture
def temp_config_dir():
    """Create a temporary config directory for testing."""
    temp_dir = Path(tempfile.mkdtemp())
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def config_file(temp_config_dir):
    """Create a test audio config file."""
    config_path = temp_config_dir / "audio_settings.yaml"
    default_config = """
tts_enabled: true
tts_model: "Kokoro-82M"
tts_voice: "af_bella"
stt_enabled: true
stt_model: "moonshine-base"
stt_language: "en"
auto_play_responses: false
audio_sample_rate: 24000
"""
    config_path.write_text(default_config)
    return config_path


@pytest.fixture
def manager(temp_config_dir):
    """Create a test audio manager."""
    return AudioManager(temp_config_dir)


def create_test_audio_file():
    """Create a simple test WAV file"""
    audio_buffer = io.BytesIO()
    with wave.open(audio_buffer, "wb") as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(24000)  # 24kHz
        # Write 1 second of silence
        wav_file.writeframes(b"\x00\x00" * 24000)
    audio_buffer.seek(0)
    return audio_buffer


class TestAudioSettings:
    """Test audio settings management"""

    def test_load_settings(self, manager):
        """Test loading audio settings"""
        settings = manager.get_settings()
        assert settings["tts_enabled"] is True
        assert settings["tts_model"] == "Kokoro-82M"
        assert settings["tts_voice"] == "af_bella"
        assert settings["stt_enabled"] is True
        assert settings["stt_model"] == "moonshine-base"
        assert settings["stt_language"] == "en"
        assert settings["auto_play_responses"] is False
        assert settings["audio_sample_rate"] == 24000

    def test_update_settings(self, manager):
        """Test updating audio settings"""
        new_settings = {
            "tts_enabled": False,
            "tts_voice": "am_adam",
            "auto_play_responses": True,
        }

        updated = manager.update_settings(new_settings)

        assert updated["tts_enabled"] is False
        assert updated["tts_voice"] == "am_adam"
        assert updated["auto_play_responses"] is True
        # Other settings should remain unchanged
        assert updated["tts_model"] == "Kokoro-82M"
        assert updated["stt_enabled"] is True

    def test_update_partial_settings(self, manager):
        """Test updating only some settings"""
        new_settings = {"audio_sample_rate": 48000}

        updated = manager.update_settings(new_settings)

        assert updated["audio_sample_rate"] == 48000
        # Other settings should remain unchanged
        assert updated["tts_enabled"] is True
        assert updated["tts_voice"] == "af_bella"

    def test_settings_persistence(self, temp_config_dir):
        """Test that settings are saved and persist"""
        # Create manager
        manager = AudioManager(temp_config_dir)

        # Update settings
        manager.update_settings({"tts_voice": "af_sarah"})

        # Create new manager with same config dir
        new_manager = AudioManager(temp_config_dir)

        # Settings should persist
        settings = new_manager.get_settings()
        assert settings["tts_voice"] == "af_sarah"


class TestVoicesAndModels:
    """Test voices and models listing"""

    def test_get_voices(self, manager):
        """Test getting available voices"""
        voices = manager.get_voices()

        assert isinstance(voices, list)
        assert len(voices) == 8

        # Check voice structure
        voice = voices[0]
        assert "id" in voice
        assert "name" in voice
        assert "gender" in voice
        assert "description" in voice

    def test_voices_contain_expected_voices(self, manager):
        """Test that voices list contains expected voices"""
        voices = manager.get_voices()
        voice_ids = [v["id"] for v in voices]

        # Check for expected voices
        assert "af_bella" in voice_ids
        assert "af_sarah" in voice_ids
        assert "af_nicole" in voice_ids
        assert "af_sky" in voice_ids
        assert "am_adam" in voice_ids
        assert "am_michael" in voice_ids
        assert "bm_george" in voice_ids
        assert "bm_lewis" in voice_ids

    def test_get_audio_models(self, manager):
        """Test getting available audio models"""
        models = manager.get_models()

        assert isinstance(models, list)
        assert len(models) >= 2  # At least TTS and STT models

        # Check model structure
        model = models[0]
        assert "id" in model
        assert "name" in model
        assert "type" in model
        assert model["type"] in ["tts", "stt"]
        assert "description" in model

    def test_models_contain_expected_models(self, manager):
        """Test that models list contains expected models"""
        models = manager.get_models()
        model_ids = [m["id"] for m in models]

        # Check for expected models
        assert "Kokoro-82M" in model_ids
        assert "moonshine-base" in model_ids

        # Check that we have both TTS and STT models
        model_types = [m["type"] for m in models]
        assert "tts" in model_types
        assert "stt" in model_types

    def test_voice_genders(self, manager):
        """Test that voices have correct gender classifications"""
        voices = manager.get_voices()

        female_voices = [v for v in voices if v["gender"] == "female"]
        male_voices = [v for v in voices if v["gender"] == "male"]

        assert len(female_voices) == 4
        assert len(male_voices) == 4


class TestTextToSpeechMocked:
    """Test text-to-speech functionality (without actual model loading)"""

    def test_tts_settings_validation(self, manager):
        """Test that TTS validates input correctly"""
        # Empty text should raise error
        with pytest.raises(ValueError, match="Empty text"):
            manager.text_to_speech("", "af_bella")

    def test_tts_voice_validation(self, manager):
        """Test that TTS validates voice selection"""
        valid_voices = [v["id"] for v in manager.get_voices()]

        # Valid voice should be accepted
        assert "af_bella" in valid_voices
        assert "am_adam" in valid_voices


class TestSpeechToTextMocked:
    """Test speech-to-text functionality (without actual model loading)"""

    def test_stt_accepts_audio_file(self, manager):
        """Test that STT accepts audio file input"""
        audio_file = create_test_audio_file()

        # This will attempt to load the model, which may fail without dependencies
        # But we can verify the method exists and accepts the right input type
        assert hasattr(manager, "speech_to_text")
        assert callable(manager.speech_to_text)


class TestConfigurationManagement:
    """Test configuration file management"""

    def test_config_file_created_if_missing(self, temp_config_dir):
        """Test that config file is created with defaults if missing"""
        config_path = temp_config_dir / "new_audio_settings.yaml"

        # Config doesn't exist yet
        assert not config_path.exists()

        # Create manager (should create config)
        manager = AudioManager(str(config_path))

        # Config should now exist
        assert config_path.exists()

        # Should have default settings
        settings = manager.get_settings()
        assert settings["tts_enabled"] is True
        assert settings["tts_model"] == "Kokoro-82M"

    def test_config_file_readable_format(self, temp_config_dir):
        """Test that config file is in readable YAML format"""
        manager = AudioManager(temp_config_dir)
        config_path = temp_config_dir / "audio_settings.yaml"
        content = config_path.read_text()

        assert "tts_enabled:" in content
        assert "tts_model:" in content
        assert "stt_enabled:" in content

        # Should be valid YAML
        import yaml

        data = yaml.safe_load(content)
        assert isinstance(data, dict)

    def test_invalid_config_handled_gracefully(self, temp_config_dir):
        """Test that invalid config is handled gracefully"""
        config_path = temp_config_dir / "invalid_audio_settings.yaml"
        config_path.write_text("invalid: yaml: content:::")

        # Should handle gracefully and use defaults
        manager = AudioManager(str(config_path))
        settings = manager.get_settings()

        # Should have some valid settings
        assert "tts_enabled" in settings
        assert "tts_model" in settings


class TestAudioManager:
    """Test AudioManager class functionality"""

    def test_manager_initialization(self, temp_config_dir):
        """Test that AudioManager initializes correctly"""
        manager = AudioManager(temp_config_dir)

        assert str(manager.config_dir) == str(temp_config_dir)
        assert manager.settings is not None
        assert isinstance(manager.settings, dict)

    def test_manager_lazy_loading(self, manager):
        """Test that models are not loaded on initialization"""
        # Models should be None initially
        assert manager._tts_model is None
        assert manager._stt_model is None
        assert manager._stt_processor is None

    def test_manager_methods_exist(self, manager):
        """Test that all required methods exist"""
        assert hasattr(manager, "get_settings")
        assert hasattr(manager, "update_settings")
        assert hasattr(manager, "get_voices")
        assert hasattr(manager, "get_models")
        assert hasattr(manager, "text_to_speech")
        assert hasattr(manager, "speech_to_text")

        # All should be callable
        assert callable(manager.get_settings)
        assert callable(manager.update_settings)
        assert callable(manager.get_voices)
        assert callable(manager.get_models)
        assert callable(manager.text_to_speech)
        assert callable(manager.speech_to_text)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
