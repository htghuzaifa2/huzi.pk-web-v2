---
title: "WSL2: Accessing Windows Localhost from Inside WSL2 After VPN Connects – IP and Firewall Quirks"
description: "The Problem: Why Does WSL2 Break After VPN Connects? You've just connected your VPN on Windows, everything works perfectly, and then you try to reach..."
date: "2026-01-22"
topic: "tech"
slug: "wsl2-localhost-access-vpn-fix"
---

The Problem: Why Does WSL2 Break After VPN Connects?
You've just connected your VPN on Windows, everything works perfectly, and then you try to reach your local development server from inside WSL2—nothing. It's one of the most frustrating moments for developers working with WSL2 in corporate environments or when using VPN security solutions. The localhost server that was accessible minutes ago is now completely unreachable from your Linux terminal.
Here's what's happening: WSL2 doesn't operate like WSL1. Instead of translating Linux system calls to Windows, WSL2 runs as a lightweight virtual machine with its own virtualized Ethernet adapter and separate network stack. When a VPN connects, it completely changes Windows' routing table, but WSL2's isolated network often conflicts with the VPN's IP addressing scheme. The VPN routes all traffic through itself, and WSL2 gets left behind—unable to reach the Windows host's localhost or any VPN-protected resources.
This guide covers everything you need to know: from understanding why this happens, to the practical fixes that actually work in 2025.

## Quick Solutions (TL;DR)
Before diving into the details, here are the fastest fixes:

1.  **Use Windows 11 22H2+ with Mirrored Networking Mode** – The easiest modern solution
2.  **Enable DNS Tunneling** – Fixes DNS resolution when VPN is active
3.  **Use host.docker.internal instead of localhost** – Quick workaround
4.  **Modify .wslconfig with NAT settings** – For persistent configuration
5.  **Adjust Windows Firewall rules** – Allow WSL2 subnet through firewall
6.  **Change network interface metrics** – Advanced routing fix for stubborn VPN solutions

---

## Understanding WSL2's Network Architecture
WSL2 is fundamentally different from WSL1 in how it handles networking. WSL1 integrates directly with Windows' network stack, while WSL2 runs in its own virtualized environment with a dedicated Hyper-V virtual switch.
Key differences:
When you run WSL2, it gets assigned a virtual IP address (typically in the 172.17.x.x range) separate from your Windows host. The Windows host also has its own IP. For WSL2 to reach Windows services, it needs to route through the virtual network adapter, not use localhost.
By default, WSL2 uses Network Address Translation (NAT), which creates a buffer between your Linux environment and the Windows host. This is secure but causes complications when VPNs enter the picture. VPNs typically use specific IP address ranges (often the same ranges as WSL2), causing a routing conflict. The VPN's routing rules take precedence, and WSL2 can't find its way to the Windows host anymore.
Additionally, WSL2 traffic completely bypasses the Windows Defender Firewall—something many developers don't realize. This means firewall rules on the Windows side don't apply to WSL2 traffic directly, but the Hyper-V firewall (on Windows 11 22H2+) does apply.

---

## Solution 1: Enable Mirrored Networking Mode (Windows 11 22H2+)
This is the gold standard solution for modern Windows systems. Mirrored networking mode allows both Windows and WSL2 to use the same network interface, effectively making them network-equal peers.
**What it does:**

*   Bidirectional localhost access (127.0.0.1 works both ways)
*   Native IPv6 support
*   VPN compatibility improvements
*   Direct local network access from WSL2
*   Automatic Windows host IP resolution

**How to enable it:**

1.  Open the WSL Settings app from your Start menu (search for "WSL Settings")
2.  Navigate to the Networking tab on the left
3.  Toggle Networking mode to Mirrored
4.  Close the app and restart WSL2 by opening PowerShell and running:

```powershell
wsl --shutdown
```

After restart, test accessing a Windows localhost service from WSL2:
```bash
# From inside WSL2
curl http://localhost:8000
```
This should work immediately. If your Windows application is listening on 127.0.0.1:8000, it's now accessible from WSL2.
*Note: Mirrored mode is available on Windows 11 version 22H2 and higher. If you're on Windows 10 or older Windows 11 builds, skip to the next solutions.*

---

## Solution 2: Enable DNS Tunneling (.wslconfig)
DNS tunneling is a game-changer for VPN compatibility. Instead of DNS requests traveling through network packets (which the VPN intercepts), DNS tunneling uses virtualization to process requests directly, bypassing the VPN's DNS interference.
Edit your `.wslconfig` file:

1.  Open File Explorer and navigate to `C:\Users\YourUsername\`
2.  Create or edit the file `.wslconfig` (it won't have a visible extension)
3.  Add these lines:

```ini
[wsl2]
dnsTunneling=true
autoProxy=true
```
The `dnsTunneling=true` option handles DNS resolution through virtualization, while `autoProxy=true` automatically applies Windows proxy settings to WSL2.

4.  Save the file
5.  Shut down WSL2:

```powershell
wsl --shutdown
```

6.  Restart WSL2 and test DNS resolution:

```bash
nslookup example.com
```
DNS tunneling is essential for VPNs using NRPT (Name Resolution Policy Table) policies—common in enterprise environments. It removes the 3 DNS server limitation that WSL2 had before, allowing multiple corporate DNS servers to work simultaneously.

---

## Solution 3: Use host.docker.internal Instead of localhost
This is a quick workaround if you can't use mirrored mode yet. The `host.docker.internal` hostname automatically resolves to your Windows host IP address.
In WSL2, instead of:
```bash
curl http://localhost:8000
```
Use:
```bash
curl http://host.docker.internal:8000
```
This works because Docker (and modern WSL2) includes built-in support for this special hostname, which bypasses the localhost complexity entirely.
For persistent environment variables, add to your `.bashrc` or `.zshrc`:
```bash
export WINDOWS_HOST=$(ip route | grep default | awk '{print $3}')
```
Then use `$WINDOWS_HOST` in scripts instead of hardcoding localhost.

---

## Solution 4: Modify Your .wslconfig with NAT and Custom IP Range
If you're dealing with a VPN that insists on using the same IP ranges as WSL2, changing WSL2's subnet can prevent the routing conflict entirely.
Edit `.wslconfig`:
```ini
[wsl2]
networkingMode=nat
dhcp=true
ipv6=true
dns=8.8.8.8
generateHosts=true
generateResolvConf=true
autoProxy=false
```
To set a custom IP range for WSL2 (avoid VPN overlap):
```ini
[wsl2]
networkingMode=nat
vmMemory=3GB
swap=2GB
localhostForwarding=true

[interop]
enabled=true
appendWindowsPath=true
```
Then from PowerShell (as Administrator), change the WSL2 vEthernet interface metric to prioritize it over the VPN:
```powershell
Get-NetIPInterface -InterfaceAlias "vEthernet (WSL)" | Set-NetIPInterface -InterfaceMetric 1
```
And lower the VPN adapter's priority:
```powershell
Get-NetAdapter | Where-Object {$_.InterfaceDescription -Match "VPN_ADAPTER_NAME"} | Set-NetIPInterface -InterfaceMetric 6000
```
Replace `VPN_ADAPTER_NAME` with your actual VPN adapter name (e.g., "PANGP Virtual Ethernet Adapter", "Cisco AnyConnect", etc.). You can find it by running `ipconfig /all` and looking for your VPN connection.

---

## Solution 5: Configure Windows Firewall for WSL2
WSL2 runs through the Hyper-V firewall on Windows 11 22H2+. If your Windows services aren't accepting connections from WSL2, you need to create explicit firewall rules.
Find your WSL2 subnet first:
```powershell
Get-NetIPAddress | Where-Object { $_.InterfaceAlias -like "*WSL*" -and $_.AddressFamily -eq "IPv4" }
```
This returns something like `172.17.48.5/20`. The subnet is `172.17.48.0/20`.
Create a firewall rule to allow WSL2:
```powershell
New-NetFirewallRule -DisplayName "Allow WSL2 Inbound" `
  -Direction Inbound -Action Allow -Protocol TCP `
  -LocalPort 8000 `
  -RemoteAddress 172.17.48.0/20
```
Replace 8000 with your actual port and `172.17.48.0/20` with your WSL2 subnet from above.
For Hyper-V firewall specifically (Windows 11 22H2+):
```powershell
Set-NetFirewallHyperVVMSetting -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -DefaultInboundAction Allow

New-NetFirewallHyperVRule -Name "Allow Dev Server" `
  -DisplayName "Allow Development Server" `
  -Direction Inbound `
  -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' `
  -Protocol TCP -LocalPorts 8000
```

---

## Solution 6: Advanced - Modify VPN Interface Metrics (GlobalProtect, Cisco AnyConnect, etc.)
For corporate VPNs like GlobalProtect or Cisco AnyConnect, the VPN adapter can hijack all routing. Here's how to fix it:
Run this PowerShell script as Administrator:
```powershell
# Lower WSL2 metric (higher priority)
Get-NetIPInterface -InterfaceAlias "vEthernet (WSL)" | Set-NetIPInterface -InterfaceMetric 1

# Raise VPN metric (lower priority for routing)
Get-NetAdapter | Where-Object {$_.InterfaceDescription -Match "PANGP"} | Set-NetIPInterface -InterfaceMetric 6000
```
For Cisco AnyConnect, use "Cisco AnyConnect Secure Mobility Client" in the filter.
Save this as a script (e.g., `fix-wsl-vpn.ps1`) and run it every time you connect the VPN:
```powershell
# fix-wsl-vpn.ps1
Get-NetIPInterface -InterfaceAlias "vEthernet (WSL)" | Set-NetIPInterface -InterfaceMetric 1
Get-NetAdapter | Where-Object {$_.InterfaceDescription -Match "PANGP|Cisco"} | Set-NetIPInterface -InterfaceMetric 6000
Write-Host "WSL2 routing priority adjusted for VPN compatibility."
```
Run it with:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\YourUsername\fix-wsl-vpn.ps1
```

---

## Debugging: How to Know What's Actually Wrong
Before applying fixes, diagnose what's actually broken:
**Test 1: Can WSL2 reach the Windows host at all?**
```bash
# Inside WSL2
cat /etc/resolv.conf
```
Look for a nameserver IP. If it's empty or only shows WSL's own IP (172.17.x.x), DNS is broken.

**Test 2: Check your WSL2 virtual IP:**
```bash
ip route
```
The output shows `default via 172.17.0.1 dev eth0`. That `172.17.0.1` is your Windows host's virtual IP from WSL2's perspective. Try:
```bash
ping 172.17.0.1
```
If this works, you can reach the host. If it times out, your firewall is blocking it.

**Test 3: From Windows, check what WSL2's IP is:**
```powershell
wsl.exe hostname -I
```
This gives WSL2's IP from Windows' perspective. Now test from PowerShell:
```powershell
Test-NetConnection -ComputerName 172.17.48.5 -Port 8000
```
Replace the IP and port with your WSL2 IP and service port.

**Test 4: Verify VPN isn't breaking everything:**
Disconnect the VPN and test. If it works without VPN but not with VPN, it's definitely a VPN routing issue.

---

## Common VPN-Specific Issues and Fixes
*   **GlobalProtect (Palo Alto Networks):** Causes severe routing conflicts. Use the metric adjustment solution above, or disable split tunneling if your IT allows it.
*   **Cisco AnyConnect:** Change the PANGP Virtual Ethernet Adapter metric to 6000 as shown in Solution 6.
*   **NordVPN, Mullvad, or Consumer VPNs:** Usually work better than corporate VPNs. If they block WSL2 with an "always require VPN" feature, you may need to whitelist WSL2's subnet in the VPN settings.
*   **ExpressVPN:** Has known issues with WSL2. Disable the "Advanced Protection" feature if available, or use mirrored mode on Windows 11 22H2+.

---

## Best Practices Going Forward
1.  **Always update to Windows 11 22H2 or higher** – Mirrored mode alone solves most issues
2.  **Enable both mirrored mode AND DNS tunneling** – Redundancy ensures reliability
3.  **Use .wslconfig for persistent configuration** – Don't rely on manual PowerShell commands
4.  **Create firewall rules proactively** – Don't wait until something breaks
5.  **Test without VPN first** – Isolate VPN as the culprit before troubleshooting
6.  **Monitor WSL2 releases** – Microsoft fixes networking bugs regularly

---

## When All Else Fails
If you've tried every solution and nothing works, consider these options:
*   **Downgrade to WSL1 temporarily** (trades performance for networking stability)
*   **Use wsl-vpnkit** – A community tool specifically designed for WSL2 + VPN compatibility (requires additional setup)
*   **Run a proxy server on Windows** – Tunnel traffic through Python or another lightweight proxy and route WSL2 traffic through it
*   **Use SSH into the host** – Instead of direct localhost access, SSH into your Windows host from WSL2
*   **Contact your VPN provider** – Some enterprise VPNs have specific WSL2 support modes

## Conclusion
WSL2's networking complexity isn't a bug—it's a consequence of running as a virtual machine. But with the right configuration, you can make it seamless. Start with Solution 1 (mirrored mode) if you're on Windows 11 22H2+, enable DNS tunneling, and adjust your firewall rules. For older systems or stubborn VPNs, the metric adjustment and custom IP range solutions almost always work.
The key is understanding that WSL2 isn't localhost from Windows' perspective—it's a separate network peer. Once you think of it that way, everything clicks into place.

*By Huzi from huzi.pk*
