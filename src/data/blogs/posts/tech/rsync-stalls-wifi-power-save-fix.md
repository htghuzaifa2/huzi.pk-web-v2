---
title: "When Your WiFi Becomes a Digital Scribe with a Failing Memory: Fixing rsync Stalls"
description: "Fixing intermittent rsync stalls over WiFi by disabling power saving and optimizing TCP flow control for stable large file transfers."
date: "2026-01-25"
topic: "tech"
slug: "rsync-stalls-wifi-power-save-fix"
---

# When Your WiFi Becomes a Digital Scribe with a Failing Memory: Fixing rsync Stalls

Imagine you've entrusted a diligent scribe to copy a vast library of precious manuscripts. They work with quiet focus, transcribing page after page. But every few volumes, they simply… pause. The silence stretches until they jolt back to life.

This is the maddening experience of an `rsync` command that stalls every few files over WiFi. It’s not a failure—it’s a digital stammer. The culprit often lies in a silent war between your WiFi adapter’s urge to sleep and the network’s need for flow.

## The First Step: Diagnosis
Is the stall a complete network death or a slowdown? Run a continuous ping in a second terminal:
```bash
ping -c 100 [destination_IP]
```
If you see "Request timeout" or latency spikes (>800ms) when rsync stalls, your WiFi card is "falling asleep" or the buffer is overwhelmed.

### Diagnostic Checklist
| Step | Command | What to Look For |
| :--- | :--- | :--- |
| **1. Test Path** | `ping [destination]` | Latency spikes or timeouts. |
| **2. Inspect Power** | `iwconfig` | Is Power Management "on"? |
| **3. Observe rsync** | `rsync --progress` | Pattern of freezes (files/size). |

## Path 1: Disable WiFi Power Saving
Your WiFi chip tries to sleep to save power, but under the constant load of rsync, it misses packets.
*   **Temporary Fix**: `sudo iw dev [interface] set power_save off`.
*   **Quick Workaround**: Use `--bwlimit=5000` in rsync to prevent overwhelming the subsystem.

## Path 2: Widening the Conversation
If power saving isn't the issue, optimize the data stream:
*   **rsync options**: Use `-W` (`--whole-file`) to skip complex delta-calculations on slow links.
*   **TCP Buffers**: Increase maximum buffer sizes in `/etc/sysctl.conf`:
    ```text
    net.core.rmem_max=4194304
    net.core.wmem_max=4194304
    net.ipv4.tcp_rmem="4096 87380 4194304"
    net.ipv4.tcp_wmem="4096 65536 4194304"
    ```

## Final Tip: Use a Wired Connection
For the initial bulk transfer, an Ethernet cable is the most reliable path. It eliminates interference and power management quirks entirely.

---

```mermaid
flowchart TD
    A[Start: rsync Stalls over WiFi] --> B{Continuous Ping Check}
    B -- Latency Spikes --> C[<b>WiFi Power Save Issue</b>]
    B -- Stable Ping --> D[<b>TCP / rsync Logic Issue</b>]
    
    C --> E[Command:<br><code>iw dev [wlan0] set power_save off</code>]
    C --> F[Workaround:<br>Limit bandwidth with <code>--bwlimit</code>]
    
    D --> G[Try rsync <code>--whole-file</code>]
    D --> H[Optimize TCP buffers in sysctl]
    
    E --> I{Stalls Fixed?}
    F --> I
    G --> I
    H --> I
    
    I -- No --> J[Switch to Wired Ethernet]
    I -- Yes --> K[🎉 Transfer Flow Restored]
```

---

*O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.*
