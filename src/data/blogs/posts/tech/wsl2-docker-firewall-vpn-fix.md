---
title: "WSL2: Windows Firewall Blocks Docker from WSL2 When VPN is On – Rules That Actually Work"
description: "Brother, sister—I feel your pain. You've got Docker running beautifully in WSL2. Everything works. Then you connect to your VPN for work, and suddenly..."
date: "2026-01-22"
topic: "tech"
slug: "wsl2-docker-firewall-vpn-fix"
---

Brother, sister—I feel your pain. You've got Docker running beautifully in WSL2. Everything works. Then you connect to your VPN for work, and suddenly Docker can't pull images, containers can't reach the internet, and your entire development workflow grinds to a halt. The error messages mock you: "network timeout," "connection refused," "TLS handshake timeout."
I've lost count of how many times I've seen developers reinstall Docker, reset WSL2, or worse—disable their firewall entirely (please don't do that). Let me save you the trouble and give you solutions that actually work.

## The Quick Fix (What You Need Right Now)
Here are the Windows Firewall rules that will solve this:

1.  **Open Windows Defender Firewall with Advanced Security** (search for it in Start menu)
2.  **Create an Inbound Rule:**
    *   Right-click "Inbound Rules" → New Rule
    *   Rule Type: **Custom**
    *   Program: **All programs**
    *   Protocol: **TCP**
    *   Scope → Remote IP: `172.16.0.0/12` (WSL2 range)
    *   Action: **Allow the connection**
    *   Profile: Check all (Domain, Private, Public)
    *   Name: "WSL2 Docker - Inbound"

3.  **Create an Outbound Rule:**
    *   Right-click "Outbound Rules" → New Rule
    *   Same settings as above
    *   Name: "WSL2 Docker - Outbound"

4.  **Add vEthernet (WSL) to VPN exceptions:**
    *   In your VPN client settings, exclude the vEthernet (WSL) adapter from VPN routing

5.  **Restart WSL2:**
```powershell
wsl --shutdown
```

6.  **Test immediately with:**
```bash
docker run hello-world
docker pull nginx:latest
```
If these work, you're back in business. But understanding why this happens will prevent future headaches, so stay with me.

---

## Why Does VPN Break Docker in WSL2?
Imagine you're sending a package across Pakistan. Normally, it goes from Sialkot to Karachi via the direct highway. But when you enable a VPN, it's like forcing that package through a checkpoint in Islamabad first—except the checkpoint doesn't recognize packages from certain neighborhoods (WSL2, in this case).
Here's the technical reality:

**The Network Identity Crisis**
WSL2 runs in a Hyper-V virtual machine with its own virtual network adapter called vEthernet (WSL). When you activate a VPN on Windows:
*   Your VPN client takes control of network routing
*   Windows Firewall re-evaluates all connections through the VPN lens
*   The VPN sees traffic from WSL2's virtual adapter as "external" or "untrusted"
*   Windows Firewall blocks it by default, thinking it's protecting you
Docker containers inside WSL2 try to reach the internet → WSL2 virtual adapter → Windows host → VPN tunnel → Internet. But Windows Firewall intercepts at stage 3 and says "Not so fast, I don't recognize this source."

**The Trust Problem**
Windows Firewall has three network profiles: Domain, Private, and Public. When you connect to a VPN, Windows often switches the active network profile. The firewall rules that worked on your "Private" home network don't apply to the new "Domain" (corporate VPN) network. Your WSL2 traffic suddenly has no permission to pass.

---

## The Complete Solution: Step-by-Step Deep Dive
Let me guide you through this like I'm sitting next to you with chai in hand, fixing this together.

**Step 1: Understanding Windows Firewall Architecture**
Windows Defender Firewall isn't just one thing—it's a sophisticated gatekeeper with separate rules for:
*   Inbound connections (traffic coming TO your machine)
*   Outbound connections (traffic going FROM your machine)
*   Different network profiles (Domain, Private, Public)
For Docker in WSL2 to work with VPN, you need rules that:
*   Allow traffic from WSL2's IP range (`172.16.0.0/12`)
*   Apply across all network profiles
*   Cover both inbound and outbound directions

**Step 2: Creating Proper Firewall Rules (The Right Way)**
Open PowerShell as Administrator and run these commands:
```powershell
# Inbound rule for WSL2 Docker
New-NetFirewallRule -DisplayName "WSL2 Docker - Inbound" -Direction Inbound -LocalPort Any -Protocol TCP -Action Allow -RemoteAddress 172.16.0.0/12 -Profile Any

# Outbound rule for WSL2 Docker
New-NetFirewallRule -DisplayName "WSL2 Docker - Outbound" -Direction Outbound -LocalPort Any -Protocol TCP -Action Allow -RemoteAddress 172.16.0.0/12 -Profile Any

# UDP traffic (for DNS and other services)
New-NetFirewallRule -DisplayName "WSL2 Docker UDP - Inbound" -Direction Inbound -LocalPort Any -Protocol UDP -Action Allow -RemoteAddress 172.16.0.0/12 -Profile Any

New-NetFirewallRule -DisplayName "WSL2 Docker UDP - Outbound" -Direction Outbound -LocalPort Any -Protocol UDP -Action Allow -RemoteAddress 172.16.0.0/12 -Profile Any
```
What these commands do:
*   `-DisplayName`: The name you'll see in Firewall settings
*   `-Direction`: Inbound or Outbound traffic
*   `-Protocol`: TCP or UDP
*   `-RemoteAddress 172.16.0.0/12`: The entire WSL2 IP range (this is crucial—WSL2's IP changes on each restart)
*   `-Profile Any`: Applies to Domain, Private, AND Public networks
*   `-Action Allow`: Permits the traffic

**Step 3: Finding WSL2's Actual IP Range**
Sometimes the default range isn't what you need. To verify WSL2's actual subnet:
```bash
# In WSL2
ip addr show eth0
```
Look for the `inet` line, something like `172.24.208.1/20`. The `/20` or `/12` indicates the subnet size.
Or from Windows PowerShell:
```powershell
Get-NetIPAddress -InterfaceAlias "vEthernet (WSL)" | Select-Object IPAddress, PrefixLength
```
If you find a different range, adjust your firewall rules accordingly.

**Step 4: VPN Client Configuration**
This is where many people stumble. Your VPN client itself needs to play nice with WSL2.
*   **For Cisco AnyConnect:** Edit the `AnyConnectLocalPolicy.xml` (usually in `C:\ProgramData\Cisco\Cisco AnyConnect Secure Mobility Client\`) and add `<ExcludeVirtualSubnetworks>true</ExcludeVirtualSubnetworks>`.
*   **For OpenVPN:** Add `route-nopull` and route commands (`route 0.0.0.0 128.0.0.0`) to create a split-tunnel.
*   **For WireGuard:** Adjust `AllowedIPs` to exclude WSL2's range.

**Step 5: Configuring Docker Daemon in WSL2**
Sometimes Docker's daemon needs explicit DNS configuration. Edit Docker's `daemon.json`:
```bash
sudo nano /etc/docker/daemon.json
```
Add:
```json
{
  "dns": ["8.8.8.8", "8.8.4.4"],
  "mtu": 1400,
  "default-address-pools": [
    {
      "base": "172.17.0.0/16",
      "size": 24
    }
  ]
}
```
Why these settings:
*   `dns`: Ensures Docker uses Google DNS instead of your VPN's potentially broken DNS
*   `mtu`: Reduces packet size to prevent fragmentation issues through VPN
*   `default-address-pools`: Prevents Docker's network range from conflicting with VPN ranges
Restart Docker:
```bash
sudo service docker restart
```

**Step 6: Windows Route Table Adjustments**
Sometimes you need to explicitly tell Windows to route WSL2 traffic locally, not through VPN.
Open PowerShell as Administrator:
```powershell
# Find WSL2's IP
wsl hostname -I

# Add a persistent route (replace IP with yours)
route add 172.16.0.0 mask 255.240.0.0 172.24.208.1 -p
```
The `-p` makes it persistent across reboots.

---

## Advanced Troubleshooting: When Standard Fixes Fail
I've encountered edge cases that break every textbook solution. Here's what I've learned from the battlefield.

**The Hyper-V Network Reset**
Sometimes the vEthernet (WSL) adapter gets corrupted:
```powershell
wsl --shutdown
Get-NetAdapter "vEthernet (WSL)" | Disable-NetAdapter
Get-NetAdapter "vEthernet (WSL)" | Enable-NetAdapter
wsl
```

**Disabling Windows Firewall for WSL2 Adapter Only**
If you can't get rules working but need a quick fix (use cautiously):
```powershell
Set-NetFirewallProfile -Name Private -Enabled False -InterfaceAlias "vEthernet (WSL)"
```

**The .wslconfig MTU Fix**
Create/edit `C:\Users\YourUsername\.wslconfig`:
```ini
[wsl2]
networkingMode=mirrored
dnsTunneling=true
firewall=true
autoProxy=true
```
This uses WSL2's newer "mirrored" networking mode (requires Windows 11 22H2+), which often bypasses VPN conflicts entirely.

**Checking What's Actually Blocking**
Enable Windows Firewall logging and check `pfirewall.log` for dropped packets from WSL2's IP. This is the definitive way to know if firewall rules are the culprit.

---

## Understanding Different VPN Behaviors
*   **Split-Tunnel VPNs:** Usually cooperative. Main issue is ensuring WSL2 traffic isn't routed through the tunnel. Fix: Add WSL2's IP range to VPN's excluded routes.
*   **Full-Tunnel VPNs:** Strict gatekeepers. Everything goes through VPN. Fix: Firewall rules + Docker daemon DNS + MTU tweaks.
*   **Corporate VPNs with DPI:** Deep Packet Inspection can block Docker Hub. Fix: Request IT to whitelist Docker Hub IPs, or use a corporate registry.

## A Story from My Own Battles
Three months ago, I was building a microservices platform for a client in Lahore. Tight deadline. Everything tested locally. Then I connected to their VPN for deployment access and boom—Docker containers couldn't reach their database endpoints.
I spent an entire evening trying solutions from StackOverflow. Disabled firewall (bad idea, re-enabled quickly). Reinstalled Docker three times. Cursed at WSL2. Questioned my career choices.
Finally, at 1 AM, caffeinated beyond reason, I checked the Windows Firewall logs. There it was: every single Docker container request being blocked because the VPN changed my network profile from "Private" to "Domain," and my firewall rules only applied to "Private."
One PowerShell command to recreate rules with `-Profile Any` and everything worked.
The lesson? Logs don't lie. Assumptions do.

*By Huzi from huzi.pk*

---

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
