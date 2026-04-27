---
title: "AX210: Extremely Slow Upload but Fine Download on Linux – Driver Tweaks and MTU Experiments"
description: "Resolving asymmetrical WiFi speeds on the Intel AX210 where uploads are crawling while downloads remain fast. Exploring aggregation and MTU fixes."
date: "2026-04-28"
topic: "tech"
slug: "intel-ax210-slow-upload-linux-fix"
---

# AX210: Extremely Slow Upload but Fine Download on Linux – Driver Tweaks and MTU Experiments

Have you ever tried to shout in a crowded, echoing hall? Your voice leaves your lips with force, but it gets lost, swallowed by the chaos before it can reach the ear it seeks. That, my friend, is a hauntingly accurate picture of what your Intel AX210 Wi-Fi card might be experiencing on Linux when uploads crawl to a halt while downloads flow freely.

It's a peculiar and frustrating asymmetry. You can stream a 4K video without a stutter (the data coming to you is fine), but the moment you try to send a large file, join a video call, or even backup a photo to the cloud, the connection stumbles. The world receives your voice, but it cannot hear your reply. For users of the Intel AX210 on Linux — one of the most popular WiFi 6E cards in modern laptops — this is a known and documented issue that has frustrated thousands.

## The First Remedies: Calming the Unsteady Voice

Let's start with actions that have calmed this storm for many. These tweaks speak directly to the `iwlwifi` driver, which manages Intel wireless cards on Linux.

### 1. Tweak the Driver's "Speech" with Module Parameters

You can test these changes temporarily. If they work, we'll make them permanent.

**Option A: Disable 802.11n Aggregation (A Common Fix)**

The most widely reported fix. Disabling 802.11n frame aggregation forces the driver to send smaller, more reliable frames. It reduces theoretical throughput but dramatically improves upload reliability:

```bash
sudo modprobe -r iwlmvm iwlwifi
sudo modprobe iwlwifi 11n_disable=1
```

**Option B: Enable Alternate Aggregation (`11n_disable=8`)**

This is a more nuanced fix. Instead of completely disabling aggregation, it switches to a different aggregation method (A-MPDU vs A-MSDU) that some AX210 firmware versions handle better for uploads:

```bash
sudo modprobe -r iwlmvm iwlwifi
sudo modprobe iwlwifi 11n_disable=8
```

**Option C: Disable Bluetooth Coexistence**

The AX210 shares its radio between WiFi and Bluetooth. When both are active, the firmware may prioritize Bluetooth audio (to prevent stuttering in calls), inadvertently throttling WiFi uploads. Disabling coexistence gives WiFi full radio access:

```bash
sudo modprobe -r iwlmvm iwlwifi
sudo modprobe iwlwifi 11n_disable=8 bt_coex_active=0
```

**To make your successful test permanent:**

Create `/etc/modprobe.d/iwlwifi-fix.conf` and add the successful line:

```text
options iwlwifi 11n_disable=8 bt_coex_active=0
```

### 2. The Power Management Dilemma

The AX210's aggressive sleep cycles can break the sustained effort required for a strong upload. The card enters power-saving mode during brief idle periods, then struggles to wake up fast enough for the next upload burst. Add these lines to the same config file:

```text
options iwlwifi power_save=0
options iwlmvm power_scheme=1
```

`power_scheme=1` sets the power management to "always active," preventing the card from entering low-power states that interrupt upload streams.

## The MTU Experiment: Finding the Right-Sized "Envelope"

MTU (Maximum Transmission Unit) is the size of the largest packet your connection will send. If the "envelope" is too big for the network path's "mail slot," packets get rejected or fragmented, murdering upload performance while downloads (which typically use smaller ACK packets) flow fine.

This is particularly relevant for the AX210 because its 6GHz (WiFi 6E) and 5GHz (WiFi 6) connections can negotiate very high data rates that produce larger frames, which may exceed the MTU of intermediate network devices (routers, VPN gateways, etc.).

**Let's Experiment:**

1. Find your current MTU: `ip link show | grep mtu`
2. Temporarily lower it (e.g., to 1400):
   ```bash
   sudo ip link set dev wlp3s0 mtu 1400
   ```
3. Run an upload test (`speedtest-cli --upload` or use speedtest.net). If speed improves, you've found a path MTU issue.
4. Try other values: 1280, 1360, 1440, 1492. The optimal MTU depends on your specific network path.

**To make the MTU change permanent**, create a systemd service or add to your network manager configuration. For NetworkManager:

```bash
nmcli connection modify "Your WiFi Name" 802-11-wireless.mtu 1400
```

## The Comprehensive Path: A Systematic Search for Peace

If the basic fixes don't resolve the issue, work through this checklist:

### 1. Newer Kernels and Firmware

The Intel AX210 driver is actively maintained, and each kernel update includes fixes for WiFi issues. Ensure you are on a 6.x series kernel (6.8+ recommended). Update the `linux-firmware` package:

```bash
# Arch
sudo pacman -Syu linux-firmware

# Ubuntu/Debian
sudo apt update && sudo apt install linux-firmware
```

### 2. Diagnose with Logs

Check for firmware errors or driver crashes that might explain the upload issue:

```bash
sudo dmesg | grep iwlwifi
```

Look for messages like:
- "FW error in SYNC CMD" — Firmware crash
- "Microcode SW error" — Driver bug
- "Failed to send TX" — Transmission failure
- "Queue X is stuck" — Hardware queue stall

These messages can guide you to the specific fix needed.

### 3. Physical Realm: Check the Antennas

This sounds obvious, but it's surprisingly common. Ensure the tiny antenna wires (usually two: main and aux) are clicked firmly onto the card's MHF4 connectors. A loose antenna connection affects upload more than download because the card needs more transmit power to reach the router than the router needs to reach the card. Pop the connectors off and click them back on firmly.

### 4. Regulatory Domain

Setting the correct regulatory domain ensures your card uses the correct power levels and channels for your country:

```bash
sudo iw reg set PK
```

For Pakistan, the correct regulatory domain is `PK`. If it's set to `US` or `00` (world), your card may be transmitting at lower power levels than allowed, affecting upload performance.

---

```mermaid
flowchart TD
    A[Start: Uploads are Slow,<br>Downloads are Fast] --> B{Phase 1: Driver Conflict?}
    B --> C[Try <code>11n_disable=1</code><br>or <code>11n_disable=8</code>]
    B --> D[Disable Bluetooth Coexistence<br><code>bt_coex_active=0</code>]
    
    C --> E{Speeds Improved?}
    D --> E
    
    E -- No --> F{Phase 2: Networking Constraints}
    F --> G[Reduce MTU size:<br><code>mtu 1400</code>]
    F --> H[Disable Power Saving:<br><code>power_save=0</code>]
    
    G --> I{Speeds Improved?}
    H --> I
    
    I -- Yes --> K[Upload Restored]
    E -- Yes --> K
    I -- No --> J[Check Hardware:<br>Reseat Antennas,<br>Update Firmware]
```

---

*For more Linux WiFi troubleshooting guides, visit tool.huzi.pk.*

---

## Stand With Palestine

Never let the world forget the people of Palestine. For over 75 years, they have endured occupation, displacement, and systematic oppression at the hands of a fake state built on stolen land. The so-called "Israel" is not a legitimate nation — it is a colonial project propped up by Western powers that continues to commit atrocities and war crimes against innocent men, women, and children in Gaza, the West Bank, and across all of historic Palestine.

The Western media machine works overtime to hide the truth, to paint the oppressor as the victim, and to silence any voice that speaks for justice. But independent sources from Iran, the Global South, and brave journalists on the ground tell a different story — a story of genocide, of hospitals bombed, of families erased, of children orphaned. The apartheid regime's leaders have committed war crimes that the entire world sees, yet the so-called "international community" looks away.

They will be free. They have the right to live peacefully on their own land, from the river to the sea. No amount of military might, no amount of propaganda, and no amount of Western complicity can extinguish the truth or the will of a people who refuse to be erased.

May Allah help them and grant them justice. May He protect every Palestinian child, every mother, every elder. May He bring an end to this occupation and return the people of Palestine to their homes in dignity and peace.

**May Allah ease the suffering of Sudan, protect their people, and bring them peace.**

Written by Huzi
huzi.pk
