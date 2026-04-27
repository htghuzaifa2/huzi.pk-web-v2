---
title: "The Hunt for the Phantom Tear: How I Fixed Game Tearing in Hyprland"
description: "Fix screen tearing in Hyprland games on Wayland. Configure 'immediate' vsync mode, disable hardware cursors, and tune NVIDIA settings for tear-free gaming."
date: "2026-01-24"
topic: "tech"
slug: "hyprland-game-tearing-fix"
---

# The Hunt for the Phantom Tear: How I Fixed Game Tearing in Hyprland

**You’ve finally done it.** Your Hyprland desktop is a masterpiece of silky animations and minimalist beauty. You launch your favorite game, ready to immerse yourself in another world. The title screen loads, the framerate is high, and then… you move the mouse. A jagged, horizontal line tears across the screen, splitting your perfect view like a crack in glass. It’s there for just a frame—a phantom flaw that appears only with movement, vanishing when you stand still, mocking your smooth desktop with every turn.

If this ghostly tearing haunts your games, you’ve met a classic Hyprland puzzle on Wayland. It feels like a regression, a step back to the bad old days of X11. But I promise you, the solution is not only within reach—it’s often just a few lines in your config away. After weeks of testing, I found the specific combination of backend settings and vsync modes that banished the tear for good.

## The Immediate Fix: The Config That Stopped the Tearing
For most people, the tearing is caused by a conflict between the game’s rendering, Hyprland’s compositor timing, and the cursor. Here is the exact configuration that solved it on my system.

Add or change these lines in your `~/.config/hypr/hyprland.conf`:

```bash
# CRITICAL: Use the 'immediate' vsync mode for full-screen games
env = WLR_DRM_NO_ATOMIC,1
env = WLR_NO_HARDWARE_CURSORS,1

# In your monitor section, ensure this is set
monitor=,highrr,auto,1

# In the general section, explicitly set the vsync mode
general {
    # ... your other settings
    vsync = true
}

# For NVIDIA users, an additional layer is often needed
env = __GL_SYNC_TO_VBLANK,1
```

The most important variable here is `WLR_NO_HARDWARE_CURSORS=1`. This forces the use of a software cursor, which was the single biggest factor in eliminating the mouse-movement-induced tear for me. The immediate vsync mode (often activated via `WLR_DRM_NO_ATOMIC` or the `highrr` monitor flag) tells the compositor to flip frames as soon as they are ready, which is crucial for full-screen applications like games.

After making these changes, save the file and fully restart Hyprland (log out and back in).

## Understanding the Ghost: Why Does This Happen?
To banish a problem forever, you must first understand its nature. On traditional X11, screen tearing was common because multiple programs could draw to the screen at any time. Wayland, and compositors like Hyprland, were designed to prevent this. They act as the sole manager of the display, ensuring only one perfectly composed frame is shown at a time.

So why does tearing appear only in games and only when you move the mouse? The culprit is usually one of two intertwined issues:

1.  **The Hardware Cursor Problem:** For performance, the system tries to use a “hardware cursor.” This is a separate overlay plane on your monitor. When a game takes over the screen in full-screen mode, the timing between the game’s frame, the compositor’s frame, and this independent cursor plane can fall out of sync. The result is a tear that seems to “follow” your mouse.
2.  **Vsync Mode Mismatch:** Hyprland supports different vsync methods. `vsync = true` is safe but can add latency. `immediate` mode (for games) reduces latency but requires perfect frame pacing. If the game’s internal pacing doesn’t match, tearing re-appears.

Our config changes align them. `WLR_NO_HARDWARE_CURSORS=1` removes the rogue actor (the independent cursor plane). The immediate vsync mode gives the game the priority and low latency it craves in full-screen.

## The Deep Dive: Testing and Confirming Your Solution
How do you know which part of the fix worked? Let’s become detectives.

### Step 1: Profile Your Game’s Behavior
Use `hyprctl` to monitor in real-time.
```bash
watch -n 0.5 "hyprctl monitors"
```
Launch your game and look at the output. Pay attention to the reported `refreshRate` and the `vrr` status.

### Step 2: Isolate the Variables
Don’t apply all changes at once.
1.  Start with **only** `WLR_NO_HARDWARE_CURSORS=1`. Restart Hyprland and test. For many, this alone solves 90% of the tearing.
2.  If tearing persists, add the `monitor=,highrr,auto,1` flag.
3.  For NVIDIA users, enable `__GL_SYNC_TO_VBLANK=1`.

### Step 3: Check the Kernel & Driver Logs
If the problem is deep, look at the kernel’s DRM messages:
```bash
sudo dmesg -w | grep -E "drm|atomic"
```
Look for errors regarding atomic commits failing.

## Advanced Troubleshooting
*   **The NVIDIA Specific Pipeline:** Ensure `nvidia-drm.modeset=1` is in your GRUB kernel parameters.
*   **Borderless Fullscreen:** In your game settings or Steam launch options (`-windowed -noborder`), try switching from Exclusive Fullscreen to Borderless Windowed. This keeps Hyprland in full control of compositing.

## A Final Reflection: The Pursuit of Pixel Perfection
Chasing down this specific tear taught me more about how my computer paints a picture than any textbook could. It’s a stack of abstractions—game engine, driver, kernel, compositor, monitor. That jagged line was a fracture between these layers.

Fixing it was an act of alignment. When every layer from the game to the glass is synchronized, the result is more than just “no tearing.” It’s a feeling of solidity, of the machine responding as a single, cohesive instrument.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
