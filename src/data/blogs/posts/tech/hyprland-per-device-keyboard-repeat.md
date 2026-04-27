---
title: "The Tale of Two Keyboards: Taming Per-Device Repeat Rates in Hyprland"
description: "Configure different key repeat rates for external vs laptop keyboards in Hyprland. Use `hyprctl` scripts to handle per-device input settings."
date: "2026-01-24"
topic: "tech"
slug: "hyprland-per-device-keyboard-repeat"
---

# The Tale of Two Keyboards: Taming Per-Device Repeat Rates in Hyprland

**There’s a quiet kind of frustration that builds when the tools meant to empower you start to rebel.** Imagine this: you have your trusty mechanical keyboard, its satisfying click-clack the rhythm of your work. Beside it, a sleek, silent laptop keyboard sits waiting. In Hyprland, you've crafted a window manager that flows like water. But when you switch between these two keyboards, something feels… off. On one, keys repeat at a brisk, comfortable pace. On the other, they feel sluggish, or perhaps they fire too fast, turning a gentle hold into a frantic, uncontrollable burst of characters.

This isn't a ghost in the machine. This is the reality of using multiple keyboards with different physical and firmware behaviors under a single, system-wide setting. For weeks, this inconsistency drove me to distraction—until I learned that Hyprland allows us to speak to each device in its own language.

## The Direct Answer: Configuring Key Repeat Per Device in Hyprland
The core solution lies in Hyprland's ability to apply rules to specific input devices using their identifiers. You cannot set `repeat_rate` and `repeat_delay` directly in a device rule block comfortably, but you can create a targeted workaround using `exec` and the `hyprctl` command.

### Step 1: Identify Your Keyboards
Discover the precise name and address of each keyboard.
```bash
hyprctl devices
```
Look for the **Keyboards** section. Note the name like `Corsair CORSAIR K70...` or `AT Translated Set 2 keyboard`.

### Step 2: Create a Configuration Script
Create a shell script, e.g., `~/.config/hypr/set-keyboards.sh`.

```bash
#!/bin/bash
# Sleep to ensure Hyprland is fully ready
sleep 1

# Apply fast repeat rate to the Corsair mechanical keyboard
hyprctl keyword 'device:corsair-corsair-k70-rgb-mk-2:kb-repeat-rate' 40
hyprctl keyword 'device:corsair-corsair-k70-rgb-mk-2:kb-repeat-delay' 250

# Apply slower repeat rate to the built-in laptop keyboard
hyprctl keyword 'device:at-translated-set-2-keyboard:kb-repeat-rate' 30
hyprctl keyword 'device:at-translated-set-2-keyboard:kb-repeat-delay' 400
```
**Important:** The device name in the `device:` rule must be lowercased and have spaces replaced with hyphens (e.g., `corsair-corsair...`).

### Step 3: Make Executable and Autostart
```bash
chmod +x ~/.config/hypr/set-keyboards.sh
```
In your `hyprland.conf`:
```bash
exec-once = ~/.config/hypr/set-keyboards.sh
```

### Step 4: The Simpler, Global Fallback
If per-device configuration proves tricky, at least ensure a consistent global rate:
```bash
input {
    kb_rate = 40   # Repeat rate in characters per second
    kb_delay = 250 # Delay before repeat starts, in milliseconds
}
```

## Understanding the Problem: Why Key Repeat Goes Rogue
Key repeat is managed by multiple layers: the physical keyboard's controller, the OS input stack, and the compositor (Hyprland). Some keyboards—especially gaming ones—can report themselves differently or have firmware that interferes with these signals. This can cause one keyboard to ignore the compositor's settings, defaulting to its own built-in rate.

## A Systematic Guide to Diagnosis and Solutions

### Step 1: Map Your Input Landscape
Run `hyprctl devices` and create a mental map of your plugged-in devices.

### Step 2: Test and Refine Your Rates
Before scripting, testing global settings to find your "sweet spot" values.
```bash
input {
    kb_rate = 35
    kb_delay = 300
}
```

### Step 3: Implement the Per-Device Script
Use the script method above. Verify success with:
```bash
hyprctl getoption "device:your-keyboard-name:kb-repeat-rate"
```

### Step 4: Advanced Solution for Keyboards Without Stable IDs
If you frequently plug and unplug a USB keyboard, its ID might change. Bind a key to re-run your script manually:
```bash
bind = $mainMod SHIFT, R, exec, ~/.config/hypr/set-keyboards.sh
```

## Troubleshooting
*   **Script Doesn't Run:** Ensure it's executable (`chmod +x`). Check logs: `journalctl -u hyprland -f`.
*   **Settings Have No Effect:** Double-check the device identifier. Typos are the number one cause.
*   **Keyboard Ignores Settings:** Check if your keyboard has onboard memory (like QMK/VIA or proprietary software) that overrides OS settings.

## Final Reflections: Harmony Across Devices
Taming per-keyboard repeat rates in Hyprland is an exercise in mindful computing. That moment when you switch from your laptop to your mechanical keyboard and the cursor dashes across the screen with exactly the same rhythm you expect is a small but profound victory.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
