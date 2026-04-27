---
title: "Arch: Suspend/Hibernate Works Randomly – Debugging Sleep, ACPID, and Systemd Sleep Targets"
description: "Debug random suspend/hibernate failures on Arch Linux. A systematic guide using kernel pm_test, ACPI wakeups, and systemd sleep logs."
date: "2026-01-24"
topic: "tech"
slug: "arch-suspend-hibernate-debug"
---

# Arch: Suspend/Hibernate Works Randomly – Debugging Sleep, ACPID, and Systemd Sleep Targets

**There is a unique frustration when technology betrays you through inconsistency.** Not a total failure—those you can attack head-on—but the maddening "maybe." You close your laptop lid one afternoon, and it slips into a perfect, power-saving slumber. That evening, you do the same, only to return to a hot bag, a dead battery, or a frozen screen that demands a hard reboot. Your system’s ability to sleep becomes a roll of the dice, leaving you with a simple, haunting question: will it wake this time?

This was my reality for months. My Arch machine, a beacon of reliability in every other aspect, had a fickle relationship with rest. Sometimes it hibernated beautifully, preserving my work for days. Other times, it would pretend to sleep, only to wake seconds later or, worse, never wake at all. The problem felt personal, random, and deeply unstable. The journey to fix it taught me that sleep in Linux is not a single command but a delicate negotiation between hardware, kernel, and userspace—and debugging it is a lesson in systematic detective work.

Here is how I found the ghosts in my machine and made suspend and hibernate work every single time.

## The Immediate Action Plan: Stop the Guessing Game
If you're tired of the randomness, start here. These steps form a direct path to identify the most common culprits.

**The Problem:** Suspend (to RAM) or hibernate (to disk) works unpredictably. It may fail to enter sleep, wake immediately, fail to resume, or cause a freeze/reboot on wake.

**The Core Philosophy:** Random failures are rarely random. They are usually a conflict between a hardware device, a kernel driver, and the sleep protocol. Your job is to find which device is refusing to sleep or waking the system without permission.

### Step 1 – The Diagnostic Command:
The first and most powerful tool is the kernel's own test facility. It allows you to test sleep states in stages without fully committing. Run in a terminal:
```bash
# Switch to the 'freezer' test level (safest)
sudo bash -c "echo freezer > /sys/power/pm_test"
# Now attempt a suspend. It will freeze processes, wait, and thaw.
systemctl suspend
```
If this works, move to the next, more invasive test level: `devices`, then `platform`, then `processors`, and finally `core`. If the test fails at any level (e.g., the system hangs), you've found your culprit zone. For example, a failure at `devices` points squarely at a problematic driver.

### Step 2 – Check the Obvious: Kernel Parameters & Configuration
Often, the fix is a single boot parameter. One of the most common solutions for suspend-then-hibernate issues (especially unexpected early wakes) is to enable the ACPI alarm.

1.  Edit your bootloader config (e.g., `/etc/default/grub`) and add `rtc_cmos.use_acpi_alarm=1` to your `GRUB_CMDLINE_LINUX_DEFAULT` line.
2.  Update your bootloader (`sudo grub-mkconfig -o /boot/grub/grub.cfg` for GRUB) and reboot.

Also, verify your `/etc/systemd/sleep.conf` file. Key settings like `HibernateDelaySec` for suspend-then-hibernate or the chosen `SuspendState` can define success or failure.

### Step 3 – Interrogate the ACPI Wakeup List
Your system logs every device that can wake it. An overly permissive list is a classic cause of random wakes.
```bash
# View all wakeup-capable devices
cat /proc/acpi/wakeup
```
The output shows device names and whether they are enabled or disabled. Common offenders are `EHC1`, `EHC2` (USB controllers), `XHC` (USB 3.0), `LID0`, and `IGBE` (Ethernet). You can temporarily disable a suspect:
```bash
# Replace 'XHC' with your device name
sudo bash -c "echo XHC > /proc/acpi/wakeup"
```
If this fixes the random wakes, you can make the change permanent via a systemd service or a udev rule.

### Step 4 – Consult the System Journal – The Eyewitness
The system journal holds the definitive record of what went wrong. Filter it for the critical moments around sleep:
```bash
# View logs from the last sleep attempt
journalctl -b -0 --grep="suspend\|hibernate\|sleep\|PM:" | tail -50
# For deeper analysis, look at the full log from the previous boot
journalctl -b -1 | less
```
Search for clear errors like "failed to suspend", "Some devices failed to suspend", or "PM: suspend entry (deep)" lines that show where the process stalled. A user on the Arch forums found their system freezing on resume from suspend-then-hibernate only when waking after the `HibernateDelaySec` period, a clue found only in the journal.

Following these four steps will resolve a significant majority of "random" sleep issues. They move you from guessing to knowing.

## The Deep Dive: A Systematic Debugging Methodology
When the quick fixes don't yield answers, it's time to become a sleep state detective. This is a structured approach, moving from software to hardware.

### Phase 1: Isolating the Software Culprit
The goal is to determine if the issue is in userspace (systemd, desktop environment) or the kernel/driver level.

1.  **Test from a clean TTY:** Exit your desktop session (`Ctrl+Alt+F2`). Log in and attempt a suspend directly with `sudo systemctl suspend`. If sleep works perfectly from the TTY but fails from your graphical session, the problem is almost certainly a userspace service, your desktop environment, or a systemd user target interfering.
2.  **Debug systemd sleep targets:** Understand that `systemctl suspend` activates `systemd-suspend.service`, which runs executables in `/usr/lib/systemd/system-sleep/`. Scripts here can succeed or fail. Check for errors related to these scripts in your journal.
3.  **The acpid vs. systemd consideration:** The older `acpid` daemon and systemd's native sleep handling can conflict. If you have `acpid` installed, try disabling it (`sudo systemctl disable --now acpid`) and test if sleep becomes reliable. Most modern setups on Arch rely on systemd alone.

### Phase 2: Isolating the Hardware/Kernel Culprit
If sleep fails even from a clean TTY, the issue is deeper. Here, the kernel's `pm_test` facility is your best friend.

1.  **Conduct the tiered test.** As outlined in Step 1 above, systematically test each level: `freezer`, `devices`, `platform`, `processors`, `core`.
2.  **Freezer fails:** A userspace process won't freeze. Rare.
3.  **Devices fails:** This is the most common result. A kernel driver is failing to suspend or resume its device. The journal (`dmesg`) will often name it.
4.  **Platform/Processors fails:** Issues with ACPI or CPU management, often hardware-specific.
5.  **The "binary search" for a bad driver:** If the `devices` test fails, you need to find the offending driver.
    *   Reboot into a minimal state (no desktop, kill non-essential services).
    *   If sleep works, start enabling modules or services in halves until it breaks. This is tedious but definitive.
    *   Common offenders are proprietary GPU drivers (`nvidia`), some Wi-Fi drivers (like `mt7921e`), or unusual hardware modules.

### Phase 3: Advanced Hardware-Specific Sleuthing
Some bugs are tied to specific hardware or kernel versions.
*   **Check for regressions:** Search the Arch Forums or bug trackers for your laptop model or chipset (e.g., "Framework 13 AMD suspend" or "Surface Pro 7 hibernate"). You might find that a specific kernel version (like 6.8.1 in one case) introduced a bug and a rollback or a specific kernel parameter is the known fix.
*   **Test hibernation directly:** Hibernate failures often involve swap. Test the hibernation mechanism directly, bypassing systemd:
    ```bash
    # Ensure your swap partition is active
    sudo swapon --show
    # Tell the kernel to use the 'reboot' method for test
    sudo bash -c "echo reboot > /sys/power/disk"
    sudo bash -c "echo disk > /sys/power/state"
    ```
    If this fails, try the `platform` or `shutdown` methods. This can isolate filesystem or swap issues.
*   **Inspect the kernel log for ACPI errors:** As seen in one case, repeated errors like "ucsi_acpi ... GET_CABLE_PROPERTY failed" can indicate underlying firmware/ACPI issues that destabilize power management.

## The Pakistani Context: Stability as a Necessity
For us, a reliable laptop isn't a luxury; it's a lifeline. It's the device a student in Quetta uses to attend an online lecture, a freelancer in Islamabad uses to deliver work, or a writer in Lahore uses to craft their story amidst load-shedding. When suspend works, it preserves precious battery life during power cuts. When hibernate works, it safeguards hours of unsaved work. Debugging this isn't just technical tinkering; it's an act of creating resilience. It's about demanding that our tools, in environments that are often challenging, behave predictably and hold our work safe. This systematic approach to debugging—moving from the obvious to the complex—mirrors our own cultural approach to problem-solving: patient, thorough, and rooted in deep understanding.

## Building a Permanent, Stable Sleep Configuration
Once you've identified the fix, cement it. Here’s a stable configuration framework:

1.  **Essential /etc/systemd/sleep.conf.d/stable-sleep.conf:**
    ```ini
    [Sleep]
    # Use the modern 'deep' suspend state (S3) if supported
    SuspendState=mem
    # If using suspend-then-hibernate, set a clear delay (e.g., 1 hour)
    HibernateDelaySec=60min
    # Ensure hibernation uses the most reliable method for your hardware
    HibernateMode=platform
    ```
2.  **Systemd service to manage problematic wakeups** (`/etc/systemd/system/disable-wakeup.service`):
    ```ini
    [Unit]
    Description=Disable unwanted ACPI wakeups
    Before=sleep.target

    [Service]
    Type=oneshot
    ExecStart=/bin/sh -c "echo XHC > /proc/acpi/wakeup"
    ExecStart=/bin/sh -c "echo EHC1 > /proc/acpi/wakeup"
    RemainAfterExit=yes

    [Install]
    WantedBy=multi-user.target
    ```
    Enable it: `sudo systemctl enable disable-wakeup.service`
3.  **Kernel Parameters (/etc/default/grub):** Consolidate your fixes. It might look like:
    `GRUB_CMDLINE_LINUX_DEFAULT="quiet rtc_cmos.use_acpi_alarm=1 nvme.noacpi=1"`
    (The `nvme.noacpi` is an example of a disk-specific fix some need).

**Final Reflection: The Peace of Predictability**
Chasing down a random sleep bug is a pilgrimage through the layers of your computer. You start in the realm of user commands, descend into the kingdom of the systemd services, negotiate with the kernel drivers, and finally commune with the ACPI firmware of the hardware itself. Success is not just a working suspend. It's the profound peace of predictability. It's the confidence that when you close the lid, your faithful machine will rest, and when you open it, it will wake—every time, without drama.

May your diagnostics be sharp, your journal logs revealing, and your sleep deep and uninterrupted.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
