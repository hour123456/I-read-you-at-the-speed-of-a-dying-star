import os
import wave
import numpy as np
from scipy import signal

SR = 32000  # 32kHz 16-bit stereo: crisp full-spectrum audio with fast web loading
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "assets", "bgm")
os.makedirs(OUT_DIR, exist_ok=True)

NOTE_MAP = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
}

def note_freq(note_str: str) -> float:
    if not note_str or note_str == 'R':
        return 0.0
    name = note_str[:-1]
    octave = int(note_str[-1])
    midi = (octave + 1) * 12 + NOTE_MAP[name]
    return 440.0 * (2.0 ** ((midi - 69) / 12.0))

def make_concert_hall_ir(duration=2.8, decay=2.4, seed=42):
    rng = np.random.default_rng(seed)
    n = int(SR * duration)
    t = np.linspace(0, duration, n, endpoint=False)
    env = np.exp(-t * (3.5 / decay))
    # Early reflections + diffuse tail
    ir_l = rng.normal(0, 1, n) * env
    ir_r = rng.normal(0, 1, n) * env
    for delay_ms, gain in [(19, 0.45), (31, 0.35), (47, 0.28), (67, 0.22), (89, 0.16)]:
        idx = int(SR * delay_ms / 1000.0)
        if idx < n:
            ir_l[idx] += gain
            ir_r[min(n - 1, idx + int(SR * 0.004))] += gain * 0.95
    sos = signal.butter(2, 3800 / (SR / 2), btype='low', output='sos')
    ir_l = signal.sosfilt(sos, ir_l)
    ir_r = signal.sosfilt(sos, ir_r)
    norm = max(np.max(np.abs(ir_l)), np.max(np.abs(ir_r)), 1e-6)
    return ir_l / norm * 0.28, ir_r / norm * 0.28

IR_L, IR_R = make_concert_hall_ir()

def apply_stereo_reverb(left, right, wet=0.38):
    rev_l = signal.fftconvolve(left, IR_L, mode='full')[:len(left)]
    rev_r = signal.fftconvolve(right, IR_R, mode='full')[:len(right)]
    out_l = left * (1.0 - wet * 0.35) + rev_l * wet
    out_r = right * (1.0 - wet * 0.35) + rev_r * wet
    return out_l, out_r

def add_stereo(mix_l, mix_r, start_sec, wave_mono, pan=0.0, amp=1.0):
    idx = int(start_sec * SR)
    if idx >= len(mix_l) or len(wave_mono) == 0:
        return
    end = min(len(mix_l), idx + len(wave_mono))
    seg = wave_mono[:end - idx] * amp
    angle = (pan + 1.0) * (np.pi / 4.0)
    mix_l[idx:end] += seg * np.cos(angle)
    mix_r[idx:end] += seg * np.sin(angle)

def synth_felt_piano(freq, dur, vel=0.8):
    if freq <= 0:
        return np.zeros(int(dur * SR))
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    # Inharmonic piano partials with faster decay on upper harmonics
    out = np.zeros(n)
    partials = [(1.0, 1.00), (2.0005, 0.48), (3.0018, 0.24), (4.004, 0.11), (5.008, 0.05), (6.014, 0.025)]
    for mult, p_amp in partials:
        f = freq * mult
        if f >= SR * 0.45:
            continue
        decay_rate = (1.3 + (f / 550.0)) + mult * 0.45
        env = (1.0 - np.exp(-t * 180.0)) * np.exp(-t * decay_rate)
        out += np.sin(2 * np.pi * f * t) * p_amp * env
    # Subtle hammer felt thump
    hammer_env = np.exp(-t * 95.0)
    sos = signal.butter(2, min(0.45, (freq * 3.5 * (0.6 + 0.5 * vel)) / (SR / 2)), btype='low', output='sos')
    out = signal.sosfilt(sos, out)
    # Soft release tail to avoid click
    rel = min(int(0.06 * SR), n // 3)
    if rel > 0:
        out[-rel:] *= np.linspace(1, 0, rel)
    return out * vel * 0.35

def synth_celesta(freq, dur, vel=0.7):
    if freq <= 0:
        return np.zeros(int(dur * SR))
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    mod_env = np.exp(-t * 14.0) * 1.4
    mod = np.sin(2 * np.pi * (freq * 3.0) * t) * mod_env
    env = (1.0 - np.exp(-t * 260.0)) * np.exp(-t * 3.2)
    out = (np.sin(2 * np.pi * freq * t + mod * 0.45) + 0.25 * np.sin(2 * np.pi * freq * 2.0 * t)) * env
    rel = min(int(0.05 * SR), n // 3)
    if rel > 0:
        out[-rel:] *= np.linspace(1, 0, rel)
    return out * vel * 0.22

def synth_strings(freq, dur, vel=0.7, attack=0.35):
    if freq <= 0:
        return np.zeros(int(dur * SR))
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    vib = np.sin(2 * np.pi * 5.2 * t) * (0.0032 * np.clip(t / 0.5, 0, 1))
    out = np.zeros(n)
    for detune in [-0.0045, -0.0018, 0.0, 0.0021, 0.0049]:
        phase = 2 * np.pi * freq * (1.0 + detune) * (t + vib / (2 * np.pi * 5.2))
        out += signal.sawtooth(phase, width=0.5) * 0.2
    sos = signal.butter(3, min(0.42, (freq * 4.2 + 900) / (SR / 2)), btype='low', output='sos')
    out = signal.sosfilt(sos, out)
    att = min(int(attack * SR), n // 2)
    rel = min(int(0.35 * SR), n // 2)
    env = np.ones(n)
    if att > 0:
        env[:att] = np.sin(np.linspace(0, np.pi / 2, att))
    if rel > 0:
        env[-rel:] = np.cos(np.linspace(0, np.pi / 2, rel))
    return out * env * vel * 0.22

def synth_solo_violin(freq, dur, vel=0.8):
    if freq <= 0:
        return np.zeros(int(dur * SR))
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    vib = np.sin(2 * np.pi * 5.8 * t) * 0.0045 * np.clip(t / 0.25, 0, 1)
    phase = 2 * np.pi * freq * t + vib * freq * 0.12
    raw = signal.sawtooth(phase, width=0.42) + 0.3 * np.sin(phase)
    sos = signal.butter(2, [min(0.4, max(0.02, 260 / (SR / 2))), min(0.45, 3400 / (SR / 2))], btype='band', output='sos')
    out = signal.sosfilt(sos, raw)
    att = min(int(0.09 * SR), n // 3)
    rel = min(int(0.12 * SR), n // 3)
    env = np.ones(n)
    if att > 0: env[:att] = np.linspace(0, 1, att)
    if rel > 0: env[-rel:] = np.linspace(1, 0, rel)
    return out * env * vel * 0.26

def synth_organ(freq, dur, vel=0.7):
    if freq <= 0:
        return np.zeros(int(dur * SR))
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    drawbars = [(0.5, 0.55), (1.0, 1.0), (1.5, 0.35), (2.0, 0.65), (3.0, 0.28), (4.0, 0.35), (6.0, 0.15)]
    out = np.zeros(n)
    for mult, amp in drawbars:
        f = freq * mult
        if f < SR * 0.45:
            out += np.sin(2 * np.pi * f * t) * amp
    att = min(int(0.08 * SR), n // 4)
    rel = min(int(0.18 * SR), n // 4)
    env = np.ones(n)
    if att > 0: env[:att] = np.linspace(0, 1, att)
    if rel > 0: env[-rel:] = np.linspace(1, 0, rel)
    return out * env * vel * 0.14

def synth_bass(freq, dur, vel=0.85, punchy=False):
    if freq <= 0:
        return np.zeros(int(dur * SR))
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    out = np.sin(2 * np.pi * freq * t) + 0.45 * signal.sawtooth(2 * np.pi * freq * t, 0.5)
    cutoff = 650 if punchy else 320
    sos = signal.butter(3, cutoff / (SR / 2), btype='low', output='sos')
    out = signal.sosfilt(sos, out)
    env = (1.0 - np.exp(-t * 140.0)) * np.exp(-t * (3.2 if punchy else 1.4))
    rel = min(int(0.04 * SR), n // 3)
    if rel > 0: env[-rel:] *= np.linspace(1, 0, rel)
    return out * env * vel * 0.34

def synth_kick(vel=0.9):
    dur = 0.28
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    f_sweep = 48.0 + 110.0 * np.exp(-t * 38.0)
    phase = 2 * np.pi * np.cumsum(f_sweep) / SR
    env = np.exp(-t * 13.0)
    return np.sin(phase) * env * vel * 0.52

def synth_hat(vel=0.4, open_hat=False):
    dur = 0.22 if open_hat else 0.065
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    rng = np.random.default_rng(101)
    noise = rng.normal(0, 1, n)
    sos = signal.butter(2, 6500 / (SR / 2), btype='high', output='sos')
    out = signal.sosfilt(sos, noise) * np.exp(-t * (14.0 if open_hat else 55.0))
    return out * vel * 0.22

def synth_clock_tick(high=True):
    dur = 0.045
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    f = 2400.0 if high else 1750.0
    out = np.sin(2 * np.pi * f * t) * np.exp(-t * 140.0)
    return out * 0.14

def save_seamless_loop_wav(filename, left, right, loop_crossfade_sec=2.0):
    cf = int(loop_crossfade_sec * SR)
    if len(left) > cf * 3:
        fade_in = np.linspace(0, 1, cf)
        fade_out = np.linspace(1, 0, cf)
        left[:cf] = left[:cf] * fade_in + left[-cf:] * fade_out
        right[:cf] = right[:cf] * fade_in + right[-cf:] * fade_out
        left = left[:-cf]
        right = right[:-cf]
    peak = max(np.max(np.abs(left)), np.max(np.abs(right)), 1e-6)
    gain = 0.88 / peak
    l16 = np.clip(left * gain * 32767, -32767, 32767).astype(np.int16)
    r16 = np.clip(right * gain * 32767, -32767, 32767).astype(np.int16)
    stereo = np.empty(l16.size * 2, dtype=np.int16)
    stereo[0::2] = l16
    stereo[1::2] = r16
    path = os.path.join(OUT_DIR, filename)
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(stereo.tobytes())
    print(f"Saved {filename} ({len(l16)/SR:.1f}s)")

# 1. Title Theme: 0.0004Hz Lullaby (F#m9 - Dmaj7 - Aadd9 - C#7)
def build_bgm_01_title():
    bpm = 72.0
    beat = 60.0 / bpm
    bars = 16
    total_dur = bars * 4 * beat + 2.5
    L = np.zeros(int(total_dur * SR))
    R = np.zeros(int(total_dur * SR))
    chords = [
        (['F#2', 'C#3', 'F#3', 'A3', 'C#4', 'G#4'], ['A4', 'G#4', 'F#4', 'E4', 'C#5', 'B4', 'A4', 'G#4']),
        (['D2', 'A2', 'D3', 'F#3', 'A3', 'C#4'], ['F#4', 'A4', 'C#5', 'E5', 'C#5', 'B4', 'A4', 'E4']),
        (['A2', 'E3', 'A3', 'B3', 'C#4', 'E4'], ['E4', 'F#4', 'A4', 'B4', 'C#5', 'E5', 'B4', 'A4']),
        (['C#2', 'G#2', 'C#3', 'F3', 'G#3', 'B3'], ['G#4', 'A4', 'B4', 'G#4', 'F4', 'F#4', 'G#4', 'C#5']),
    ]
    for bar in range(bars):
        c_notes, arp_mel = chords[bar % 4]
        t0 = bar * 4 * beat
        # Strings pad (starts fully from bar 4 for dynamic evolution)
        str_vel = 0.35 if bar < 4 else (0.68 if bar < 12 else 0.48)
        for i, cn in enumerate(c_notes[1:5]):
            add_stereo(L, R, t0, synth_strings(note_freq(cn), 4 * beat + 0.3, str_vel), pan=-0.35 + i * 0.24)
        add_stereo(L, R, t0, synth_bass(note_freq(c_notes[0]), 4 * beat, 0.55), pan=0.0)
        # Piano broken arpeggios
        arp_pattern = [c_notes[1], c_notes[2], c_notes[3], c_notes[5], c_notes[4], c_notes[3], c_notes[2], c_notes[4]]
        for step, pn in enumerate(arp_pattern):
            add_stereo(L, R, t0 + step * 0.5 * beat, synth_felt_piano(note_freq(pn), 1.8 * beat, 0.62), pan=-0.18 + (step % 3) * 0.18)
        # Celesta / Piano crystalline melody
        for step, mn in enumerate(arp_mel):
            if bar >= 2 and step % 2 == 0:
                add_stereo(L, R, t0 + step * 0.5 * beat, synth_celesta(note_freq(mn) * 2.0, 1.4 * beat, 0.52), pan=0.25)
            if bar >= 4 and step in (0, 2, 3, 5, 6):
                add_stereo(L, R, t0 + step * 0.5 * beat, synth_felt_piano(note_freq(mn), 1.5 * beat, 0.78), pan=0.12)
        if bar >= 8:
            # Solo cello / viola counter-line
            add_stereo(L, R, t0, synth_solo_violin(note_freq(arp_mel[0]) * 0.5, 2 * beat, 0.55), pan=-0.28)
            add_stereo(L, R, t0 + 2 * beat, synth_solo_violin(note_freq(arp_mel[4]) * 0.5, 2 * beat, 0.58), pan=-0.28)
    L, R = apply_stereo_reverb(L, R, wet=0.46)
    save_seamless_loop_wav("bgm_01_title.wav", L, R)

# 2. Archive Room Zero: Nocturne & Pocketwatch (D minor)
def build_bgm_02_archive():
    bpm = 64.0
    beat = 60.0 / bpm
    bars = 16
    total_dur = bars * 4 * beat + 2.5
    L = np.zeros(int(total_dur * SR))
    R = np.zeros(int(total_dur * SR))
    prog = [
        ('D2', ['A3', 'D4', 'E4', 'F4'], ['A4', 'R', 'F4', 'E4', 'D4', 'R', 'A3', 'D4']),
        ('Bb1', ['F3', 'Bb3', 'D4', 'F4'], ['F4', 'G4', 'A4', 'R', 'D4', 'R', 'C4', 'Bb3']),
        ('G2', ['G3', 'Bb3', 'D4', 'F4'], ['Bb4', 'A4', 'G4', 'F4', 'E4', 'D4', 'R', 'F4']),
        ('A1', ['G3', 'A3', 'C#4', 'E4'], ['E4', 'R', 'F4', 'E4', 'C#4', 'R', 'A3', 'R']),
    ]
    for bar in range(bars):
        bass_n, chord, mel = prog[bar % 4]
        t0 = bar * 4 * beat
        # Subtle pocketwatch tick
        for b in range(4):
            add_stereo(L, R, t0 + b * beat, synth_clock_tick(b % 2 == 0), pan=-0.4 if b % 2 == 0 else 0.4, amp=0.55)
        add_stereo(L, R, t0, synth_bass(note_freq(bass_n), 3.8 * beat, 0.52), pan=0.0)
        for b in [1, 3]:
            for cn in chord:
                add_stereo(L, R, t0 + b * beat, synth_felt_piano(note_freq(cn), 1.4 * beat, 0.45), pan=-0.15)
        for step, mn in enumerate(mel):
            if mn != 'R':
                add_stereo(L, R, t0 + step * 0.5 * beat, synth_felt_piano(note_freq(mn), 1.6 * beat, 0.72), pan=0.18)
                if bar >= 8 and step in (0, 4):
                    add_stereo(L, R, t0 + step * 0.5 * beat, synth_solo_violin(note_freq(mn) * 0.5, 1.9 * beat, 0.50), pan=-0.25)
    L, R = apply_stereo_reverb(L, R, wet=0.42)
    save_seamless_loop_wav("bgm_02_archive.wav", L, R)

# 3. Starfall Across White Night (Mystery & Awe - C minor, 112 BPM)
def build_bgm_03_starfall():
    bpm = 112.0
    beat = 60.0 / bpm
    bars = 16
    total_dur = bars * 4 * beat + 2.5
    L = np.zeros(int(total_dur * SR))
    R = np.zeros(int(total_dur * SR))
    prog = [
        ('C2', ['C4', 'Eb4', 'G4', 'D5'], ['G5', 'Eb5', 'D5', 'C5']),
        ('Ab1', ['Ab3', 'C4', 'Eb4', 'Bb4'], ['Eb5', 'D5', 'C5', 'Bb4']),
        ('F2', ['F3', 'Ab3', 'C4', 'G4'], ['C5', 'D5', 'Eb5', 'G5']),
        ('G1', ['G3', 'B3', 'D4', 'F4'], ['F5', 'Eb5', 'D5', 'B4']),
    ]
    for bar in range(bars):
        bass_n, arp, hi_mel = prog[bar % 4]
        t0 = bar * 4 * beat
        add_stereo(L, R, t0, synth_bass(note_freq(bass_n), 2 * beat, 0.7, punchy=True), pan=0.0)
        add_stereo(L, R, t0 + 2 * beat, synth_bass(note_freq(bass_n), 2 * beat, 0.65, punchy=True), pan=0.0)
        for cn in arp[:3]:
            add_stereo(L, R, t0, synth_strings(note_freq(cn), 4 * beat, 0.55), pan=-0.2)
        # Rapid 16th celesta/piano pulse
        for s in range(16):
            an = arp[s % 4]
            add_stereo(L, R, t0 + s * 0.25 * beat, synth_celesta(note_freq(an), 0.45 * beat, 0.48), pan=-0.3 + (s % 4) * 0.2)
        if bar >= 4:
            for b, mn in enumerate(hi_mel):
                add_stereo(L, R, t0 + b * beat, synth_felt_piano(note_freq(mn), 1.2 * beat, 0.72), pan=0.15)
        if bar >= 8:
            add_stereo(L, R, t0, synth_kick(0.65), pan=0.0)
            add_stereo(L, R, t0 + 2.5 * beat, synth_kick(0.55), pan=0.0)
    L, R = apply_stereo_reverb(L, R, wet=0.40)
    save_seamless_loop_wav("bgm_03_starfall.wav", L, R)

# 4. Attic Rain & Warm Coffee (Intimate Lyrical Theme - Abmaj7 - G7 - Cm9 - Eb7)
def build_bgm_04_warm_rain():
    bpm = 76.0
    beat = 60.0 / bpm
    bars = 16
    total_dur = bars * 4 * beat + 2.5
    L = np.zeros(int(total_dur * SR))
    R = np.zeros(int(total_dur * SR))
    # Soft filtered rain backdrop
    rng = np.random.default_rng(77)
    rain_l = rng.normal(0, 1, len(L))
    rain_r = rng.normal(0, 1, len(R))
    sos = signal.butter(2, [400 / (SR / 2), 3600 / (SR / 2)], btype='band', output='sos')
    L += signal.sosfilt(sos, rain_l) * 0.018
    R += signal.sosfilt(sos, rain_r) * 0.018

    prog = [
        ('Ab2', ['Eb3', 'G3', 'C4', 'Eb4'], ['Eb5', 'D5', 'C5', 'Bb4', 'G4', 'R', 'Bb4', 'C5']),
        ('G2', ['F3', 'B3', 'D4', 'Eb4'], ['B4', 'C5', 'D5', 'R', 'G4', 'R', 'A4', 'B4']),
        ('C2', ['G3', 'Bb3', 'D4', 'Eb4'], ['D5', 'Eb5', 'G5', 'Eb5', 'D5', 'C5', 'Bb4', 'R']),
        ('Eb2', ['G3', 'Bb3', 'Db4', 'F4'], ['Bb4', 'C5', 'Db5', 'C5', 'Bb4', 'G4', 'F4', 'G4']),
    ]
    for bar in range(bars):
        bass_n, chord, mel = prog[bar % 4]
        t0 = bar * 4 * beat
        add_stereo(L, R, t0, synth_bass(note_freq(bass_n), 4 * beat, 0.5), pan=0.0)
        for i, cn in enumerate(chord):
            add_stereo(L, R, t0 + i * 0.12 * beat, synth_felt_piano(note_freq(cn), 3.6 * beat, 0.56), pan=-0.2 + i * 0.12)
            if bar >= 8:
                add_stereo(L, R, t0, synth_strings(note_freq(cn), 4 * beat, 0.36), pan=0.2 - i * 0.1)
        for s, mn in enumerate(mel):
            if mn != 'R':
                add_stereo(L, R, t0 + s * 0.5 * beat, synth_felt_piano(note_freq(mn), 1.4 * beat, 0.72), pan=0.14)
                if s % 2 == 0 and bar >= 4:
                    add_stereo(L, R, t0 + s * 0.5 * beat, synth_celesta(note_freq(mn), 1.1 * beat, 0.35), pan=-0.22)
    L, R = apply_stereo_reverb(L, R, wet=0.42)
    save_seamless_loop_wav("bgm_04_warm_rain.wav", L, R)

# 5. Abyss Market & Noel's Workshop (Cyber-Clockwork Chill Groove - A Dorian 98 BPM)
def build_bgm_05_abyss_noel():
    bpm = 98.0
    beat = 60.0 / bpm
    bars = 16
    total_dur = bars * 4 * beat + 2.5
    L = np.zeros(int(total_dur * SR))
    R = np.zeros(int(total_dur * SR))
    prog = [
        ('A1', ['G3', 'B3', 'C4', 'E4'], ['E5', 'R', 'C5', 'D5', 'E5', 'G5', 'R', 'D5']),
        ('D2', ['F#3', 'A3', 'C4', 'E4'], ['F#5', 'E5', 'R', 'C5', 'A4', 'C5', 'D5', 'R']),
        ('F2', ['A3', 'C4', 'E4', 'G4'], ['G5', 'E5', 'C5', 'R', 'A4', 'C5', 'E5', 'D5']),
        ('E2', ['G#3', 'B3', 'D4', 'G4'], ['B4', 'C5', 'D5', 'E5', 'R', 'G#4', 'B4', 'R']),
    ]
    for bar in range(bars):
        bass_n, chord, mel = prog[bar % 4]
        t0 = bar * 4 * beat
        # Groovy beat
        for b in [0, 1.5, 2.5]:
            add_stereo(L, R, t0 + b * beat, synth_kick(0.75), pan=0.0)
        for s in range(8):
            add_stereo(L, R, t0 + s * 0.5 * beat, synth_hat(0.38, open_hat=(s == 7)), pan=0.22 if s % 2 else -0.22)
        add_stereo(L, R, t0, synth_bass(note_freq(bass_n), 1.5 * beat, 0.78, punchy=True), pan=0.0)
        add_stereo(L, R, t0 + 1.5 * beat, synth_bass(note_freq(bass_n) * 2, 1.0 * beat, 0.62, punchy=True), pan=0.0)
        add_stereo(L, R, t0 + 2.5 * beat, synth_bass(note_freq(bass_n), 1.5 * beat, 0.74, punchy=True), pan=0.0)
        for cn in chord:
            add_stereo(L, R, t0, synth_felt_piano(note_freq(cn), 2.0 * beat, 0.48), pan=-0.2)
            add_stereo(L, R, t0 + 2.5 * beat, synth_felt_piano(note_freq(cn), 1.5 * beat, 0.44), pan=0.2)
        for s, mn in enumerate(mel):
            if mn != 'R':
                add_stereo(L, R, t0 + s * 0.5 * beat, synth_celesta(note_freq(mn), 0.7 * beat, 0.62), pan=0.15)
    L, R = apply_stereo_reverb(L, R, wet=0.30)
    save_seamless_loop_wav("bgm_05_abyss_noel.wav", L, R)

# 6. Blade of Atropos (High-Speed Action Battle Theme - E minor / Phrygian 146 BPM)
def build_bgm_06_atropos_blade():
    bpm = 146.0
    beat = 60.0 / bpm
    bars = 16
    total_dur = bars * 4 * beat + 2.5
    L = np.zeros(int(total_dur * SR))
    R = np.zeros(int(total_dur * SR))
    prog = [
        ('E2', ['E3', 'G3', 'B3'], ['E5', 'F#5', 'G5', 'B5', 'A5', 'G5', 'F#5', 'E5']),
        ('C2', ['C3', 'E3', 'G3'], ['G5', 'F#5', 'E5', 'D5', 'C5', 'D5', 'E5', 'G5']),
        ('D2', ['D3', 'F#3', 'A3'], ['F#5', 'G5', 'A5', 'D6', 'C6', 'B5', 'A5', 'F#5']),
        ('B1', ['B2', 'D#3', 'F#3'], ['B5', 'A5', 'G5', 'F#5', 'D#5', 'E5', 'F#5', 'B5']),
    ]
    for bar in range(bars):
        bass_n, chord, mel = prog[bar % 4]
        t0 = bar * 4 * beat
        # Driving drums & bass ostinato
        for b in range(4):
            add_stereo(L, R, t0 + b * beat, synth_kick(0.88), pan=0.0)
            add_stereo(L, R, t0 + (b + 0.5) * beat, synth_hat(0.55, open_hat=(b == 3)), pan=0.25)
        for s in range(8):
            add_stereo(L, R, t0 + s * 0.5 * beat, synth_bass(note_freq(bass_n), 0.45 * beat, 0.78, punchy=True), pan=0.0)
        for cn in chord:
            add_stereo(L, R, t0, synth_strings(note_freq(cn), 4 * beat, 0.58, attack=0.08), pan=-0.3)
        for s, mn in enumerate(mel):
            add_stereo(L, R, t0 + s * 0.5 * beat, synth_solo_violin(note_freq(mn), 0.55 * beat, 0.78), pan=0.2)
            if s % 2 == 0:
                add_stereo(L, R, t0 + s * 0.5 * beat, synth_felt_piano(note_freq(mn), 0.7 * beat, 0.65), pan=-0.15)
    L, R = apply_stereo_reverb(L, R, wet=0.32)
    save_seamless_loop_wav("bgm_06_atropos_blade.wav", L, R)

# 7. Heart of Laplace (Stratosphere Cathedral Organ & Strings - G# minor 70 BPM)
def build_bgm_07_laplace_cathedral():
    bpm = 70.0
    beat = 60.0 / bpm
    bars = 16
    total_dur = bars * 4 * beat + 2.5
    L = np.zeros(int(total_dur * SR))
    R = np.zeros(int(total_dur * SR))
    prog = [
        ('G#1', ['G#3', 'B3', 'D#4', 'G#4'], ['D#5', 'C#5', 'B4', 'A#4']),
        ('E1', ['G#3', 'B3', 'E4', 'G#4'], ['B4', 'C#5', 'D#5', 'E5']),
        ('C#2', ['G#3', 'C#4', 'E4', 'G#4'], ['E5', 'D#5', 'C#5', 'B4']),
        ('D#1', ['F#3', 'A#3', 'D#4', 'G4'], ['A#4', 'B4', 'C#5', 'D#5']),
    ]
    for bar in range(bars):
        bass_n, chord, mel = prog[bar % 4]
        t0 = bar * 4 * beat
        add_stereo(L, R, t0, synth_organ(note_freq(bass_n) * 2, 4 * beat, 0.62), pan=0.0)
        for i, cn in enumerate(chord):
            add_stereo(L, R, t0, synth_organ(note_freq(cn), 4 * beat, 0.55), pan=-0.35 + i * 0.22)
            if bar >= 4:
                add_stereo(L, R, t0, synth_strings(note_freq(cn), 4 * beat, 0.48), pan=0.35 - i * 0.22)
        # Baroque harpsichord-like celesta/piano arpeggios
        for s in range(8):
            cn = chord[s % 4]
            add_stereo(L, R, t0 + s * 0.5 * beat, synth_celesta(note_freq(cn) * 2, 0.8 * beat, 0.42), pan=-0.25 + (s % 2) * 0.5)
        if bar >= 4:
            for b, mn in enumerate(mel):
                add_stereo(L, R, t0 + b * beat, synth_solo_violin(note_freq(mn), 1.1 * beat, 0.65), pan=0.1)
    L, R = apply_stereo_reverb(L, R, wet=0.52)
    save_seamless_loop_wav("bgm_07_laplace_cathedral.wav", L, R)

# 8. Thawing Dawn / True Ending Reprise (Radiant Major Catharsis - A major / F#m9 -> Dmaj9 -> E -> A)
def build_bgm_08_thawing_dawn():
    bpm = 78.0
    beat = 60.0 / bpm
    bars = 16
    total_dur = bars * 4 * beat + 2.5
    L = np.zeros(int(total_dur * SR))
    R = np.zeros(int(total_dur * SR))
    prog = [
        ('D2', ['A3', 'C#4', 'E4', 'F#4'], ['A4', 'B4', 'C#5', 'E5', 'F#5', 'E5', 'C#5', 'B4']),
        ('E2', ['G#3', 'B3', 'E4', 'G#4'], ['G#5', 'F#5', 'E5', 'B4', 'C#5', 'E5', 'F#5', 'G#5']),
        ('F#2', ['A3', 'C#4', 'E4', 'A4'], ['A5', 'G#5', 'F#5', 'E5', 'C#5', 'E5', 'F#5', 'C#5']),
        ('A1', ['A3', 'B3', 'C#4', 'E4'], ['E5', 'C#5', 'B4', 'A4', 'B4', 'C#5', 'E5', 'A5']),
    ]
    for bar in range(bars):
        bass_n, chord, mel = prog[bar % 4]
        t0 = bar * 4 * beat
        add_stereo(L, R, t0, synth_bass(note_freq(bass_n), 4 * beat, 0.6), pan=0.0)
        for i, cn in enumerate(chord):
            add_stereo(L, R, t0, synth_strings(note_freq(cn), 4 * beat + 0.3, 0.65), pan=-0.4 + i * 0.26)
        for s in range(8):
            cn = chord[s % 4]
            add_stereo(L, R, t0 + s * 0.5 * beat, synth_felt_piano(note_freq(cn), 1.6 * beat, 0.60), pan=-0.2 + (s % 4) * 0.14)
        for s, mn in enumerate(mel):
            add_stereo(L, R, t0 + s * 0.5 * beat, synth_felt_piano(note_freq(mn), 1.7 * beat, 0.82), pan=0.15)
            if s % 2 == 0:
                add_stereo(L, R, t0 + s * 0.5 * beat, synth_celesta(note_freq(mn) * 2, 1.4 * beat, 0.45), pan=-0.25)
    L, R = apply_stereo_reverb(L, R, wet=0.48)
    save_seamless_loop_wav("bgm_08_thawing_dawn.wav", L, R)

if __name__ == "__main__":
    build_bgm_01_title()
    build_bgm_02_archive()
    build_bgm_03_starfall()
    build_bgm_04_warm_rain()
    build_bgm_05_abyss_noel()
    build_bgm_06_atropos_blade()
    build_bgm_07_laplace_cathedral()
    build_bgm_08_thawing_dawn()
    print("All 8 OST tracks rendered successfully!")
