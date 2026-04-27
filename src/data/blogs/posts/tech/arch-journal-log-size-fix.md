---
title: "Arch: /var/log/journal Grows Insanely Huge and Fills My Root – Logrotate vs journald.conf Tweaks"
description: "Fix /var/log/journal filling up your disk on Arch Linux. Learn to configure journald.conf limits or use logrotate to manage system logs."
date: "2026-01-24"
topic: "tech"
slug: "arch-journal-log-size-fix"
---

# Arch: /var/log/journal Grows Insanely Huge and Fills My Root – Logrotate vs journald.conf Tweaks

**There is a quiet, invisible force in your Arch system that watches everything.** Every service started, every error logged, every user login. It’s the systemd journal, a meticulous chronicler of your digital life. But left unchecked, this faithful scribe can turn into a hoarder. One day, you run a routine command and see the terrifying red warning: `/: 99% FULL`. Your root partition is on the brink. A quick `du -sh /var/log/journal` reveals the culprit—a directory consuming tens of gigabytes, a hidden cache of millions of log entries silently choking your drive.

This was my reality. My sleek, minimal Arch machine brought to its knees not by a complex crash, but by the sheer weight of its own memory. The panic is real; you can't install packages, you can't even save files. But the solution, I learned, is about teaching your chronicler the art of letting go.

## The Emergency Fix: Reclaim Your Root Space NOW
If your system is screaming about no space left on device, here’s your immediate action plan. Breathe. We will fix this.

**The Problem:** The `/var/log/journal` directory, where systemd stores its binary logs, has grown unchecked and consumed all available space on your root (`/`) partition.

**The Immediate, Safe Clean-Up:**

1.  **See the true size.** Open a terminal and run:
    ```bash
    sudo journalctl --disk-usage
    ```
    This shows you precisely how much space the active journals are using. Seeing "10G" or more is common.

2.  **Clear logs older than a specific time.** This is the safest, most controlled method. To remove archives older than, say, 2 days:
    ```bash
    sudo journalctl --vacuum-time=2d
    ```
    Alternatively, to keep only the last, say, 500 megabytes of logs:
    ```bash
    sudo journalctl --vacuum-size=500M
    ```
    Start with one of these. Instantly, you will see space freed.

3.  **For a scorched-earth, immediate-space recovery** (if the above isn't enough and you're in crisis), you can delete all archived logs and keep only the current active files. Use with caution, but it's safe:
    ```bash
    sudo journalctl --vacuum-files=1
    ```
    This tells systemd to keep only 1 active journal file per unit, deleting all older rotated files.

4.  **Verify your success.** Run `df -h /` again. You should see a significant percentage of space reclaimed. Your system is now operational.

⚠️ **Critical Note:** DO NOT just `rm -rf /var/log/journal/`. This can cause corruption and disrupt logging for running services. Always use the `journalctl --vacuum-*` commands. They are the proper tool.

Now that you can breathe again, let's build a system so this never happens again.

## The Philosophy: Why Does This Happen?
By default, `systemd-journald` is configured for maximum reliability, not storage management. On a stable system, logs are tiny. But when a service misbehaves and spams errors, or if you never restart and let the journal run for years, it grows. It's a testament to Arch's stability that for many, the first sign is a full disk, not a system crash.

The solution lies in one of two paths: configuring the journal itself or employing the classic `logrotate` tool. The Arch way is to use the native tool—`journald.conf`.

## The Permanent Solution: Configuring journald.conf
This is the preferred, integrated method. You're speaking directly to the journal in its own language.

The configuration file is at `/etc/systemd/journald.conf`. You'll see it's heavily commented. We edit it to set limits.

**Step-by-Step Configuration:**

1.  Open the file with your preferred editor (with sudo):
    ```bash
    sudo nano /etc/systemd/journald.conf
    ```
2.  Uncomment and modify the following key lines. Here are my recommended, sensible defaults:
    ```ini
    [Journal]
    # Store logs on disk (persist across reboots). Set to "volatile" for RAM-only.
    Storage=persistent

    # THE MOST IMPORTANT SETTING: Maximum disk space the journal can use.
    SystemMaxUse=2G
    # Maximum disk space for journals from the current boot only.
    RuntimeMaxUse=1G

    # Maximum age of stored entries. Old logs are deleted.
    MaxRetentionSec=1month
    # Or use time format: MaxRetentionSec=30day

    # Maximum size of individual journal files before they are rotated.
    SystemMaxFileSize=100M

    # Whether to compress old journal files. "yes" is highly recommended.
    Compress=yes
    ```
3.  Save the file and restart the journal daemon for changes to take effect:
    ```bash
    sudo systemctl restart systemd-journald
    ```

**How This Works:** The journal now auto-manages itself. When the total size nears `SystemMaxUse=2G`, it will automatically delete the oldest archived log files (.journal files) to stay under the limit. It's a self-cleaning chronicle.

## The Alternative Classic: Using logrotate (The Fallback)
Some prefer the traditional `logrotate` tool, especially if they are managing logs from other non-journald services in a unified way. While `journald.conf` is more elegant, `logrotate` offers extreme granularity.

**Setting up logrotate for the journal:**

1.  Install logrotate if it's not already (it often is):
    ```bash
    sudo pacman -S logrotate
    ```
2.  Create a custom configuration file for the journal. Do not edit the main `logrotate.conf`.
    ```bash
    sudo nano /etc/logrotate.d/systemd-journal
    ```
3.  Paste a configuration like this:
    ```bash
    /var/log/journal/*/*.journal {
        # Rotate when the file reaches 100M
        size 100M
        # Keep only 5 old rotated files (e.g., journal@*.journal~)
        rotate 5
        # Don't error if the file is missing
        missingok
        # Delay compression until the next rotation cycle
        delaycompress
        # Use bzip2 for high compression
        compress
        # Run the sharedscripts block only once for all matched files
        sharedscripts
        # Send SIGUSR1 to systemd-journald to tell it to switch to a new file
        postrotate
            /bin/systemctl kill --signal=SIGUSR1 systemd-journald 2>/dev/null || true
        endscript
    }
    ```
4.  Test your configuration:
    ```bash
    sudo logrotate -d /etc/logrotate.d/systemd-journal
    ```
    The `-d` flag is a dry-run; it shows what it would do.

⚠️ **A Word of Caution:** Running both `journald.conf` limits and `logrotate` can sometimes conflict. It's generally best to choose one method. For pure Arch systems, `journald.conf` is the canonical, simpler solution.

## The Pakistani Context: The Wisdom of Pruning
In our homes and gardens, we understand maintenance. We prune the rose bush so it flowers more beautifully. We clean the water tank to ensure a pure supply. Managing logs is no different—it's digital *safai* (cleanliness). On our often-limited storage (not everyone has a 1TB SSD), this isn't just sysadmin work; it's essential digital hygiene. It ensures our machines, crucial for work, study, and connection, run smoothly and predictably.

Letting logs overrun is like letting clutter fill a room; eventually, you can't move. The solution is a simple, automated habit.

## Verification and Final Thoughts
After setting up `journald.conf`, monitor it over the next few weeks:
```bash
# Check disk usage occasionally
sudo journalctl --disk-usage
# See how many journal files exist
sudo ls -lh /var/log/journal/$(cat /etc/machine-id)/
```
You should see the size stable, hovering near your `SystemMaxUse` limit, with old `.journal~` files being automatically cleaned up.

Remember, logs are a tool for debugging, not a historical archive. Their purpose is to help you diagnose problems that happened in the recent past. Keeping a sensible, automated retention policy is the mark of a well-administered system. It grants you peace of mind, ensuring that your system's memory serves you, not the other way around.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
