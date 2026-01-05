# Audio Settings UI - Visual Guide

## 🎨 Component Preview

### Header Section
```
╔══════════════════════════════════════════════════════════════╗
║  🔊  Audio Settings                                      ✕   ║
║      Configure text-to-speech and speech-to-text             ║
╠══════════════════════════════════════════════════════════════╣
```

### Tab Navigation
```
┌─────────────────────────────────────────────────────────────┐
│  [🔊 Text-to-Speech]  [🎤 Speech-to-Text]  [⚙️ Advanced]   │
└─────────────────────────────────────────────────────────────┘
```

## Tab 1: Text-to-Speech

```
┌─────────────────────────────────────────────────────────────┐
│ 🔊 Text-to-Speech Configuration             [🟢 Enabled]    │
│ Convert text responses to natural-sounding speech            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────┐        │
│ │ Enable Text-to-Speech                     [ON]  │        │
│ │ Generate audio for AI responses                  │        │
│ └──────────────────────────────────────────────────┘        │
│                                                              │
│ ─────────────────────────────────────────────────────────   │
│                                                              │
│ TTS Model                                                    │
│ ┌──────────────────────────────────────────────────┐        │
│ │ Kokoro-82M                                    ▼  │        │
│ └──────────────────────────────────────────────────┘        │
│                                                              │
│ Voice Selection                                              │
│ ┌──────────────────────────────────────────────────┐        │
│ │ [F] Bella (af_bella)                          ▼  │        │
│ └──────────────────────────────────────────────────┘        │
│ ℹ️ Friendly conversation                                     │
│                                                              │
│ ┌──────────────────────────────────────────────────┐        │
│ │ Auto-play Responses                       [OFF] │        │
│ │ Automatically play audio when AI responds        │        │
│ └──────────────────────────────────────────────────┘        │
│                                                              │
│ ─────────────────────────────────────────────────────────   │
│                                                              │
│ 🧪 Test Text-to-Speech                                       │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Hello! This is a test of text to speech.              │  │
│ │                                                        │  │
│ │                                                        │  │
│ └────────────────────────────────────────────────────────┘  │
│ [▶️ Test Voice]  [⏹️ Stop]                                   │
└─────────────────────────────────────────────────────────────┘
```

## Tab 2: Speech-to-Text

```
┌─────────────────────────────────────────────────────────────┐
│ 🎤 Speech-to-Text Configuration             [🟢 Enabled]    │
│ Convert spoken audio to text input                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────┐        │
│ │ Enable Speech-to-Text                     [ON]  │        │
│ │ Use voice input for messages                     │        │
│ └──────────────────────────────────────────────────┘        │
│                                                              │
│ ─────────────────────────────────────────────────────────   │
│                                                              │
│ STT Model                                                    │
│ ┌──────────────────────────────────────────────────┐        │
│ │ Moonshine Base                                ▼  │        │
│ └──────────────────────────────────────────────────┘        │
│                                                              │
│ Recognition Language                                         │
│ ┌──────────────────────────────────────────────────┐        │
│ │ 🇬🇧 English                                    ▼  │        │
│ └──────────────────────────────────────────────────┘        │
│                                                              │
│ ─────────────────────────────────────────────────────────   │
│                                                              │
│ 🧪 Test Speech-to-Text                                       │
│ [🎤 Start Recording]                                         │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Transcription Result:                                  │  │
│ │ Hello, this is a test recording.                       │  │
│ └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Tab 3: Advanced

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Advanced Audio Settings                                   │
│ Fine-tune audio quality and performance                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Audio Sample Rate (Hz)                                       │
│ ┌──────────────┐  [High]                                    │
│ │   24000      │                                             │
│ └──────────────┘                                             │
│                                                              │
│ [8kHz]  [16kHz]  [24kHz]  [48kHz]                          │
│                                                              │
│ ℹ️ Higher sample rates provide better quality but require   │
│    more bandwidth and storage                                │
│                                                              │
│ ─────────────────────────────────────────────────────────   │
│                                                              │
│ Sample Rate Guidelines                                       │
│                                                              │
│ ┌──────────────────────────────────────────────────┐        │
│ │ 8 kHz - Phone Quality              [Basic]       │        │
│ │ Minimal quality, suitable for low-bandwidth      │        │
│ └──────────────────────────────────────────────────┘        │
│                                                              │
│ ┌──────────────────────────────────────────────────┐        │
│ │ 16 kHz - Voice Recording         [Standard]      │        │
│ │ Good balance of quality and file size            │        │
│ └──────────────────────────────────────────────────┘        │
│                                                              │
│ ┌──────────────────────────────────────────────────┐        │
│ │ 24 kHz - High Quality          [Recommended]     │        │
│ │ Excellent quality for speech synthesis (default) │        │
│ └──────────────────────────────────────────────────┘        │
│                                                              │
│ ┌──────────────────────────────────────────────────┐        │
│ │ 48 kHz - Studio Quality           [Premium]      │        │
│ │ Maximum quality, larger files                    │        │
│ └──────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Footer
```
╠══════════════════════════════════════════════════════════════╣
║ ✓ Both TTS and STT enabled        [Cancel]  [Save Settings] ║
╚══════════════════════════════════════════════════════════════╝
```

## 🎯 Interactive Elements

### Buttons
```
Primary:    [Save Settings]    Blue, solid
Secondary:  [Cancel]          Gray, outline
Action:     [▶️ Test Voice]    Blue, with icon
Danger:     [⏹️ Stop]          Red, with icon
Preset:     [24kHz]           Blue outline (active)
```

### Switches
```
ON:   [●──]  Blue background
OFF:  [──○]  Gray background
```

### Select Dropdowns
```
┌──────────────────────┐
│ Bella (af_bella)  ▼ │  ← Click to expand
└──────────────────────┘
       ↓
┌──────────────────────┐
│ [F] Bella            │ ← Selected
│ [F] Sarah            │
│ [F] Nicole           │
│ [F] Sky              │
│ [M] Adam             │
│ [M] Michael          │
│ [M] George           │
│ [M] Lewis            │
└──────────────────────┘
```

### Badges
```
Status:    [🟢 Enabled]     Green
Status:    [⚫ Disabled]    Gray
Gender:    [F]             Blue
Gender:    [M]             Gray
Quality:   [High]          Blue outline
Quality:   [Premium]       Purple outline
```

## 🎨 Color Palette

### Light Mode
```
Background:     White (#FFFFFF)
Cards:          Gray-50 (#F9FAFB)
Borders:        Gray-200 (#E5E7EB)
Text Primary:   Gray-900 (#111827)
Text Secondary: Gray-600 (#4B5563)
Accent Blue:    Blue-600 (#2563EB)
Accent Purple:  Purple-600 (#9333EA)
```

### Dark Mode
```
Background:     Gray-900 (#111827)
Cards:          Gray-800 (#1F2937)
Borders:        Gray-700 (#374151)
Text Primary:   White (#FFFFFF)
Text Secondary: Gray-400 (#9CA3AF)
Accent Blue:    Blue-600 (#2563EB)
Accent Purple:  Purple-600 (#9333EA)
```

## 📱 Responsive Layout

### Desktop (> 1024px)
```
┌─────────────────────────────────────────────────┐
│                  Full Width                     │
│              Max-width: 5xl                     │
│           3 columns in advanced tab             │
└─────────────────────────────────────────────────┘
```

### Tablet (768px - 1024px)
```
┌────────────────────────────────────┐
│          Adjusted Spacing          │
│           Max-width: 4xl           │
│        2 columns in sections       │
└────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────────────┐
│    Single Column         │
│   Stacked Layout         │
│   Full Width Buttons     │
└──────────────────────────┘
```

## 🎭 States

### Loading
```
┌────────────────────────────────────┐
│          ⟳ Loading...              │
│   Loading audio settings...        │
└────────────────────────────────────┘
```

### Saving
```
Footer: [Cancel]  [Saving...]
        ↑disabled   ↑spinner
```

### Recording (Animated)
```
[● Stop Recording]  ← Pulsing red dot
```

### Playing Audio
```
[▶️ Test Voice]  [⏹️ Stop]  ← Stop appears when playing
 ↑disabled        ↑enabled
```

### Transcribing
```
⟳ Transcribing...  ← Spinner with text
```

## 🔄 Animations

```
Tab Switch:      Smooth fade transition
Modal Open:      Scale + fade in
Modal Close:     Scale + fade out
Recording Dot:   Pulse animation
Loading Spinner: Rotate 360° loop
Hover States:    Subtle scale (1.02x)
Button Press:    Slight scale down (0.98x)
```

## ✨ Special Effects

### Gradient Header
```
Linear gradient: Blue-50 → Purple-50 (light mode)
                Gray-800 → Gray-800 (dark mode)
```

### Backdrop
```
Background: rgba(0, 0, 0, 0.6)
Blur: 8px
```

### Shadows
```
Modal:    shadow-2xl
Cards:    shadow-sm
Buttons:  shadow-md (hover)
```

## 📋 Accessibility Features

- Tab navigation through all interactive elements
- Escape key to close modal
- Enter key to submit/save
- ARIA labels on all controls
- Focus visible outlines
- Screen reader announcements for state changes
- Sufficient color contrast ratios

---

**Note**: This is a text representation. The actual component uses React, Tailwind CSS, and Radix UI for a polished, production-ready interface.
