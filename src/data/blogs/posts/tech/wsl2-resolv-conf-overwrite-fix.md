---
title: "WSL2: Windows resolv.conf Keeps Overwriting My DNS Nameservers – Turning Off Auto Generation Properly"
description: "Friend, if you've landed here, I know exactly what brought you: frustration. You've carefully edited your `/etc/resolv.conf` file in WSL2, added your..."
date: "2026-01-22"
topic: "tech"
slug: "wsl2-resolv-conf-overwrite-fix"
---

Friend, if you've landed here, I know exactly what brought you: frustration. You've carefully edited your `/etc/resolv.conf` file in WSL2, added your custom DNS nameservers, saved it with hope in your heart—and then, like sand slipping through your fingers, WSL2 overwrote everything the moment you restarted. I've been there. Let me walk you through this, not just as a guide, but as someone who's fought this same battle.

## The Quick Fix (What You Came For)
Here's what you need to do right now:

1.  **Stop WSL2 from auto-generating resolv.conf by creating/editing `/etc/wsl.conf`:**

```ini
[network]
generateResolvConf = false
```

2.  **Shut down WSL2 completely from PowerShell/CMD:**

```powershell
wsl --shutdown
```

3.  **Delete the auto-generated resolv.conf and create your own:**

```bash
sudo rm /etc/resolv.conf
sudo nano /etc/resolv.conf
```

4.  **Add your custom DNS nameservers:**

```
nameserver 8.8.8.8
nameserver 8.8.4.4
```

5.  **Restart WSL2 and verify with** `cat /etc/resolv.conf`

There. That's the solution that will save you hours of hair-pulling. But stay with me—there's more beneath the surface that you should understand.

---

## Why Does WSL2 Keep Overwriting resolv.conf?
Think of WSL2 as a well-meaning but overly helpful guest. Microsoft designed it to automatically manage your DNS configuration, believing it knows best. Every time WSL2 starts, it reads your Windows network settings and generates a fresh `/etc/resolv.conf` file based on what it finds there.
This behavior exists because WSL2 runs in a lightweight virtual machine with its own networking stack. Windows tries to bridge the gap between your host OS and the Linux subsystem by automatically configuring DNS to match your Windows network adapter settings. Noble intention, frustrating execution.
**The problem? You lose control.**
If you're running Docker containers, setting up development environments with specific DNS requirements, using custom DNS servers for privacy (like Cloudflare's 1.1.1.1 or Quad9), or working in corporate networks with internal DNS servers—WSL2's auto-generation becomes a roadblock, not a feature.

---

## The Complete Solution: Step-by-Step Deep Dive
Let me walk you through this properly, the way I wish someone had explained it to me.

**Step 1: Understanding wsl.conf**
The `/etc/wsl.conf` file is your gateway to controlling WSL2's behavior. It's a configuration file that WSL2 reads on startup to determine various system settings. Think of it as the constitution of your WSL2 instance—it sets the rules that everything else must follow.
If this file doesn't exist yet (and in many fresh installations, it won't), you'll need to create it.

**Step 2: Disabling Auto-Generation**
Open your WSL2 terminal and execute:
```bash
sudo nano /etc/wsl.conf
```
If the file is empty or doesn't exist, add these lines:
```ini
[network]
generateResolvConf = false
```
What this does: It tells WSL2, "Thank you, but I'll handle my own DNS configuration from here."
Save the file (Ctrl+O, then Enter, then Ctrl+X if using nano).

**Step 3: The Full Shutdown**
This is critical—don't just close your terminal window. WSL2 needs a complete restart for the `wsl.conf` changes to take effect.
Open PowerShell or Command Prompt on Windows and run:
```powershell
wsl --shutdown
```
This command terminates all running WSL2 distributions and the WSL2 virtual machine itself. Wait about 8-10 seconds before reopening WSL2.

**Step 4: Taking Control of resolv.conf**
Now reopen your WSL2 terminal. The old, auto-generated `/etc/resolv.conf` is likely still there, but it won't be regenerated anymore. Let's clean house:
```bash
sudo rm /etc/resolv.conf
```
Create your own from scratch:
```bash
sudo nano /etc/resolv.conf
```
Now add your preferred DNS nameservers. Here are some popular options:
**Google DNS:**
```
nameserver 8.8.8.8
nameserver 8.8.4.4
```
**Cloudflare (privacy-focused):**
```
nameserver 1.1.1.1
nameserver 1.0.0.1
```
**Quad9 (security-focused):**
```
nameserver 9.9.9.9
nameserver 149.112.112.112
```
**Your custom/corporate DNS:**
```
nameserver 192.168.1.1
nameserver 10.0.0.1
```
You can add multiple nameservers—Linux will try them in order if one fails.
Save and exit.

**Step 5: Verification**
Always verify your work:
```bash
cat /etc/resolv.conf
```
You should see exactly what you typed, no extra comments or auto-generated entries.
Test DNS resolution:
```bash
nslookup google.com
ping google.com
```
If these work, congratulations—you've reclaimed control.

---

## Advanced Configurations and Troubleshooting

**Making resolv.conf Immutable (Nuclear Option)**
If for some reason your resolv.conf still gets modified (perhaps by another service), you can make it immutable:
```bash
sudo chattr +i /etc/resolv.conf
```
This sets the immutable flag, preventing any modification—even by root—until you remove it with:
```bash
sudo chattr -i /etc/resolv.conf
```
Use this carefully. It's like welding a door shut; effective, but inflexible.

**Understanding Other wsl.conf Options**
While we're here, let me share other useful `wsl.conf` configurations:
```ini
[boot]
systemd=true

[network]
generateResolvConf = false
generateHosts = false

[interop]
enabled = true
appendWindowsPath = true

[user]
default = yourUsername
```
These settings give you control over systemd, host file generation, Windows interoperability, and default user settings.

**When DNS Still Doesn't Work**
Sometimes the issue isn't resolv.conf at all. If you're still having problems:
*   **Check Windows firewall:** It might be blocking DNS queries from WSL2.
*   **Verify your Windows DNS settings:** Go to Network Adapter settings and check what DNS servers Windows itself is using.
*   **Try a different nameserver:** Your ISP or network might be blocking certain DNS providers.
*   **Check for VPN interference:** VPNs often override DNS settings. You may need to configure split-tunneling or adjust VPN DNS settings.

---

## Why This Matters (Beyond the Technical)
You might think this is just a small technical annoyance. But control over your DNS is control over your internet experience. DNS is the phonebook of the internet—it translates human-readable addresses into IP addresses. By choosing your own DNS servers, you can:
*   Enhance privacy by avoiding ISP tracking
*   Improve speed with faster DNS resolvers
*   Increase security with DNS providers that block malicious sites
*   Access geo-restricted content in some cases
*   Maintain development environment consistency

For developers like us working in WSL2, DNS consistency isn't luxury—it's necessity. Containers, microservices, API calls, package managers—they all depend on reliable DNS resolution.

## A Personal Reflection
I remember the first time I encountered this issue. It was 3 AM, I was deploying a project with a tight deadline, and my Docker containers couldn't resolve external APIs because WSL2 kept reverting to a faulty DNS server. The frustration was real. But solving it taught me something valuable: sometimes you need to tell your tools, "I appreciate the help, but I've got this."
Technology should serve you, not the other way around.

*By Huzi from huzi.pk*

---

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
