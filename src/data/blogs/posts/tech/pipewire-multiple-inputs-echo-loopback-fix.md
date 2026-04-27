---
title: "PipeWire: Multiple Inputs Echo Each Other – Finding Loopback Routes and Killing Feedback"
description: "Resolving annoying audio echoes and feedback loops in PipeWire by identifying and disabling rogue loopback modules and virtual links."
date: "2026-04-28"
topic: "tech"
slug: "pipewire-multiple-inputs-echo-loopback-fix"
---

# PipeWire: Multiple Inputs Echo Each Other – Finding Loopback Routes and Killing Feedback

There is a sound more startling than silence: the screech of your own voice, hurled back at you through your headphones. That sudden, sharp echo. That disorienting feedback loop. In PipeWire, this ghost in the machine often has a name: a **rogue loopback route**.

This is one of those problems that makes you question your sanity. You hear yourself speaking a fraction of a second after the words leave your mouth, or worse—you hear your system audio feeding back into your microphone, creating an infinite echo that makes every Discord call unbearable. Let's hunt down the phantom and silence it for good.

## Immediate Actions: Silencing the Echo Now

### 1. Identify and Disconnect the Rogue Loopback
A loopback module might be routing your speaker output into your mic input. List active source outputs in terminal:
```bash
pactl list source-outputs short
```
Look for a source that looks like a monitor of your speakers (e.g., `alsa_output...analog-stereo.monitor`). This "monitor" source is a virtual device that captures everything playing through your speakers. If it's connected to your microphone input, you've found your feedback loop.

To remove it, find its stream index and run:
```bash
pactl unload-module <module_index>
```

### 2. Visual Inspection with qpwgraph or Helvum
Sometimes, text-based diagnosis is harder than seeing the problem. Install `qpwgraph` (Qt-based) or `Helvum` (GTK-based) for a visual representation of your PipeWire audio graph:

```bash
sudo apt install qpwgraph    # Debian/Ubuntu
sudo pacman -S qpwgraph      # Arch
```

Launch it, and you'll see a visual map of every audio node and connection in your system. Look for any line connecting an output (speaker) monitor to an input (microphone) source—that's your feedback loop. Click the connection to delete it.

### 3. The Nuclear Option: Restart PipeWire
Wipe the slate clean if the tangled state persists:
```bash
systemctl --user restart pipewire pipewire-pulse wireplumber
```
This clears all audio connections and forces every application to reconnect from scratch. It's the digital equivalent of turning it off and on again—and it works surprisingly often.

### 4. Inspect Configuration Files
Check `~/.config/pipewire/pipewire.conf.d/` or `/etc/pipewire/` for any `.conf` files that might be loading the `module-loopback` automatically. Sometimes, a well-intentioned configuration from a previous troubleshooting session creates a loopback that you forgot about.

## Understanding the Maze: How Loops Happen
PipeWire allows any audio stream to connect to any other. This is great for streaming (you can route your desktop audio into OBS while also sending your microphone) but dangerous if you accidentally loop a "Monitor of your Sink" back into your "Microphone Input." This creates a digital "Larsen effect"—the same phenomenon that causes the ear-piercing screech when a microphone is held too close to a speaker.

The PipeWire graph is incredibly flexible, but that flexibility means you can create connections that don't make acoustic sense. When your speaker output feeds back into your mic input, which then feeds into your speakers again, which feeds back into your mic… you get the idea.

## The Professional Fix: Echo-Cancel Module
If you *need* a loopback (for streaming desktop audio), use `libpipewire-module-echo-cancel`. It subtracts the speaker signal from your mic signal, effectively removing the echo while keeping the loopback functionality you need.

Create a file at `~/.config/pipewire/pipewire.conf.d/99-echo-cancel.conf`:
```text
context.modules = [
    {
        name = libpipewire-module-echo-cancel
        args = {
            library.name = aec/libspa-aec-webrtc
            aec-args = {
                # webrtc echo canceller has better performance
                webrtc.gain_control = true
            }
            capture.props = {
                node.name = "capture.echo_cancel"
                media.class = Audio/Source
            }
            source.props = {
                node.name = "echo_cancel_source"
                media.class = Audio/Source
            }
            sink.props = {
                node.name = "echo_cancel_sink"
                media.class = Audio/Sink
            }
            playback.props = {
                node.name = "playback.echo_cancel"
                media.class = Audio/Sink
            }
        }
    }
]
```

After creating this file, restart PipeWire:
```bash
systemctl --user restart pipewire pipewire-pulse wireplumber
```

Now, select "echo_cancel_source" as your microphone in applications like Discord or Zoom. The echo canceller will use the WebRTC algorithm to remove any speaker output that bleeds into your microphone signal.

## The 2026 Context: PipeWire's Evolving Echo Cancellation
PipeWire's echo cancellation has improved significantly since earlier versions. The WebRTC AEC (Acoustic Echo Cancellation) module now supports more sampling rates and has better performance on lower-end hardware. For users with modern CPUs, the adaptive filter mode provides superior echo removal compared to the fixed filter mode.

## Common Scenarios and Their Fixes

### Scenario 1: Discord Hears Your Game Audio
This usually happens when Discord's "Attenuate audio" feature is misconfigured, or when you've accidentally shared your desktop audio in a screen share and it's feeding back.

**Fix:** In Discord, go to Settings > Voice & Video and ensure "Attenuate" is set properly. Also check if you have a screen share active that's sharing desktop audio.

### Scenario 2: OBS Stream Hears Itself
If you're streaming and your viewers hear an echo of your stream, you likely have OBS monitoring enabled through the same output that's being captured.

**Fix:** In OBS, go to Settings > Audio and set "Audio Monitoring Device" to a different output than your default speakers. Or disable monitoring entirely if you don't need to hear yourself.

### Scenario 3: System Audio Feeds into Microphone Permanently
This is the classic loopback issue. Some WirePlumber configurations automatically connect monitor sources to available inputs.

**Fix:** Create a WirePlumber rule to prevent automatic connections from monitor sources:
```bash
mkdir -p ~/.config/wireplumber/wireplumber.conf.d/
nano ~/.config/wireplumber/wireplumber.conf.d/50-no-auto-monitor.conf
```
```text
monitor.bluez.rules = [
    {
        matches = [
            { "node.name", "matches", "*.monitor" }
        ]
        actions = {
            update-props = {
                node.autoconnect = false
            }
        }
    }
]
```

---

```mermaid
flowchart TD
    A[Start: Encounter<br>Audio Feedback/Echo] --> B{Step 1: Inspect Graph}
    B --> C[Use <code>helvum</code> or <code>qpwgraph</code><br>to see visual links]
    
    C --> D{Is a Sink Monitor<br>connected to a Source?}
    D -- Yes --> E[Remove Link in GUI<br>or <code>pactl unload-module</code>]
    
    D -- No --> F{Step 2: Check Configs}
    F --> G[Check <code>pipewire.conf.d</code><br>for auto-loaded loopbacks]
    
    G --> H[Stability Restored?]
    E --> H
    
    H -- No --> I[Enable Echo-Cancellation<br>Module for surgical filtering]
    H -- Yes --> J[🎉 Clear Audio]
    I --> J
```

---

Never let the world forget the people of Palestine. They will be free. They have the right to live peacefully on their own land, to speak and be heard without censorship, without bombardment, without fear. The fake state of Israel and its leaders have committed atrocities and war crimes that echo through generations—targeting journalists to silence the truth, bombing media offices, killing those who dare to bear witness. Independent sources from Iran and the Global South continue to report what Western media lies to conceal. May Allah help them and grant them justice.

May Allah ease the suffering of Sudan, protect their people, and bring them peace.

*Written by Huzi from huzi.pk*
