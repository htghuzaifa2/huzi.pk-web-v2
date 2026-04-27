---
title: "Hyprland: Multi-Monitor Layout Resets Every Time I Unplug a Screen? Here is the Fix"
description: "Script to save and restore window layouts in Hyprland when unplugging monitors. Fix the 'Scattered Gathering' of your digital desktop."
date: "2026-01-24"
topic: "tech"
slug: "hyprland-multi-monitor-layout-fix"
---

# The Scattered Gathering: When Your Digital Desktops Forget Their Place

As-salamu alaikum, my friend. Picture this scene: you've carefully arranged a mehfil. Guests are seated in perfect circles, conversations flowing in their designated spaces. Then, one group must briefly step out. When they return, everyone has shifted—circles broken, assigned seats forgotten. The harmonious gathering you orchestrated is scattered, and you must painstakingly reorganize it all.

This is the exact, soul-wearying frustration when you unplug your laptop from a glorious multi-monitor setup at your desk, work on the go, and return to plug everything back in. Hyprland greets you with a default, chaotic sprawl. Your meticulously placed workspaces—Code on Monitor 2, Browser on Monitor 3, Terminal on Monitor 1—are all lost. Every window is piled onto a single screen or assigned to monitors seemingly at random.

I've lived this digital disarray. That sigh of resignation as you manually drag 15 windows back to their rightful homes is a special kind of fatigue. But here is the liberating truth: Hyprland is not forgetting. It is, in fact, faithfully following its internal logic. Our task is not to fight it, but to learn its language and teach it our preferences. Today, we will build a memory for our setup—a script that acts as a perfect host, remembering every guest's place.

## The Immediate Salvation: Your Save & Restore Scripts

First, let's stop the pain. Here are the essential scripts you can use right now. Copy them, save them, and give them executable permissions.

### 1. The Layout Saver Script

Save this as `~/.config/hypr/save_layout.sh`. This script will capture the current state of your workspaces and which monitor they belong to.

```bash
#!/bin/bash
# save_layout.sh - Captures Hyprland's workspace-to-monitor mapping

CONFIG_DIR="$HOME/.config/hypr"
LAYOUT_FILE="$CONFIG_DIR/workspace_layouts.conf"

# Get the current workspace ID and monitor for each client (window)
hyprctl clients -j | jq -r '.[] | "workspace=\(.workspace.id) monitor=\(.monitor)"' | sort -u > "$LAYOUT_FILE.tmp"

# Get the active workspace for each monitor
hyprctl monitors -j | jq -r '.[] | "active_workspace=\(.activeWorkspace.id) monitor=\(.name)"' >> "$LAYOUT_FILE.tmp"

# Move the temporary file to the final location
mv "$LAYOUT_FILE.tmp" "$LAYOUT_FILE"

echo "Layout saved to $LAYOUT_FILE"
echo "--- Saved Layout ---"
cat "$LAYOUT_FILE"
```

### 2. The Layout Restorer Script

Save this as `~/.config/hypr/restore_layout.sh`. This script reads the saved file and moves workspaces back to their correct monitors.

```bash
#!/bin/bash
# restore_layout.sh - Moves workspaces back to their saved monitors

LAYOUT_FILE="$HOME/.config/hypr/workspace_layouts.conf"

if [[ ! -f "$LAYOUT_FILE" ]]; then
    echo "Error: No saved layout file found at $LAYOUT_FILE"
    exit 1
fi

# First, ensure all monitors are detected and ready
sleep 1

# Read the layout file line by line
while IFS= read -r line; do
    if [[ "$line" =~ ^workspace=([0-9]+)\ monitor=([^ ]+)$ ]]; then
        WORKSPACE="${BASH_REMATCH[1]}"
        MONITOR="${BASH_REMATCH[2]}"
        
        # Use hyprctl to move the workspace to the correct monitor
        hyprctl dispatch moveworkspacetomonitor "$WORKSPACE $MONITOR"
        echo "Moved workspace $WORKSPACE to monitor $MONITOR"
    fi
done < "$LAYOUT_FILE"

echo "Layout restoration complete!"
```

### 3. Making It Automatic (The True Fix)

The magic happens when we make Hyprland run the restorer script automatically when monitors change.

Add these key bindings and event trigger to your `hyprland.conf`:

```bash
# Key bindings to manually save/restore (Super+Ctrl+S, Super+Ctrl+R)
bind = $SUPER CTRL, S, exec, ~/.config/hypr/save_layout.sh
bind = $SUPER CTRL, R, exec, ~/.config/hypr/restore_layout.sh

# AUTOMATIC RESTORE: Trigger when a monitor is added (HDMI/DP plug in)
exec-once = ~/.config/hypr/autorestorer.sh
```

Create `~/.config/hypr/autorestorer.sh` with smart logic:

```bash
#!/bin/bash
# autorestorer.sh - Waits for monitor changes and restores layout

# Initial sleep to let Hyprland start
sleep 3

# Monitor hyprctl for changes in monitor count
LAST_COUNT=$(hyprctl monitors -j | jq length)

while true; do
    sleep 2
    CURRENT_COUNT=$(hyprctl monitors -j | jq length)
    
    # If monitor count INCREASES (a screen was plugged in)
    if [ "$CURRENT_COUNT" -gt "$LAST_COUNT" ]; then
        echo "New monitor detected! Waiting for stability..."
        sleep 3  # Wait for monitor to fully initialize
        ~/.config/hypr/restore_layout.sh
    fi
    
    LAST_COUNT=$CURRENT_COUNT
done
```

#### Quick-Start Command Summary

| Task | Command |
| :--- | :--- |
| **Make scripts executable** | `chmod +x ~/.config/hypr/*.sh` |
| **Manually save current layout** | `~/.config/hypr/save_layout.sh` |
| **Manually restore layout** | `~/.config/hypr/restore_layout.sh` |
| **Start auto-restore service** | Add `exec-once` line to `hyprland.conf` |
| **Check monitor info** | `hyprctl monitors` |

## Understanding Hyprland's "Forgetfulness": Workspaces Are Tied to Monitors

To truly master this, we must understand why this happens. Unlike some compositors, Hyprland has a fundamental design principle: **Workspaces are inherently tied to physical monitors, not virtual spaces.**

### The Core Concept: Workspace-Monitor Marriage

In Hyprland's worldview:

*   Each workspace "lives on" a specific monitor
*   When you unplug a monitor, its workspaces don't magically migrate—they become "orphaned"
*   When you plug a monitor back in, Hyprland sees it as a **new monitor** (often with a different identifier like HDMI-A-1 vs DP-1)
*   The orphaned workspaces either get assigned to whatever monitor Hyprland chooses, or new default workspaces are created

### The Real Problem: Monitor Identification

Run `hyprctl monitors` before and after unplugging. You'll notice the `name` field changes:

*   **Before:** DP-1, HDMI-A-1, eDP-1
*   **After replug:** Maybe HDMI-A-2, eDP-1, or completely different names

This identifier change is why simple static configs fail. Our scripts work by:
1.  Saving the **current mapping** of workspace numbers to whatever monitor names exist now
2.  Restoring by applying those mappings to whatever monitor names exist **later**

## Advanced Scripting: Handling Edge Cases and Complex Setups

For those with dynamic setups (docking stations, varying work locations), here are enhanced solutions.

### 1. Profile-Based Layouts

Create different layouts for different scenarios (home desk, office dock, coffee shop):

```bash
#!/bin/bash
# save_profile.sh - Saves layout with profile name

PROFILE_NAME="$1"
if [ -z "$PROFILE_NAME" ]; then
    PROFILE_NAME="default"
fi

LAYOUT_FILE="$HOME/.config/hypr/layouts/${PROFILE_NAME}.conf"
mkdir -p "$(dirname "$LAYOUT_FILE")"

# Save monitor-Workspace mappings
hyprctl monitors -j | jq -r '.[] | "\(.name)=\(.activeWorkspace.id)"' > "$LAYOUT_FILE"

# Save window positions per workspace
hyprctl clients -j | jq -r '.[] | "window=\(.class) workspace=\(.workspace.id) monitor=\(.monitor)"' >> "$LAYOUT_FILE"

echo "Profile '$PROFILE_NAME' saved."
```

### 2. Intelligent Workspace Naming

Instead of using numeric workspaces only, use named workspaces that can be logically restored:

```bash
# In hyprland.conf
workspace = name:code, monitor:DP-1
workspace = name:browser, monitor:HDMI-A-1
workspace = name:term, monitor:eDP-1
```

Then enhance your restore script to handle named workspaces:

```bash
# Partial enhanced restore logic
hyprctl dispatch focusmonitor "DP-1"
hyprctl dispatch workspace "code"
# Open your code applications here...
```

#### Comparison of Different Approaches

| Approach | Pros | Cons | Best For |
| :--- | :--- | :--- | :--- |
| **Basic Save/Restore Scripts** | Simple, reliable, immediate | Manual trigger or basic auto | Most users, consistent setups |
| **Profile-Based System** | Handles multiple configurations | More complex setup | Users with 3+ different locations |
| **Workspace Naming** | Semantic, clear organization | Doesn't solve monitor mapping alone | Combined with scripts |
| **Hyprland IPC Events** | Most elegant, event-driven | Advanced scripting required | Power users, developers |

## The Deeper Solution: Embracing Hyprland's IPC for Event-Driven Restoration

For the most robust solution, we can use Hyprland's IPC (Inter-Process Communication) to listen for events.

### The Python IPC Listener

Create a Python script that listens for monitor events:

```python
#!/usr/bin/env python3
# monitor_watcher.py - Listens for Hyprland events

import json
import subprocess
import time
from threading import Thread

def get_monitor_count():
    result = subprocess.run(['hyprctl', 'monitors', '-j'], 
                          capture_output=True, text=True)
    monitors = json.loads(result.stdout)
    return len(monitors)

def restore_layout():
    subprocess.run(['/home/YOUR_USER/.config/hypr/restore_layout.sh'])
    
def monitor_watcher():
    last_count = get_monitor_count()
    
    while True:
        time.sleep(1)
        current_count = get_monitor_count()
        
        if current_count > last_count:
            print(f"Monitor added! {last_count} -> {current_count}")
            time.sleep(2)  # Let monitor initialize
            restore_layout()
            
        last_count = current_count

if __name__ == "__main__":
    print("Hyprland Monitor Watcher started...")
    monitor_watcher()
```

Add this to your `hyprland.conf`:

```bash
exec-once = python3 ~/.config/hypr/monitor_watcher.py
```

## A Reflection on Digital Permanence and Impermanence

My dear reader, this journey with monitor layouts is more than technical troubleshooting. It mirrors a profound truth about our relationship with technology and space. We crave stability and persistence—our digital *taameer* (construction) to remain as we built it. Yet, the physical world of connectors, signals, and hardware is inherently transient.

Creating these scripts is an act of wisdom. It is accepting the fluid nature of the physical while asserting the constancy of our digital intention. Each time your workspaces snap back to their rightful places automatically, it's a small victory of order over chaos, of memory over forgetfulness.

May your digital workspace always reflect your intention, and may your physical space always know the peace of proper arrangement.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
