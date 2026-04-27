---
title: "Ubuntu: Sound Works on Headphones But Not On Built-In Speakers – The Profile Switch Fix"
description: "Fix sound working on headphones but not speakers in Ubuntu. Learn to switch PulseAudio/PipeWire profiles to restore your laptop's audio."
date: "2026-01-24"
topic: "tech"
slug: "ubuntu-sound-speakers-fix"
---

# Ubuntu: Sound Works on Headphones But Not On Built-In Speakers – The Profile Switch Fix

**It’s a strange kind of silence.** You unplug your headphones after a long call or a music session, expecting the sound to fill the room from your laptop’s speakers. But instead, you’re met with nothing. No system chime, no video playback, no error—just a mute button on your world. Yet, the moment you plug the headphones back in, the audio returns perfectly. It’s as if your computer has forgotten it has its own voice, only remembering how to whisper into external ears.

If this is happening on your Ubuntu machine, I’ve been in your silent room. The frustration is personal. After much searching and tinkering, I learned the issue is rarely about broken hardware. It’s almost always about a confused software driver holding onto the wrong audio profile. The bridge between your system and its speakers is built, but the guard—the sound server—is pointing traffic down the wrong road.

Let’s get your laptop’s own voice back.

## The Quick Fix: Force the Correct Sound Profile
Follow these steps in order. The first one solves the problem for most people.

### Step 1: The Graphical Check (The First & Easiest Step)
Often, the sound server automatically switches profiles, but sometimes it gets stuck.
1.  Click on the sound icon in your system tray (top-right corner).
2.  Look for an entry that says "Settings", "Sound Settings", or a similar option to open the full sound control panel.
3.  In the **Output** or **Playback** tab, you will see a list of devices like "Speakers," "Headphones," "Digital Output," etc.
4.  Crucially, look for a dropdown menu or settings cog next to the "Speakers" entry. It might be labeled "Profile" or "Mode."
5.  If you see profiles like "Analog Stereo Duplex", "Analog Stereo Output", or "HiFi", try switching to a different one and test your sound immediately. The correct one is often the most generic "**Analog Stereo Duplex**."

### Step 2: The Terminal Command (The Powerful Fix)
If the graphical method doesn’t show options or work, we use the command line to see everything.

**For Systems Using PulseAudio (the older, default server):**
1.  Open a terminal (`Ctrl+Alt+T`).
2.  List all your sound cards and their available profiles with this command:
    ```bash
    pacmd list-cards
    ```
3.  Look through the output for a card named something like `alsa_card.pci-0000_00_1f.3` (an Intel sound card) or similar. Under it, you’ll see a list of profiles: like `output:analog-stereo`.
4.  Identify the profile that includes `analog-stereo` and `input:analog-stereo` (this is the duplex profile). Note its exact name, e.g., `output:analog-stereo+input:analog-stereo`.
5.  Set this as the active profile (replace the profile name with yours):
    ```bash
    pacmd set-card-profile alsa_card.pci-0000_00_1f.3 output:analog-stereo+input:analog-stereo
    ```

**For Systems Using PipeWire (the modern replacement, common in Ubuntu 22.04+):**
The tool is different. First, list the nodes to find your speaker’s ID:
```bash
pw-cli list-objects | grep -A 10 -B 10 "alsa_output.pci" | grep -E "object.id|media.class|node.name"
```
You can also use the `wpctl` tool, which is simpler:
```bash
wpctl status
```
Look for your built-in audio device (e.g., "Family 17h/19h HD Audio Controller" or similar). Note its ID number.

To set all outputs to route to the speakers, use:
```bash
wpctl set-default <ID>
```
(Replace `<ID>` with the number you found).

### Step 3: The Universal "Kick" (A Simple Reboot for the Sound Server)
Sometimes, the server just needs a fresh start without a full system reboot.
*   **For PulseAudio:**
    ```bash
    pulseaudio -k
    ```
    Wait a moment; it will restart automatically. Test your sound.
*   **For PipeWire:**
    ```bash
    systemctl --user restart pipewire pipewire-pulse
    ```

One of these three steps will almost certainly restore your speaker sound immediately. Now, let's understand why this happens so we can prevent it.

## The Deep Dive: Why Does Ubuntu "Forget" the Speakers?
To fix it for good, imagine your sound hardware as a complex Swiss Army knife. It has a blade (headphone jack), a screwdriver (HDMI audio), scissors (internal speakers), and more. The sound server (PulseAudio/PipeWire) is your hand. It can only hold one tool at a time.

When you plug in headphones, your hand correctly switches to the "blade." But when you unplug them, sometimes your hand gets stuck, fumbling between tools, and doesn’t confidently grab the "scissors" (the speakers). It might even grab the "screwdriver" (a silent digital output) by mistake.

This "stuck state" is usually caused by one of three things:
1.  **A Residual Hardware Signal:** The headphone jack has a physical switch that tells the system something is plugged in. Sometimes, on unplugging, this signal doesn’t reset cleanly, confusing the driver.
2.  **An Incorrect Default Profile:** The system may have decided (wrongly) that another output, like HDMI or a digital port, is a "better" default than your humble analog speakers.
3.  **A Buggy or Confused Driver/Kernel Module:** The low-level software that talks directly to the sound card might need a reload.

## The Proactive Solution: Making the Correct Profile Stick
Stopping at the quick fix is like treating a symptom. Let’s cure the disease by making the correct profile permanent.

### Create a Configuration File to Force the Choice
We can write a small rule that tells PulseAudio/PipeWire exactly what to do when it sees your sound card.

**For PulseAudio:**
1.  Create a configuration file in your home directory:
    ```bash
    nano ~/.config/pulse/default.pa
    ```
2.  Add the following lines, using the card and profile name you found earlier with `pacmd list-cards`:
    ```text
    # Load the correct profile for the built-in audio card on startup
    set-card-profile alsa_card.pci-0000_00_1f.3 output:analog-stereo+input:analog-stereo
    # Set the default sink (output) to the speakers
    set-default-sink alsa_output.pci-0000_00_1f.3.analog-stereo
    ```
3.  Save the file, then restart PulseAudio: `pulseaudio -k`.

**For PipeWire:**
Configuration is more complex but can be done by copying and editing the default profile set. A more straightforward approach is to ensure your user session always starts correctly. Often, the fix in Step 2 above, if it works, will persist. If not, creating a simple script that runs `wpctl set-default` on login can help.

**Final Reflection**
For us, this isn’t just about fixing a computer bug. It’s about connection. A laptop’s speakers are how a student in Lahore hears an online lecture when they can’t find headphones. Fixing it yourself is an act of digital self-reliance. You’re teaching your computer to listen to you again.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
