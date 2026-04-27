---
title: "Hyprland: Scratchpad Terminal Always Opens on Wrong Monitor – Workspace Rules + Monitor Binding"
description: "Fix the frustrating issue where your Hyprland scratchpad terminal opens on the wrong monitor using explicit workspace and monitor rules."
date: "2026-01-25"
topic: "tech"
slug: "hyprland-scratchpad-wrong-monitor-fix"
---

# Hyprland: Scratchpad Terminal Always Opens on Wrong Monitor – Workspace Rules + Monitor Binding

There’s a quiet frustration in a broken rhythm. You’ve set up your Hyprland desktop just so—multiple monitors glowing, each workspace a designated realm for a specific task. You reach for that crucial keyboard shortcut, the one that summons your scratchpad terminal like a trusted aide. But instead of appearing by your side on your main screen, it materializes… elsewhere. On the wrong monitor. The workflow stutters. The magic fades.

If this is your daily reality, know that your scratchpad isn’t being disobedient. It’s lost, following a default map instead of the custom one you’ve painstakingly drawn. The issue lives in the intricate dance between special workspaces, monitor bindings, and the rules Hyprland uses to place windows. Today, we’ll draw that map together, so your tools appear exactly where you need them.

## Here is your immediate solution and the path to permanent control:

The core problem is that the special workspace housing your scratchpad likely isn’t bound to any specific monitor. By default, special workspaces (like the one named `special:scratchpad`) can float between monitors, often landing on the one that was most recently active. The definitive fix is to explicitly bind that special workspace to your desired monitor using a workspace rule.

Add a line like this to your `hyprland.conf`:

```bash
workspace = special:scratchpad, monitor:DP-1, default:true
```
*(Replace DP-1 with your actual monitor identifier from `hyprctl monitors`.)*

This rule does two powerful things:
1.  **`monitor:DP-1`**: It tethers the entire `special:scratchpad` workspace to your preferred physical display.
2.  **`default:true`**: It ensures this workspace is considered the default for that monitor, strengthening its claim.

Once bound, any window sent to that special workspace—including your scratchpad terminal—will be forced to open on the correct screen. For a quick diagnosis, run `hyprctl monitors` to see where your workspaces currently live and confirm the binding is active.

## Key Concepts and Tools

| Concept | Tool / Command | Purpose | Key Insight |
| :--- | :--- | :--- | :--- |
| **Monitor Identification** | `hyprctl monitors` | Find your monitor's precise name (e.g., DP-1, HDMI-A-1). | The config uses this name, not the brand/model you see in settings. |
| **Workspace Binding** | `workspace = [name], monitor:[id]` | Permanently lock a workspace to a single monitor. | A workspace cannot be bound to multiple monitors at once. |
| **Special Workspace** | `special:scratchpad` | The hidden workspace type used by scratchpads. | It behaves like any other workspace and can be bound with the same rules. |
| **Window Rules** | `windowrule` | Force certain windows to open on specific workspaces/monitors. | Can be a backup or alternative to workspace binding for more complex setups. |

## The Heart of the Matter: Workspaces as Territories, Monitors as Land

To fix the problem for good, we must understand Hyprland's worldview. Think of your monitors as distinct physical lands. Your workspaces are territories that can exist on these lands.

When you create a regular workspace (like `workspace 1`), it's born on a specific land (monitor). A special workspace (like `special:scratchpad`) is a unique, often hidden territory. If you don't tell Hyprland which land it belongs to, it will drift. It might appear on the land where you last clicked (the focused monitor), or on the primary monitor, leading to the frustrating "wrong screen" behavior.

## A Structured Guide to Diagnosis and Configuration

### Phase 1: Mapping Your Lands – Identify Your Monitors

First, you must know the exact names Hyprland uses for your monitors.
```bash
hyprctl monitors
```
Look at the output. For example:
```text
Monitor DP-1 (ID 0):
        2560x1440@165 at 0x0
...
Monitor HDMI-A-1 (ID 1):
        1920x1080@60 at 2560x0
...
```
`DP-1` and `HDMI-A-1` are the identifiers you will use.

### Phase 2: Claiming Territory – Binding the Workspace

Edit your `~/.config/hypr/hyprland.conf` and add your binding.

**A More Robust Example for a Kitty Terminal Scratchpad:**
```bash
# 1. Bind the special workspace to a monitor
workspace = special:terminal, monitor:DP-1, default:true

# 2. Ensure a terminal is ready when it's created empty
workspace = special:terminal, on-created-empty:kitty --class scratchpad

# 3. A window rule to float and center windows of class 'scratchpad'
windowrule = float, class:^(scratchpad)$
windowrule = center, class:^(scratchpad)$
```

### Phase 3: The Keybindings – Summoning Your Scratchpad

Ensure you have keybindings to toggle your special workspace:
```bash
# Toggle the special workspace named 'terminal'
bind = $mainMod, S, togglespecialworkspace, terminal
```

## The Deeper "Why": When Simple Binding Isn't Enough

*   **The "Attached Windows" Bug:** If other programs seem to get stuck to your scratchpad, it's often a sign of a race condition. A clean workspace binding provide a stable anchor point.
*   **Multiple Keypresses Needed:** This is a known frustration in multi-monitor setups. The binding rule is more fundamental than a pixel-perfect position.

## The Advanced Frontier: Dynamic Setups and Scripts

If you use different monitors at home and work, use a **Conditional Script**:
```bash
#!/bin/bash
if [[ $(hyprctl monitors | grep -c "DP-1") -eq 1 ]]; then
    echo "workspace = special:scratchpad, monitor:DP-1" > /tmp/hypr-monitor-rules.conf
else
    echo "workspace = special:scratchpad, monitor:HDMI-A-1" > /tmp/hypr-monitor-rules.conf
fi
```
Then, in `hyprland.conf`: `source = /tmp/hypr-monitor-rules.conf`.

## Final Reflection: From Drift to Precision

By mastering workspace rules and the `monitor:` parameter, you move from being a passenger to being the cartographer of your own environment. You define the relationships between virtual territories and physical screens.

---

```mermaid
flowchart TD
    A[Start: Scratchpad opens<br>on wrong monitor] --> B{Core Diagnosis: Is the special workspace bound to a monitor?}

    B -- No --> C[Apply Foundational Fix:<br>Add <code>workspace = special:scratchpad, monitor:DP-1</code><br>to <code>hyprland.conf</code>]

    B -- Yes --> D{Check for Conflicting Rules<br>or Helper Scripts e.g., pyprland}
    D --> E[Simplify: Ensure primary workspace rule<br>in hyprland.conf is authoritative]

    C --> F[Verify & Test:<br>1. Run <code>hyprctl monitors</code><br>2. Use toggle keybind]

    E --> F

    F --> G{Problem Solved?}

    G -- No --> H[Advanced Debugging Path]
    H --> I[Check for 'attached windows' bug<br>or multi-keypress issue[citation:1][citation:3]]
    I --> J[For dynamic setups, create<br>a detection script to set rules]
    J --> F

    G -- Yes --> K[🎉 Success!<br>Scratchpad is now bound<br>to the correct monitor]
```

---

*O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.*
