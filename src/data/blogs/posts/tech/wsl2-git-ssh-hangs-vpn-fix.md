---
title: "WSL2: Git Over SSH Hangs While VPN is Active – SSH Config and ProxyUseFdpass Tricks"
description: "Listen, I know why you're here. You connected to your corporate VPN, tried to do a simple git pull or git clone over SSH, and everything just... froze...."
date: "2026-01-22"
topic: "tech"
slug: "wsl2-git-ssh-hangs-vpn-fix"
---

Listen, I know why you're here. You connected to your corporate VPN, tried to do a simple git pull or git clone over SSH, and everything just... froze. The terminal cursor blinks mockingly. Minutes pass. Nothing happens. You're stuck in that special kind of tech limbo where you're not sure if you should wait longer or just give up.
I've been there, friend. Let me save you the hours of frustration.

## The Quick Fix (What You Need Right Now)
Here's the solution that actually works:

1.  **Edit your SSH config file:**

```bash
nano ~/.ssh/config
```

2.  **Add this configuration for GitHub/GitLab/Bitbucket:**

```
Host github.com
    HostName github.com
    User git
    ProxyCommand nc -X 5 -x your-proxy:port %h %p
    # OR if no proxy needed:
    IPQoS throughput
    
Host *
    IPQoS 0x00
```

3.  **The ProxyUseFdpass fix (if you're on Windows 11):**

```
Host *
    ProxyUseFdpass no
```

4.  **Test immediately:**

```bash
ssh -T git@github.com
```
If you see "Hi [username]! You've successfully authenticated" – you're golden. But stay with me, because understanding why this happens will save you future headaches.

---

## Why Does VPN Break Git SSH in WSL2?
Picture this: your data is a letter trying to reach its destination. Without VPN, it travels a direct route. With VPN, it goes through a secure tunnel. Sounds simple, right? But WSL2 sits in a peculiar place—it's Linux running inside a Windows virtual machine, and when you activate a VPN on Windows, the networking layers get... complicated.
Here's what's actually happening:

**The Network Sandwich Problem**
Your SSH connection travels through multiple layers:
1.  Your WSL2 Linux environment
2.  The WSL2 virtual network adapter
3.  Your Windows host network stack
4.  Your VPN tunnel
5.  Finally, out to the internet
Each layer has its own rules about packet handling, routing, and Quality of Service (QoS) settings. When they disagree, your SSH connection hangs like a car stuck in bureaucratic red tape.

**The IPQoS Issue**
SSH by default tries to mark packets with Quality of Service flags to prioritize certain traffic. Noble intention. But VPNs—especially corporate ones—often strip or reject these QoS markings for security reasons. Your SSH client sends a packet, the VPN says "what's this fancy flag?", drops it, and your connection waits forever for a response that will never come.

**The ProxyUseFdpass Windows 11 Bug**
Windows 11 introduced a change in how it handles file descriptor passing in SSH connections through WSL2. The `ProxyUseFdpass` feature, which is supposed to improve performance, actually causes SSH to hang when VPN is active. It's one of those "improvements" that makes things worse—like adding a spoiler to a bicycle.

---

## The Complete Solution: Step-by-Step Deep Dive
Let me walk you through this properly, the way someone should have explained it to me when I first hit this wall at 2 AM during a deployment.

**Step 1: Understanding Your SSH Config File**
The SSH config file lives at `~/.ssh/config` in your WSL2 home directory. This file is like a rulebook that tells SSH how to behave with different servers. If it doesn't exist, we'll create it.
Open your WSL2 terminal and run:
```bash
ls -la ~/.ssh/
```
If you see a config file, great. If not, don't worry—we're creating one.

**Step 2: Creating a Robust SSH Configuration**
Let's build this systematically. Open the config file:
```bash
nano ~/.ssh/config
```
Here's a comprehensive configuration that handles the most common scenarios:
```
# Fix for VPN-related SSH hangs
Host *
    IPQoS 0x00
    ProxyUseFdpass no
    ServerAliveInterval 60
    ServerAliveCountMax 3

# GitHub configuration
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_rsa
    IPQoS throughput
    TCPKeepAlive yes

# GitLab configuration  
Host gitlab.com
    HostName gitlab.com
    User git
    IdentityFile ~/.ssh/id_rsa
    IPQoS throughput
    TCPKeepAlive yes

# Bitbucket configuration
Host bitbucket.org
    HostName bitbucket.org
    User git
    IdentityFile ~/.ssh/id_rsa
    IPQoS throughput
    TCPKeepAlive yes
```
Let me break down what each setting does:
*   `IPQoS 0x00`: Disables Quality of Service packet marking entirely. It's like removing the "priority mail" sticker that keeps getting rejected.
*   `ProxyUseFdpass no`: Disables the file descriptor passing feature that causes hangs on Windows 11.
*   `ServerAliveInterval 60`: Sends a keepalive packet every 60 seconds to prevent connection timeout.
*   `ServerAliveCountMax 3`: Allows 3 failed keepalive attempts before closing the connection.
*   `TCPKeepAlive yes`: Enables TCP-level keepalive packets as an additional safety net.
*   `IdentityFile`: Points to your SSH private key (adjust the path if yours is different).
Save the file (Ctrl+O, Enter, Ctrl+X in nano).

**Step 3: Setting Proper Permissions**
SSH is paranoid about security (rightfully so). If your config file has loose permissions, SSH will refuse to use it:
```bash
chmod 600 ~/.ssh/config
```
This makes the file readable and writable only by you—no one else.

**Step 4: Testing Your Configuration**
Don't just assume it works. Test it:
```bash
ssh -T git@github.com
```
For GitLab:
```bash
ssh -T git@gitlab.com
```
For Bitbucket:
```bash
ssh -T git@bitbucket.org
```
You should see an authentication success message. If you get a timeout, we need to dig deeper.

---

## Advanced Troubleshooting: When Basic Fixes Don't Work
Sometimes the problem runs deeper. Here are the advanced techniques I've learned through trial, error, and many cups of chai.

**Using ProxyCommand with Corporate Proxies**
If your corporate network requires an HTTP/SOCKS proxy, you'll need to route SSH through it:
```
Host github.com
    ProxyCommand nc -X connect -x proxy.company.com:8080 %h %p
```
Or for SOCKS5 proxies:
```
Host github.com
    ProxyCommand nc -X 5 -x proxy.company.com:1080 %h %p
```
Replace `proxy.company.com:8080` with your actual proxy address.
Don't have nc (netcat)? Install it:
```bash
sudo apt update && sudo apt install netcat-openbsd
```

**The corkscrew Alternative**
For HTTP proxies, `corkscrew` is sometimes more reliable:
```bash
sudo apt install corkscrew
```
Then in your SSH config:
```
Host github.com
    ProxyCommand corkscrew proxy.company.com 8080 %h %p
```

**Debugging with Verbose SSH Output**
When nothing makes sense, verbose mode reveals the truth:
```bash
ssh -vvv git@github.com
```
The triple `-v` gives you maximum verbosity. Look for:
*   "Connection timed out" → routing issue
*   "Connection reset by peer" → firewall blocking
*   Stuck at "expecting SSH2_MSG_KEX_ECDH_REPLY" → QoS/VPN issue

**Windows Firewall and WSL2**
Sometimes Windows Firewall blocks WSL2's outbound SSH. Check:
1.  Open Windows Security
2.  Go to Firewall & Network Protection
3.  Click "Allow an app through firewall"
4.  Look for "WSL" or your specific Linux distribution
5.  Ensure both Private and Public are checked

**The Nuclear Option: Changing MTU**
Maximum Transmission Unit (MTU) mismatches can cause mysterious hangs. If all else fails:
```bash
sudo ip link set dev eth0 mtu 1400
```
This reduces packet size to avoid fragmentation issues. Test if it helps, then make it permanent by adding to `/etc/wsl.conf`:
```ini
[network]
generateResolvConf = false

[boot]
command = ip link set dev eth0 mtu 1400
```

---

## Understanding VPN Types and Their Impact
Not all VPNs are created equal. The solution that works depends on what type you're dealing with.
*   **Split-Tunnel VPNs:** These route only corporate traffic through the VPN, letting other traffic go direct. Usually the least problematic. The SSH config tweaks above typically solve any issues.
*   **Full-Tunnel VPNs:** Everything goes through the VPN. More problematic because of stricter packet inspection, QoS stripping, and potential DNS hijacking. For these, you definitely need `IPQoS 0x00` and possibly proxy commands.
*   **WireGuard/Modern VPNs:** Generally well-behaved. If you're using WireGuard and still have issues, the problem is likely Windows-side, not the VPN itself.
*   **Legacy Corporate VPNs (Cisco AnyConnect, Pulse Secure):** The worst offenders. They aggressively manage networking and often conflict with WSL2. You'll likely need the full suite of fixes: IPQoS tweaks, ProxyUseFdpass disabled, and possibly MTU adjustments.

---

## Git-Specific Configurations
Beyond SSH config, Git itself has settings that can help:
```bash
# Increase Git's network timeout
git config --global http.postBuffer 524288000

# Use SSH instead of HTTPS for all GitHub repos
git config --global url."git@github.com:".insteadOf "https://github.com/"

# Enable keepalive in Git's SSH
git config --global core.sshCommand "ssh -o ServerAliveInterval=60"
```

## A Real Story from the Trenches
Last winter, I was collaborating with a team in Karachi on a time-sensitive project. I'd connected to the client's VPN, and suddenly every Git operation hung. Pull, push, clone—nothing worked. Deadlines looming, pressure mounting.
I spent three hours trying different solutions. Reinstalled Git. Reinstalled WSL2. Regenerated SSH keys. Nothing worked. Then I found a small mention of `ProxyUseFdpass` in an obscure GitHub issue. Added that one line to my SSH config.
Instant fix.
That's when I learned: sometimes the solution isn't about working harder, it's about knowing the right incantation. Consider this article your spellbook.

*By Huzi from huzi.pk*

---

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
