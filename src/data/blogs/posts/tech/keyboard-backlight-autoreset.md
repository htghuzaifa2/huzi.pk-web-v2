---
title: "Laptop Keyboard Backlight is Always On After Resume? Fix it with systemd"
description: "Write a small systemd service to automatically reset your keyboard backlight when your Linux laptop wakes from sleep."
date: "2026-01-24"
topic: "tech"
slug: "linux-keyboard-backlight-resume-fix"
---

# The Unyielding Glow: When Your Keyboard Forgets to Sleep

As-salamu alaikum, my friend. There is a particular kind of modern ghost story. It doesn't happen in a haunted haveli but on your own desk. You close your laptop's lid, sending it into a deep slumber. Hours later, you return, lift the lid, and log in. The screen awakens, but something else has beaten it to life: the eerie, silent glow of your keyboard's backlight, already shining brightly in the dim room as if it never slept at all.

This persistent glow is more than a minor bug. It's a memory leak of light. Your laptop's main systems woke up correctly, but the tiny controller governing those LEDs got stuck, forgetting the "off" command it received before sleep. It's like a devoted servant who keeps standing at attention long after the family has retired for the night.

I've watched that ghostly backlight drain my battery and my patience. The frustration isn't in its presence, but in its disobedience. The good news? We can lay this ghost to rest with a simple, elegant solution: a tiny systemd service that acts as a gentle night watchman, ensuring the lights go out every time the house sleeps. Let's begin by restoring order.

## The Immediate Fix: Your systemd Service Script

Here is the complete, ready-to-use solution. Create these two files, and you will solve the problem permanently.

### Step 1: Create the Reset Script

This script does the actual work of turning the backlight off. First, we need to find the correct control path on your system.

Open a terminal and find your keyboard backlight interface:

```bash
# Look for keyboard LED controls
ls /sys/class/leds/

# Common names are:
# - `asus::kbd_backlight` (For ASUS laptops)
# - `smc::kbd_backlight` (For some MacBooks running Linux)
# - `tpacpi::kbd_backlight` (For Lenovo ThinkPads)
# - `input*::capslock` or `input*::scrolllock` (Sometimes used as proxies)
```

Once you identify the correct directory (e.g., `asus::kbd_backlight`), create the control script:

```bash
sudo nano /usr/local/bin/kbd-backlight-reset.sh
```

Paste the following, replacing `asus::kbd_backlight` with your interface name:

```bash
#!/bin/bash
# kbd-backlight-reset.sh - Resets keyboard backlight to off after sleep

# The path to your keyboard backlight's brightness control
KBD_PATH="/sys/class/leds/asus::kbd_backlight/brightness"

# Check if the path exists
if [ -f "$KBD_PATH" ]; then
    # Force the brightness to 0 (off)
    echo 0 | tee "$KBD_PATH" > /dev/null
    logger "Keyboard backlight reset by systemd service"
else
    logger "Keyboard backlight path not found: $KBD_PATH"
fi
```

Make the script executable:

```bash
sudo chmod +x /usr/local/bin/kbd-backlight-reset.sh
```

### Step 2: Create the systemd Service File

This tells systemd when and how to run your script.

Create the service file:

```bash
sudo nano /etc/systemd/system/kbd-backlight-reset.service
```

Paste the following configuration:

```ini
[Unit]
Description=Reset Keyboard Backlight After Sleep
After=suspend.target
After=hibernate.target
After=hybrid-sleep.target
After=sleep.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/kbd-backlight-reset.sh

[Install]
WantedBy=suspend.target
WantedBy=hibernate.target
WantedBy=hybrid-sleep.target
WantedBy=sleep.target
```

### Step 3: Enable and Test the Service

Enable the service to start automatically:

```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable the service
sudo systemctl enable kbd-backlight-reset.service

# Test it immediately (will run the script once)
sudo systemctl start kbd-backlight-reset.service
```

Now, put your laptop to sleep and wake it. The keyboard backlight should remain off. If it doesn't, check the logs:

```bash
# View service logs
sudo journalctl -u kbd-backlight-reset.service

# Check for kernel messages about LEDs
dmesg | grep -i led
```

#### Quick Implementation Checklist

| Step | Command / Action | Purpose |
| :--- | :--- | :--- |
| **1. Find Interface** | `ls /sys/class/leds/` | Identifies your keyboard backlight control path |
| **2. Create Script** | `sudo nano /usr/local/bin/kbd-backlight-reset.sh` | Creates the executable reset logic |
| **3. Create Service** | `sudo nano /etc/systemd/system/kbd-backlight-reset.service` | Defines when systemd should run the script |
| **4. Enable Service** | `sudo systemctl enable kbd-backlight-reset.service` | Makes the service permanent across reboots |
| **5. Test Immediately** | `sudo systemctl start kbd-backlight-reset.service` | Manually triggers the script to verify it works |

## Understanding the Problem: Why the Light Stays On

To appreciate the elegance of this solution, we must understand what's happening beneath the surface.

### The Two Controllers: CPU vs. EC

Your laptop has at least two independent brains:

1.  **The Main CPU:** Runs Linux, handles complex tasks, and manages sleep states (S3 suspend).
2.  **The Embedded Controller (EC):** A tiny, separate microcontroller that manages physical functions: keyboard input, fan speeds, and keyboard LEDs.

During sleep, the main CPU powers down most of its functions, but the EC remains minimally active to listen for the power button. The problem occurs during the resume sequence:

1.  You close the lid or select "Sleep"
2.  Linux tells the EC: "Turn off keyboard backlight"
3.  Linux enters suspend (CPU sleeps)
4.  You wake the laptop (CPU powers up)
5.  Linux resumes, but **forgets to resend** the "lights off" command to the EC
6.  The EC, which never fully slept, is still holding the last hardware state, which might be "lights on"

Our systemd service works because it hooks into the exact moment **after** Linux has fully resumed but before you start interacting with the system. It's a gentle tap on the EC's shoulder, reminding it: "Lights off, please."

## Advanced Configuration and Troubleshooting

### If the Basic Script Doesn't Work: Alternative Control Methods

Some laptops use different control mechanisms. Here are alternative approaches to try in your script:

**Method A: Using ACPI Calls (For Lenovo, Dell)**
```bash
#!/bin/bash
# Try different ACPI methods if sysfs doesn't work
echo -n "0" | sudo tee /proc/acpi/ibm/kbdlight 2>/dev/null  # Lenovo ThinkPads
echo -n "0" | sudo tee /sys/devices/platform/dell-laptop/leds/dell::kbd_backlight/brightness 2>/dev/null  # Dell
```

**Method B: Using Device-Specific Utilities**
```bash
#!/bin/bash
# Some manufacturers provide utilities
sudo asus-kbd-backlight off 2>/dev/null  # ASUS
sudo razer-control -k off 2>/dev/null    # Razer laptops
```

**Method C: Using Input Emulation (Last Resort)**
```bash
#!/bin/bash
# Emulate pressing the backlight toggle FN key
xdotool key XF86KbdBrightnessDown 2>/dev/null
xdotool key XF86KbdBrightnessUp 2>/dev/null
sleep 0.5
xdotool key XF86KbdBrightnessDown 2>/dev/null
```

### Making the Service More Robust

The basic service works, but here's an enhanced version that handles edge cases:

```bash
#!/bin/bash
# Enhanced kbd-backlight-reset.sh

KBD_PATHS=(
    "/sys/class/leds/asus::kbd_backlight/brightness"
    "/sys/class/leds/tpacpi::kbd_backlight/brightness"
    "/sys/class/leds/smc::kbd_backlight/brightness"
    "/sys/class/leds/input*::capslock/brightness"
)

# Function to reset a found path
reset_backlight() {
    local path="$1"
    # Read current value first
    CURRENT=$(cat "$path" 2>/dev/null)
    MAX=$(cat "${path%/*}/max_brightness" 2>/dev/null)
    
    # Only write if necessary (optimization)
    if [ -n "$CURRENT" ] && [ "$CURRENT" -gt 0 ]; then
        echo 0 > "$path" 2>/dev/null
        logger "Reset keyboard backlight via $path (was $CURRENT, max $MAX)"
        return 0
    fi
    return 1
}

# Try all possible paths
for path in "${KBD_PATHS[@]}"; do
    # Expand glob patterns
    for expanded_path in $path; do
        if [ -f "$expanded_path" ]; then
            if reset_backlight "$expanded_path"; then
                exit 0
            fi
        fi
    done
done

# If no standard path worked, try ACPI methods
echo -n "0" > /proc/acpi/ibm/kbdlight 2>/dev/null && exit 0
echo -n "0" > /sys/devices/platform/dell-laptop/leds/dell::kbd_backlight/brightness 2>/dev/null && exit 0

logger "Could not reset keyboard backlight - no control method found"
exit 1
```

## A Deeper Solution: Kernel Module Options

For some hardware, a more fundamental fix exists at the kernel level. You can pass parameters to the kernel module controlling your laptop's special functions.

### Finding the Right Kernel Module

```bash
# Check which module handles your keyboard
lsmod | grep -E "(asus|dell|thinkpad|acer)"

# Common modules:
# - asus_nb_wmi      (ASUS)
# - dell_laptop      (Dell)
# - thinkpad_acpi    (Lenovo ThinkPad)
# - acer_wmi         (Acer)
```

### Adding Module Parameters

Create a file in `/etc/modprobe.d/` to pass parameters to the module:

```bash
sudo nano /etc/modprobe.d/kbd-backlight.conf
```

Add parameters specific to your hardware:

```bash
# For ASUS laptops with asus_nb_wmi module
options asus_nb_wmi backlight_switch=0

# For some ASUS models needing different quirks
options asus_nb_wmi wapf=4

# For Dell laptops
options dell_laptop kbd_led_levels=0

# For ThinkPads (if tpacpi module is used)
options tpacpi backlight_levels=0
```

After saving, update your initramfs and reboot:

```bash
sudo update-initramfs -u -k all
sudo reboot
```

## The Philosophy of Small Services

My dear reader, what we've created here is more than just a fix. It's a philosophy of Linux problem-solving. Instead of fighting the system or waiting for a kernel patch, we've built a small, single-purpose tool that respects the Unix philosophy: "Do one thing and do it well."

This systemd service is like a thoughtful janitor in a grand mosque. It doesn't interfere with prayers (your work), doesn't consume resources (it runs for milliseconds), and performs its single duty (turning off lights) at exactly the right moment. It's an exercise in elegance and efficiency.

When you see that keyboard remain dark after sleep, remember: you haven't just fixed a bug. You've added a tiny, intelligent heartbeat to your system—a whisper of automation that makes your technology more respectful of your intentions.

May your digital workspace be as calm and intentional as a well-kept garden, with every light obeying your command.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
