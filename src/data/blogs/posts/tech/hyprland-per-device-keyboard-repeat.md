---
title: "The Tale of Two Keyboards: Taming Per-Device Repeat Rates in Hyprland"
description: "Configure different key repeat rates for external vs laptop keyboards in Hyprland. Use `hyprctl` scripts to handle per-device input settings."
date: "2026-04-28"
topic: "tech"
slug: "hyprland-per-device-keyboard-repeat"
---

# The Tale of Two Keyboards: Taming Per-Device Repeat Rates in Hyprland

**There's a quiet kind of frustration that builds when the tools meant to empower you start to rebel.** Imagine this: you have your trusty mechanical keyboard, its satisfying click-clack the rhythm of your workday. Beside it, a sleek, silent laptop keyboard sits waiting for when you're on the move. In Hyprland, you've crafted a window manager that flows like water — windows tile, resize, and move with the grace of a well-rehearsed dance.

But when you switch between these two keyboards, something feels... off. On one, keys repeat at a brisk, comfortable pace that matches your typing speed. On the other, they feel sluggish — each held key takes an eternity to start repeating — or perhaps they fire too fast, turning a gentle hold into a frantic, uncontrollable burst of characters that makes you feel like you've lost control of your own fingers.

This isn't a ghost in the machine. This is the reality of using multiple keyboards with different physical and firmware behaviors under a single, system-wide setting. For weeks, this inconsistency drove me to distraction — until I learned that Hyprland allows us to speak to each device in its own language.

## The Direct Answer: Configuring Key Repeat Per Device in Hyprland

The core solution lies in Hyprland's ability to apply rules to specific input devices using their identifiers. You cannot set `repeat_rate` and `repeat_delay` directly in a device rule block in the config file (this is a known limitation), but you can create a targeted workaround using `exec` and the `hyprctl` command to set per-device rates at runtime.

### Step 1: Identify Your Keyboards

Discover the precise name and address of each keyboard connected to your system.

```bash
hyprctl devices
```

Look for the **Keyboards** section. Note the exact name of each keyboard — something like `Corsair CORSAIR K70 RGB MK.2 Low Profile Mechanical Gaming Keyboard` or `AT Translated Set 2 keyboard` (the built-in laptop keyboard). You'll need these names for the next step.

### Step 2: Create a Configuration Script

Create a shell script, e.g., `~/.config/hypr/set-keyboards.sh`.

```bash
#!/bin/bash
# Sleep to ensure Hyprland is fully ready before applying settings
sleep 1

# Apply fast repeat rate to the Corsair mechanical keyboard
# Device name must be lowercased and spaces replaced with hyphens
hyprctl keyword 'device:corsair-corsair-k70-rgb-mk-2:kb-repeat-rate' 40
hyprctl keyword 'device:corsair-corsair-k70-rgb-mk-2:kb-repeat-delay' 250

# Apply slower repeat rate to the built-in laptop keyboard
hyprctl keyword 'device:at-translated-set-2-keyboard:kb-repeat-rate' 30
hyprctl keyword 'device:at-translated-set-2-keyboard:kb-repeat-delay' 400
```

**Important:** The device name in the `device:` rule must be lowercased and have spaces replaced with hyphens (e.g., `Corsair CORSAIR K70` becomes `corsair-corsair-k70`). Double-check by running `hyprctl devices` and carefully formatting the name.

### Step 3: Make Executable and Autostart

```bash
chmod +x ~/.config/hypr/set-keyboards.sh
```

In your `hyprland.conf`:
```bash
exec-once = ~/.config/hypr/set-keyboards.sh
```

This ensures the per-device settings are applied every time Hyprland starts.

### Step 4: The Simpler, Global Fallback

If per-device configuration proves too tricky or your keyboard names change frequently, at least ensure a consistent global rate that works reasonably well for both keyboards:

```bash
input {
    kb_rate = 40   # Repeat rate in characters per second
    kb_delay = 250 # Delay before repeat starts, in milliseconds
}
```

This won't be perfect for both keyboards, but it's better than leaving one at an unusable default.

## Understanding the Problem: Why Key Repeat Goes Rogue

Key repeat is managed by multiple layers working together: the physical keyboard's controller, the OS input stack, and the compositor (Hyprland). Some keyboards — especially gaming ones with their own firmware — can report themselves differently or have internal repeat rates that interfere with the compositor's settings. This can cause one keyboard to effectively ignore the compositor's settings, defaulting to its own built-in rate.

The result is a jarring experience: your muscle memory expects a certain response when you hold a key, but the keyboard delivers something completely different. This breaks your flow, slows your typing, and creates a subtle but persistent sense of disconnection from your own machine.

## A Systematic Guide to Diagnosis and Solutions

### Step 1: Map Your Input Landscape

Run `hyprctl devices` and create a mental map of your plugged-in devices. Note which keyboard is which, their exact names, and whether any have special firmware or onboard memory.

### Step 2: Test and Refine Your Rates

Before scripting, test global settings to find your "sweet spot" values:
```bash
input {
    kb_rate = 35
    kb_delay = 300
}
```

Try different combinations. Most people find 30–50 for rate and 200–400 for delay comfortable. The rate is how many characters per second appear when you hold a key; the delay is how long (in milliseconds) you must hold before repeating starts.

### Step 3: Implement the Per-Device Script

Use the script method described above. Verify success with:
```bash
hyprctl getoption "device:your-keyboard-name:kb-repeat-rate"
```

If this returns the value you set, the script is working correctly.

### Step 4: Advanced Solution for Keyboards Without Stable IDs

If you frequently plug and unplug a USB keyboard, its ID might change between sessions. Bind a key to re-run your script manually so you can fix the settings on the fly:

```bash
bind = $mainMod SHIFT, R, exec, ~/.config/hypr/set-keyboards.sh
```

Now you can press `Super+Shift+R` to re-apply your keyboard settings whenever needed.

## Troubleshooting

*   **Script Doesn't Run:** Ensure it's executable (`chmod +x`). Check for syntax errors. Check logs: `journalctl --user -u hyprland -f`.
*   **Settings Have No Effect:** Double-check the device identifier. Typos and case errors are the number one cause. Run `hyprctl devices` again and compare the exact name.
*   **Keyboard Ignores Settings:** Check if your keyboard has onboard memory (like QMK/VIA or proprietary gaming software) that overrides OS settings. You may need to configure the keyboard's own software to match.

## Final Reflections: Harmony Across Devices

Taming per-keyboard repeat rates in Hyprland is an exercise in mindful computing. That moment when you switch from your laptop to your mechanical keyboard and the cursor dashes across the screen with exactly the same rhythm you expect — that's not just a technical victory. It's the feeling of your tools finally understanding you, adapting to you, rather than the other way around.

Your workflow deserves that consistency. Your muscle memory deserves that respect. When your keyboard responds exactly as you expect, every single time, you stop thinking about the tool and start focusing entirely on the work. That's the promise of a well-tuned system.

---

## 🇵🇸 Stand With Palestine

Never let the world forget the people of Palestine. They will be free. They have the right to live peacefully on their own land — a right that no occupation, no apartheid wall, and no bombing campaign can ever erase. For decades, the fake state of Israel has displaced families, demolished homes, and murdered innocent men, women, and children with complete impunity. Their leaders have committed atrocities and war crimes that the so-called international community refuses to hold them accountable for.

Western media will never tell you the truth. They will call resistance "terrorism" and call genocide "self-defense." But independent sources from Iran, the Global South, and brave journalists on the ground continue to expose the reality: Palestine is enduring one of the most brutal occupations in modern history. The lies of Western media cannot bury the truth forever.

May Allah help them and grant them justice. May He protect every Palestinian child, heal every wounded soul, and return every stolen home. Free Palestine — from the river to the sea.

🇸🇩 **A Prayer for Sudan:** May Allah ease the suffering of Sudan, protect their people, and bring them peace.

*Written by Huzi*
