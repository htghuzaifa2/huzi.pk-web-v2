---
title: "PipeWire: Multiple Apps Can’t Record from the Same Mic – Building Audio Bridges with Loopback"
description: "Fix \"Device Busy\" errors when multi-streaming on Linux. Use PipeWire's `pw-loopback` to create a virtual shared microphone for OBS, Discord, and Zoom."
date: "2026-01-24"
topic: "tech"
slug: "pipewire-multiple-mic-recording-fix"
---

# PipeWire: Multiple Apps Can’t Record from the Same Mic – Building Audio Bridges with Loopback

**Here’s a quiet frustration many of us have stumbled into in this new era of Linux audio:** you’re ready to record a podcast, host an online meeting while capturing audio, or stream your desktop with commentary. You open your recording app, then your voice chat—and one of them greets you with a stubborn error or eerie silence. “Device Busy,” “Cannot open microphone,” or simply a dead input level meter. The microphone, a single physical device, seems to refuse to speak to more than one application at a time.

This isn’t a bug in your system; it’s a fundamental shift in philosophy. The older PulseAudio server often allowed this kind of shared access by default. Its successor, PipeWire, is built like a secure, modern apartment complex with strict rules. By default, it locks the microphone (an “input device”) to one app at a time for privacy and predictable audio quality. But what if you need to share? What if you want your recording, your voice call, and your music all to have a piece of the same conversation?

The solution is not to break down the door, but to build a clever hallway—a virtual device. Using PipeWire’s own powerful tools, we can create a virtual microphone that any number of apps can connect to, which itself listens to your real microphone. This is the magic of the loopback.

## The Immediate Fix: Create Your Universal Virtual Microphone
Follow these steps to create a shared microphone source in minutes. We'll use the powerful `pw-loopback` command.

### Step 1: Create the Loopback Virtual Microphone
Open a terminal. The core command is this:
```bash
pw-loopback --capture-props='node.target=alsa_input.pci-0000_00_1f.3.analog-stereo' --playback-props='media.class=Audio/Source node.name=virtual-mic' &
```
Let’s break this down:
*   `pw-loopback`: The PipeWire command that creates a bridge between two points.
*   `--capture-props`: Tells it what to listen to. You must replace `alsa_input.pci...` with your actual microphone’s name.
*   `--playback-props`: Tells it what to be. Here, we define it as a new `Audio/Source` (an input) named `virtual-mic`.

### Step 2: Find Your Actual Microphone’s Name
To find the correct name for your physical mic, run:
```bash
pw-record --list-targets
```
Look for the entry that is clearly your built-in microphone or USB mic. Copy its entire “node.name” (e.g., `alsa_input.usb-046d_Logitech_Webcam_C925e-02.analog-stereo`).

Now, re-run the `pw-loopback` command with your correct microphone name.

### Step 3: Point Your Apps to the New Virtual Microphone
Immediately, open your sound settings (click the volume icon in your system tray and go to Audio Settings). In the **Input** tab, you should now see a new device called “virtual-mic.”
1.  Open your first app (e.g., OBS Studio) and set its audio input to “virtual-mic.”
2.  Open your second app (e.g., Discord) and set its audio input to the same “virtual-mic.”
Both apps will now receive audio simultaneously. The physical mic feeds the virtual device, which broadcasts to all connected applications.

### Step 4: Make It Permanent (Crucial!)
The loopback we just created will vanish when you reboot. To make it permanent, we add it to PipeWire’s configuration.

1.  Create a configuration file in the user directory:
    ```bash
    mkdir -p ~/.config/pipewire/pipewire.conf.d/
    nano ~/.config/pipewire/pipewire.conf.d/99-virtual-mic.conf
    ```
2.  Paste the following configuration, again replacing the `node.target` with your actual microphone’s name:
    ```ini
    context.objects = [
        {   factory = adapter
            args = {
                factory.name           = support.null-audio-sink
                node.name              = virtual-mic
                node.description       = "Shared Virtual Microphone"
                media.class            = "Audio/Source"
                audio.position         = [ FL FR ]
                adapter.auto-port-config = {
                    mode = dsp
                }
            }
        }
    ]

    context.modules = [
        {   name = libpipewire-module-loopback
            args = {
                node.description = "Mic to Virtual Loopback"
                capture.props = {
                    node.target = "alsa_input.pci-0000_00_1f.3.analog-stereo"
                }
                playback.props = {
                    node.name = "virtual-mic-loopback-playback"
                }
            }
        }
    ]
    ```
3.  Save the file, and then restart PipeWire for the changes to take effect:
    ```bash
    systemctl --user restart pipewire pipewire-pulse
    ```
Your “Shared Virtual Microphone” will now be created automatically every time you log in.

## The Pakistani Context: The Mehfil of Your Microphone
In our culture, a *mehfil*—a gathering for poetry, music, or conversation—is about shared experience. The voice of one becomes the enjoyment of all. Our digital tools should enable this, not hinder it. Whether it’s a student in Karachi collaborating on a group project, a musician in Lahore laying down a track with a software metronome, or an uncle in Sialkot finally figuring out a video call with his family abroad, the need to share one’s voice is universal.

Fixing this “Device Busy” error is more than technical troubleshooting. It’s about removing a digital barrier to togetherness. It’s ensuring that our technology adapts to the natural, communal way we want to communicate, not the other way around. We are not just routing audio signals; we are opening pathways for connection.

## A Final Note: Embracing the Graph
PipeWire’s true power lies in its flexibility. While commands and config files can set up static links, for dynamic routing, I highly install **Helvum** or **qpwgraph**. These visual tools let you draw connections between apps and devices with your mouse, making complex audio routing as simple as connecting boxes. It’s the ultimate way to see and shape your audio mehfil.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
