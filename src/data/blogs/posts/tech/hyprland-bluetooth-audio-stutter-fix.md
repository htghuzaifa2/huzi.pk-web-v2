---
title: "Hyprland: Bluetooth Audio Stutters Only When Moving Windows – The PipeWire & CPU Balancing Act"
description: "Fix Bluetooth audio stuttering in Hyprland when moving windows. Adjust PipeWire quantum buffers and CPU governor for lag-free audio."
date: "2026-01-24"
topic: "tech"
slug: "hyprland-bluetooth-audio-stutter-fix"
---

# Hyprland: Bluetooth Audio Stutters Only When Moving Windows – The PipeWire & CPU Balancing Act

**There is a particular kind of modern frustration, so precise it feels like a cruel joke.** You’re in your flow. Music is playing through your Bluetooth headphones, the perfect soundtrack to your code or your writing. Then, you grab a window to move it. And the audio… stutters. Not a general, constant brokenness, but a fault line that cracks open only when you interact with your beautiful, smooth Hyprland desktop. The music skips, the podcast jitters—punished for the sin of wanting a tidy workspace.

For weeks, I treated this as a ghost in the machine. An unsolvable quirk of running a cutting-edge Wayland compositor. I blamed the Bluetooth stack, the kernel, even my headphones. Until I realized the truth: the stutter was a message. It was the sound of a resource war happening inside my computer, and the casualties were my audio samples. The battle was between the CPU trying to render Hyprland’s buttery animations and PipeWire trying to keep a steady stream of audio data fed to a wireless device.

The solution wasn’t just one setting. It was finding a delicate peace treaty between them. Here’s how I did it.

## The Short Answer: Your Quick Peace Treaty
**The Problem:** Bluetooth audio stutters or cracks precisely when moving, resizing, or animating windows in Hyprland, but is fine when the desktop is idle.

**The Root Cause:** A conflict for system resources. Moving windows requires CPU/GPU power. If the CPU is busy or scaling frequencies, or if PipeWire’s audio buffer is too small to weather the interruption, audio packets get dropped, causing stutter.

**The Two-Pronged Solution:** We must 1) Fortify PipeWire’s defenses by increasing its buffer size (quantum), and 2) Empower the CPU to handle the burst load by ensuring it can quickly reach higher performance states.

### Immediate Action Plan:

**1. Increase PipeWire's Buffer:**
Create or edit the file `~/.config/pipewire/pipewire.conf.d/99-fix-bluetooth.conf`:
```ini
context.properties = {
    default.clock.rate          = 48000
    default.clock.quantum       = 1024 # Start here. If it helps but latency feels high, try 768.
    default.clock.min-quantum   = 1024
    default.clock.max-quantum   = 2048
}
```

**2. Apply the same to pipewire-pulse** (for PulseAudio compatibility). Edit `~/.config/pipewire/pipewire-pulse.conf.d/99-fix-bluetooth.conf`:
```ini
pulse.properties = {
    pulse.min.req = 1024/48000 # Matches the quantum from above
    pulse.default.req = 1024/48000
    pulse.max.req = 2048/48000
}
```

**3. Set CPU Governor to Performance:**
Temporarily test if this eliminates the stutter:
```bash
sudo cpupower frequency-set -g performance
```
If it works, make it permanent via your kernel parameters or a systemd service (details below).

**4. Restart PipeWire to apply changes:**
```bash
systemctl --user restart pipewire pipewire-pulse
```

This combination builds a larger buffer for audio and gives the CPU the immediate horsepower to handle graphical work without starving the audio process. Now, let's understand why this works.

## The Diagnosis: Listening to the Battlefield
The first step was proving the link. I opened a terminal and ran `pactl list sinks` to find my Bluetooth device. Then, I played a continuous test tone and started moving a large window around. The stutter was reproducible on demand. This was key—it wasn’t random interference.

I then ran `htop` sorted by CPU usage. Watching closely, I saw a pattern: a brief spike on a CPU core each time I moved a window, accompanied by the stutter. My system’s default powersave governor was keeping clocks low, and the sudden demand for graphics rendering was causing a micro-delay in the audio processing thread.

Simultaneously, I learned about PipeWire’s quantum setting. This is essentially the size of its audio buffer. The formula is simple: **Latency (in ms) = Quantum / Sample Rate * 1000**. At a default quantum of 256 and 48kHz sample rate, the latency is just ~5.3ms. That’s fantastic for responsiveness, but it’s a tiny bucket. If the CPU gets distracted for more than those 5 milliseconds, the bucket runs dry, and audio cracks.

When you move a window in Hyprland, the compositor’s renderer kicks in. On a CPU that’s idling low, it takes a moment to ramp up. That moment is enough to starve a small PipeWire buffer. The Bluetooth stack adds another layer of complexity, as it has its own internal buffers and timing.

## The Deep Dive: Crafting the Solution

### Part 1: Tweaking PipeWire Buffers – Building a Bigger Reservoir
The goal here is not to blindly increase latency, but to provide enough headroom for system hiccups. We adjust the quantum.
*   `default.clock.quantum`: The main buffer size. Increasing this gives PipeWire a bigger reservoir of audio data to draw from if the CPU is temporarily busy.
*   `default.clock.min-quantum / max-quantum`: The range apps can request.

My recommended starting point of **1024 at 48kHz** gives a latency of about 21.3ms. This is still well below the threshold of human perception for lag in casual listening and is a common target for pro audio. For most, this eliminates the stutter. You can tweak between 768 (16ms) and 2048 (42ms) based on your tolerance.

**Critical Step:** You must apply parallel settings to `pipewire-pulse.conf` for applications using the PulseAudio protocol (like most browsers and media players). The `pulse.min.req = 1024/48000` format is how you specify the same quantum in the PulseAudio-compatibility layer.

### Part 2: CPU Frequency Scaling – Unleashing Immediate Power
The other side of the treaty is ensuring the CPU can respond to demand instantly. The default `powersave` or even `schedutil` governors aim for efficiency, which can mean sluggish frequency scaling.
*   **`performance` Governor:** This locks the CPU at its maximum frequency. It is the most effective at eliminating stutter caused by CPU ramp-up time, as the power is always immediately available. The trade-off is increased power consumption and heat.

**Testing:** Use `sudo cpupower frequency-set -g performance`. Move windows. If the stutter vanishes, you’ve confirmed the CPU is a factor.

**Making it Permanent:** If you’re on a desktop or don’t mind the power trade-off, you can set the kernel parameter `cpufreq.default_governor=performance` in your bootloader. For a more balanced approach, tools like `auto-cpufreq` or creating a systemd service that sets performance governor when AC power is plugged in can be excellent compromises.

### Part 3: The Bluetooth-Specific Polish
While the core fix is above, these tweaks can help solidify the connection:
1.  **Ensure RTKit is Running:** Real-time scheduling priority helps PipeWire.
    ```bash
    systemctl --user status rtkit-daemon
    ```
    It should be active. If not, install and enable rtkit.
2.  **Disable Bluetooth Handsfree (HSP/HFP) Profile:** Many headsets try to switch to a low-quality "headset" profile for calls, which can cause instability. Force A2DP (high-quality audio) only.
    ```bash
    # Connect your headset, then run:
    pactl list cards
    # Find your bluez_card.XX_XX_XX_XX_XX_XX
    pactl set-card-profile bluez_card.XX_XX_XX_XX_XX_XX a2dp-sink
    ```
3.  **Check for Wi-Fi Interference:** Both Bluetooth and 2.4GHz Wi-Fi share spectrum. Try switching your Wi-Fi to a 5GHz band if possible.

## The Pakistani Context: Resilience in the Details
For us, solving this isn’t about luxury; it’s about sovereignty over our tools. Our electricity flickers, our internet bandwidth is precious, and our hardware is often pushed to its limits. When a system as elegant as Hyprland develops a flaw that interrupts our focus or our solace in music, fixing it is an act of reclaiming stability. We are experts at making complex systems work in less-than-ideal conditions. Tuning PipeWire buffers and CPU governors is in that same spirit—a meticulous, patient calibration to extract perfect, reliable performance from the machine we have.

It’s about refusing to accept the stutter.

**Final Verification and Mindset**
After applying your changes, the true test is simple: play audio, and dance windows across your screen. The silence should be uninterrupted. Perfection.

If stutter persists, look deeper with `journalctl -f` while reproducing the issue. Look for errors from `pipewire`, `wireplumber`, or `bluetoothd`. Sometimes, a specific kernel driver for your Wi-Fi or Bluetooth chip can be the ultimate culprit.

Remember, computing is a symphony of interdependent parts. Hyprland is the conductor, PipeWire is the strings section, the CPU is the wind instruments, and Bluetooth is a soloist performing from across the hall. Our job as the master technician is to tune the hall, synchronize the clocks, and ensure no one misses a beat. May your audio flow as smoothly as your windows glide.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
