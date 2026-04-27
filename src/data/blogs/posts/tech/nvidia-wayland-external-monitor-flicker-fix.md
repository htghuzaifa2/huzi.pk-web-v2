---
title: "Laptop: Only External Monitor Flickers on Nvidia Wayland – EDID and Mode-Setting Tricks"
description: "How to fix external monitor flickering on Nvidia GPUs when using the Wayland session on Linux."
date: "2026-01-25"
topic: "tech"
slug: "nvidia-wayland-external-monitor-flicker-fix"
---

# Laptop: Only External Monitor Flickers on Nvidia Wayland – EDID and Mode-Setting Tricks

There’s a special kind of frustration in a flickering screen. On Ubuntu with an Nvidia GPU running Wayland, this ghost has a name, and we have the cures.

## The Immediate Action Plan
### 1. Force Stable Display Mode with `xrandr`
Identify your connector with `xrandr --verbose` and force a standard 60Hz rate:
```bash
xrandr --output <Connector> --mode 1920x1080 --rate 60.00
```

### 2. Stabilize the Nvidia Driver (Common Cure)
Add `nvidia-drm.modeset=1` to your kernel parameters:
1. Edit `/etc/default/grub`.
2. Update `GRUB_CMDLINE_LINUX_DEFAULT`.
3. Run `sudo update-grub` and reboot.

### 3. The Nuclear Option: Custom EDID
If the monitor's identity card is misread, force a clean EDID dump via `/lib/firmware/` and the kernel parameter `drm.edid_firmware=DP-1:edid.bin`.

---

```mermaid
flowchart TD
    A[Start: External Monitor Flickers<br>on Nvidia + Wayland] --> B{Apply Kernel Parameter Fix}
    B --> C[Add & activate<br><code>nvidia-drm.modeset=1</code><br>Update GRUB & Reboot]
    C --> D{Flicker Resolved?}
    
    D -- Yes --> E[🎉 Success!<br>Core driver issue fixed]
    D -- No --> F{Identify Stable Display Mode}
    
    F --> G[Use <code>xrandr --verbose</code><br>to find monitor & modes]
    G --> H[Manually set a<br>standard mode e.g.,<br><code>xrandr --output DP-1 --mode 1920x1080 --rate 60</code>]
    H --> I{Flicker Resolved?}
    
    I -- Yes --> J[✅ Mode-setting issue confirmed]
    I -- No --> K[🛠️ Suspect Faulty EDID]
    
    K --> L[Obtain clean EDID.bin file]
    L --> M[Deploy EDID Override]
    M --> N{Flicker Resolved?}
    
    N -- Yes --> O[🎯 Root Cause: Bad monitor EDID]
    N -- No --> P[Consider Cable/Adapter check]
```

---

*O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.*
