---
title: "Taming the Chaos: How I Made My Hyprland Windows Stay Put When Monitors Change"
description: "Fix windows jumping monitors in Hyprland. Use persistent workspace binding and window rules to lock apps to specific monitors."
date: "2026-01-24"
topic: "tech"
slug: "hyprland-multi-monitor-workspace-fix"
---

# Taming the Chaos: How I Made My Hyprland Windows Stay Put When Monitors Change

**There’s a particular kind of digital vertigo you experience when you plug in a second monitor and your perfectly organized Hyprland desktop explodes.** Your browser, meticulously placed on your right screen, is now crammed into the laptop display. Your terminal, anchored to workspace 3, has teleported to who-knows-where. Your windows, like startled birds, have flown into a chaotic new formation. For months, I accepted this as the price of Hyprland’s dynamic, fluid beauty—until I decided to build a perch they couldn’t leave.

If you’re battling this same chaos every time your monitor layout changes—whether docking a laptop, turning off a screen, or switching resolutions—the solution lies in one powerful Hyprland concept: persistent workspace-to-monitor rules and window rules. You don’t have to live with the madness. Here’s how I made my configuration stick, no matter what I plug in or unplug.

## The Core Fix: Binding Workspaces to Specific Monitors
The root of the chaos is that by default, Hyprland’s workspaces are floating—they can move freely between monitors. The key is to anchor them. In your `~/.config/hypr/hyprland.conf`, you use the `workspace` keyword to bind a workspace to a monitor by name.

Here’s the syntax that changes everything:
```bash
# Syntax: workspace = [workspace number],[monitor name]
workspace = 1, monitor:DP-1
workspace = 2, monitor:DP-1
workspace = 3, monitor:HDMI-A-1
workspace = 4, monitor:HDMI-A-1
```
**How to Find Your Monitor Names:**
Run `hyprctl monitors` in your terminal. Look for the `name` field in the output (e.g., `DP-1`, `HDMI-A-1`, `eDP-1`). Use these exact names in your config.

**The Result:** Now, workspace 1 and 2 always live on your primary `DP-1` monitor. Workspace 3 and 4 are permanently hosted on your HDMI screen. When you disconnect the HDMI monitor, workspaces 3 and 4 simply become unavailable (they don’t jump to the other screen). When you reconnect it, they reappear right where they belong.

## The Advanced Lock: Window Rules for Ultimate Precision
Workspace binding prevents the big shifts. But what about ensuring specific apps always open on a specific monitor and workspace? That’s where window rules are your best friend.

You can pin applications to a dedicated workspace and monitor at launch:
```bash
# Syntax: windowrule = [rule], [class]
# Open Firefox on workspace 2 on monitor DP-1
windowrule = workspace 2, firefox
# Open kitty terminal on workspace 3 on monitor HDMI-A-1
windowrule = workspace 3, kitty
```
For even more granular control, you can combine rules:
```bash
# Move and size a floating window (like Pavucontrol)
windowrule = float, pavucontrol
windowrule = size 800 500, pavucontrol
windowrule = move 75% 10%, pavucontrol
```

## The Dynamic Duo: Signal-Based Config Swaps (For Laptop Nomads)
If you have a profoundly different setup between, say, a mobile laptop mode and a docked workstation mode, you can use Hyprland’s signal listener to execute scripts that change your config on the fly.
1.  **Create Two Configs:** `hyprland.conf.docked` and `hyprland.conf.laptop`.
2.  **Write a Tiny Script:** A script that uses `hyprctl` to change workspace bindings when a monitor is plugged in.
3.  **Bind it to a Signal:** Use `hyprctl` to listen for monitor events.

This is advanced sorcery, but for the true tinkerer, it’s the ultimate solution for a seamless transition between worlds.

## Understanding the Storm: Why Hyprland Windows Go Rogue
To build a lasting peace, you must understand the nature of the conflict. Hyprland is a dynamic, tiling compositor for Wayland. Its philosophy isn’t to rigidly preserve pixel-perfect window positions like a static desktop of old. Instead, it manages windows within workspaces and places workspaces on outputs (monitors).

When you change your monitor layout, Hyprland sees it as a fundamental change to the available canvas. Its default behavior is to redistribute the existing workspaces across the new canvas layout, often using a simple algorithm that fills screens left-to-right. It’s not “going crazy”—it’s trying, and failing, to adapt elegantly to a dramatically changed environment.

Your traditional desktop might remember that Firefox was 500 pixels from the left edge of Monitor X. Hyprland remembers that Firefox is on Workspace 3. If Workspace 3 gets moved to a different monitor by the layout change, Firefox moves with it. Our fix, therefore, isn’t to fight this workspace-centric logic, but to master it by dictating exactly where each workspace calls home.

## Crafting Your Perfect, Stable Layout: A Step-by-Step Guide
Let’s move from theory to practice. Here is my recommended workflow to build a rock-solid, multi-monitor Hyprland setup.

### Step 1: The Foundation – Mapping Your Digital Territory
First, know your battlefield. Plug in all your monitors in your preferred layout.
1.  Open your terminal and run `hyprctl monitors`. Note down the name and description of each.
2.  Open the Hyprland config file: `nvim ~/.config/hypr/hyprland.conf` (or use your editor of choice).
3.  In a dedicated section (I have a `# Monitor & Workspace Rules` section), write your workspace binding lines as shown above.

**Pro-Tip:** Reserve the first few workspaces (1,2,3) for your most critical, always-open apps on your primary monitor. Use higher numbers for secondary screens and temporary work.

### Step 2: Assigning Tenants – Creating Window Rules
Now, decide which applications live where. Identify the class of your applications by running `hyprctl clients` and looking at the `class` field. Then, add your rules.

A snippet from my `windowrulev2` section (I use windowrulev2 for its more powerful regex matching):
```bash
windowrulev2 = workspace 1, class:^(firefox)$
windowrulev2 = workspace 2, class:^(kitty)$
windowrulev2 = workspace 3, class:^(Code)$
windowrulev2 = workspace 8, class:^(discord)$ # Discord lives on workspace 8 on my second monitor
windowrulev2 = float, class:^(pavucontrol)$
```

### Step 3: Taming the Floating Windows – Dialogs and Utilities
Floating windows (file pickers, toolboxes, etc.) are the wild cards. They can appear anywhere. Use rules to give them a predictable home, usually center-screen on your primary monitor.
```bash
# Center floating dialogs
windowrulev2 = center, class:^(.*)$, title:^(Open File|Save File|Select Directory)$
```

## Beyond the Basics: Advanced Stability Tactics

### Handling Mixed DPIs and Scaling
If you have a high-resolution laptop screen and a standard external monitor, forcing XWayland apps to behave can add another layer of complexity. Use the `xwayland` section in your config for global control:
```bash
xwayland {
  force_zero_scaling = true # Can help with blurriness on mixed-DPI setups
}
```
Then, use environment variables per-application if needed for scaling, but know that this is a separate challenge from window positioning.

### What About NVIDIA?
The NVIDIA proprietary driver can sometimes introduce its own quirks with monitor detection. If you’re on NVIDIA and facing issues even with workspace binds, ensure your config has the essential environment variables for stability:
```bash
env = LIBVA_DRIVER_NAME,nvidia
env = GBM_BACKEND,nvidia-drm
env = __GLX_VENDOR_LIBRARY_NAME,nvidia
```
A full Hyprland reload (`MOD + SHIFT + R`) is often necessary after a hotplug event with NVIDIA drivers for all settings to fully apply.

## Final Reflection: From Chaos to Choreographed Harmony
Taming Hyprland’s window management across changing monitors is not about imposing rigid, brittle control. It’s about understanding its fluid, workspace-oriented soul and guiding it with gentle, persistent rules. It’s the difference between trying to hold back a river with your hands and simply digging a canal to guide the water where you want it to go.

The moment I added those `workspace = [number],[monitor]` lines and saw my digital workspace hold its shape through disconnects and reconnects, I felt a profound sense of calm. My setup was no longer a temporary arrangement of digital cards, vulnerable to the slightest breeze. It had become a home—a persistent, reliable space for my work and mind to inhabit.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
