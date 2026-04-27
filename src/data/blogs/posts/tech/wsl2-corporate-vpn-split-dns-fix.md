---
title: "WSL2: My Company VPN Uses a Custom DNS Domain – Configuring Split DNS for WSL2 and Docker"
description: "The Real Problem: Corporate DNS Doesn't Work in WSL2 You connect to your company VPN. Your Windows machine works fine. But then you open WSL2 or Docker,..."
date: "2026-01-22"
topic: "tech"
slug: "wsl2-corporate-vpn-split-dns-fix"
---

The Real Problem: Corporate DNS Doesn't Work in WSL2
You connect to your company VPN. Your Windows machine works fine. But then you open WSL2 or Docker, and suddenly your internal domain—the one you use every day like `git.mycompany.internal` or `api.corp.example.com`—just won't resolve. You get timeout errors. Ping fails. Docker containers can't reach internal services.
This isn't random. It's not a bug. It's the collision between WSL2's separate DNS configuration and your company's split DNS setup—a security feature that routes internal domain queries to corporate DNS servers and everything else to public DNS.
Here's what's happening: WSL2 inherits DNS from Windows, but Windows' VPN adapter only pushes DNS servers after you connect. By the time WSL2 auto-generates its `/etc/resolv.conf`, it either missed the update or the DNS configuration doesn't include the custom internal domain suffix your company uses. Docker on top of WSL2 makes it even worse—containers get their own isolated DNS, creating a three-layer DNS mess.
This guide teaches you how to set up split DNS properly so WSL2 and Docker containers can resolve your company's custom domains alongside public internet domains.

## Quick Fix (For the Impatient)
Before diving deep, here's the fastest working solution:

1.  **Disable auto-generated resolv.conf:**

```bash
# Inside WSL2, edit /etc/wsl.conf
sudo nano /etc/wsl.conf
```
Add these lines:
```ini
[network]
generateResolvConf = false
```

2.  **Save and shutdown WSL2 from Windows PowerShell:**

```powershell
wsl --shutdown
```

3.  **Manually set DNS (inside WSL2 again):**

```bash
sudo bash -c 'echo "nameserver 10.0.0.5
nameserver 8.8.8.8" > /etc/resolv.conf'
```
Replace `10.0.0.5` with your company's DNS server. Replace `8.8.8.8` with a public DNS.

4.  **Make it persistent (survive restarts):**

```bash
sudo chattr +i /etc/resolv.conf
```

5.  **Test it:**
```bash
nslookup git.mycompany.internal
```
If it works, you're done. If not, read on—your setup is more complex.

---

## Understanding Split DNS and Why WSL2 Breaks It
Split DNS (also called Split Tunneling for DNS) is a security feature where your VPN provider tells your computer: "Use these DNS servers for internal domains (like `*.mycompany.com`), but use public DNS servers for everything else."
Here's how it should work on Windows:
*   You connect to VPN
*   VPN pushes a NRPT rule (Name Resolution Policy Table) saying "forward queries for *.mycompany.internal to 10.0.0.5"
*   Windows applies this rule automatically
*   External queries go to 8.8.8.8, internal queries go to 10.0.0.5

But with WSL2, this breaks because:
*   WSL2 runs in its own virtualized network with a separate `/etc/resolv.conf` file
*   When WSL2 boots, it auto-generates `/etc/resolv.conf` before your VPN connection even happens
*   The auto-generated file doesn't know about your company's internal domains
*   Even if it did, it can't use Windows' NRPT rules—those are Windows-only
*   Docker containers have yet another DNS configuration layer, completely isolated from WSL2

The result: Three different DNS configurations fighting each other, and none of them working correctly for internal domains.

---

## Solution 1: Manual DNS Configuration (Simplest, One-Time)
This works if your company DNS servers are static (don't change).

**Step 1: Find your company's DNS server IPs**
From Windows PowerShell, run:
```powershell
Get-DnsClientServerAddress -AddressFamily IPv4 | Format-Table InterfaceAlias, ServerAddresses
```
Look for your VPN adapter (might say "Cisco AnyConnect", "GlobalProtect", "VPN", etc.). Note the IP addresses listed.
Also identify your company's internal domain suffix. Ask IT, or check your VPN settings—it's usually something like `mycompany.internal`, `corp.example.com`, or `engineering.acme.io`.

**Step 2: Disable WSL2's auto-generated DNS**
Inside WSL2:
```bash
sudo nano /etc/wsl.conf
```
Make sure it contains:
```ini
[network]
generateResolvConf = false
```
Save it (Ctrl+O, Enter, Ctrl+X).

**Step 3: Create your custom resolv.conf**
```bash
sudo nano /etc/resolv.conf
```
Add your company's DNS server first, then a public DNS:
```
nameserver 10.0.0.5
nameserver 8.8.8.8
nameserver 8.8.4.4
```
Replace 10.0.0.5 with your actual company DNS IP from Step 1.
Save it.

**Step 4: Make it survive WSL2 restarts**
```bash
sudo chattr +i /etc/resolv.conf
```
This makes the file immutable so WSL2 can't overwrite it.

**Step 5: Test it**
```bash
nslookup git.mycompany.internal
ping api.corp.example.com
```
*   **When this works:** Static DNS server IPs, your VPN always connects the same way, no domain-specific routing needed.
*   **When this fails:** Your company uses dynamic DNS, multiple domain suffixes, or complex NRPT rules. Move to Solution 2.

---

## Solution 2: Using dnsmasq for Smart Domain Routing (Recommended)
If your company needs routing rules like "use DNS-A for *.internal, use DNS-B for *.corp", you need `dnsmasq`—a lightweight DNS forwarder that can intelligently route domains.

**Install dnsmasq on WSL2**
```bash
# Inside WSL2 Ubuntu
sudo apt-get update
sudo apt-get install dnsmasq -y
```
For other distributions, use your package manager (dnf, pacman, apk, etc.).

**Configure dnsmasq**
Create or edit the config file:
```bash
sudo nano /etc/dnsmasq.conf
```
Find the end of the file and add:
```conf
# Log DNS queries for debugging
log-queries

# Use public DNS by default
server=8.8.8.8
server=8.8.4.4

# Forward internal domain to company DNS
server=/mycompany.internal/10.0.0.5

# Add more internal domains if needed
server=/corp.example.com/10.0.0.5
server=/engineering.io/10.0.0.6

# Don't use /etc/resolv.conf (avoid conflicts)
no-resolv

# Listen on localhost
interface=lo
```
Replace the domain names and DNS server IPs with your actual values. Add as many `server=/domain/IP` lines as your company needs.
Save it.

**Disable WSL2 auto-DNS and point to dnsmasq**
Edit `/etc/wsl.conf`:
```bash
sudo nano /etc/wsl.conf
```
Add:
```ini
[network]
generateResolvConf = false
```
Now create a manual `/etc/resolv.conf`:
```bash
sudo bash -c 'echo "nameserver 127.0.0.1" > /etc/resolv.conf'
sudo chattr +i /etc/resolv.conf
```

**Start dnsmasq and verify it works**
```bash
sudo service dnsmasq start
sudo service dnsmasq status
```
Check if it's listening:
```bash
sudo netstat -tuln | grep 53
```
You should see `127.0.0.1:53` in the output.
Test DNS resolution:
```bash
nslookup mycompany.internal
nslookup google.com
```
Both should resolve correctly—internal domains to company DNS, external to Google's.

**Make dnsmasq auto-start (important!)**
Add this to your `~/.bashrc` or `~/.zshrc`:
```bash
# Auto-start dnsmasq if not running
if ! sudo service dnsmasq status > /dev/null 2>&1; then
  sudo service dnsmasq start
fi
```
Restart your shell or reload:
```bash
source ~/.bashrc
```

---

## Solution 3: Docker-Specific DNS Configuration
Docker containers won't automatically use WSL2's dnsmasq. They get isolated DNS from their own network. You need to tell Docker about your custom DNS.

**Check Docker's current DNS**
From WSL2:
```bash
docker run --rm busybox cat /etc/resolv.conf
```
If this shows only `127.0.0.11:53` (Docker's embedded DNS), containers can't reach your company's custom domains.

**Fix 1: Point Docker to WSL2's dnsmasq**
Find your WSL2's IP from Windows:
```powershell
wsl.exe hostname -I
```
This returns something like `172.18.50.2`. Use this IP in your Docker configuration.
Create or edit `~/.docker/daemon.json`:
```json
{
  "dns": ["172.18.50.2", "8.8.8.8"]
}
```
Replace `172.18.50.2` with your actual WSL2 IP.
Restart Docker:
```bash
docker daemon restart
# or if using Docker Desktop, just restart the application
```
Now test:
```bash
docker run --rm busybox nslookup mycompany.internal
```

**Fix 2: Use docker-compose DNS override**
If you use Docker Compose, add DNS directly to your `docker-compose.yml`:
```yaml
version: '3.8'
services:
  myapp:
    image: myimage:latest
    dns:
      - 172.18.50.2  # WSL2 dnsmasq
      - 8.8.8.8      # Public DNS fallback
```

**Fix 3: Use Docker Desktop's advanced settings (if on Docker Desktop)**
Open Docker Desktop > Settings > Resources > WSL Integration and enable it. Then:
1.  Go to Settings > Docker Engine
2.  Add:
```json
{
  "dns": ["172.18.50.2", "8.8.8.8"]
}
```
3.  Save and restart Docker.

---

## Solution 4: Enable DNS Tunneling in .wslconfig (Windows 11 22H2+)
Microsoft added a powerful feature called DNS tunneling that handles custom DNS domains directly through virtualization, completely bypassing network packet routing.
Edit your `.wslconfig` file (in `C:\Users\YourUsername\`):
```ini
[wsl2]
dnsTunneling=true
autoProxy=true
```
Shutdown WSL2:
```powershell
wsl --shutdown
```
Restart WSL2 and test:
```bash
nslookup mycompany.internal
```
*   **Advantage:** Works with complex VPN setups, no manual configuration needed.
*   **Disadvantage:** Windows 11 22H2+ only. Doesn't work on Windows 10.

---

## Troubleshooting: When DNS Still Doesn't Work
**Debug Step 1: Check WSL2's current DNS configuration**
```bash
cat /etc/resolv.conf
```
Look at the nameserver entries. Should show your company DNS first, then public DNS.
If it shows only `172.xx.0.1` (the Windows host), your company DNS didn't get pushed to WSL2.

**Debug Step 2: Verify Windows got the DNS from VPN**
From PowerShell (after connecting VPN):
```powershell
Get-DnsClientServerAddress -AddressFamily IPv4
```
If your company DNS is missing, contact IT—your VPN profile might not be pushing DNS correctly.

**Debug Step 3: Test DNS directly from WSL2**
```bash
nslookup mycompany.internal 10.0.0.5
```
Directly query your company's DNS server (replace IP). If this works, WSL2 can reach the server but `/etc/resolv.conf` is wrong.

**Debug Step 4: Check if dnsmasq is actually running**
```bash
sudo service dnsmasq status
sudo netstat -tuln | grep 53
```
Should show dnsmasq listening on `127.0.0.1:53`.

**Debug Step 5: Check Docker's DNS separately**
```bash
docker run --rm busybox cat /etc/resolv.conf
```
If this shows different servers than WSL2, Docker needs separate configuration (see Solution 3).

**Debug Step 6: Verify no systemd-resolved conflicts**
Some systems run `systemd-resolved` which also listens on port 53. Check:
```bash
ps aux | grep resolved
sudo lsof -i :53
```
If both dnsmasq and resolved are running on port 53, systemd-resolved wins. Disable it:
```bash
sudo systemctl disable systemd-resolved
sudo systemctl stop systemd-resolved
```

---

## Common VPN-Specific Issues
*   **Cisco AnyConnect:** Often blocks non-VPN adapters. In AnyConnect settings, look for "Block all traffic when VPN is disconnected" and disable it (if IT allows).
*   **GlobalProtect (Palo Alto):** Check if "split tunnel" is enabled. It should be—this is what makes split DNS work. If disabled, internal domains won't route to corporate DNS at all.
*   **ExpressVPN / NordVPN:** These often don't support split tunneling properly with WSL2. Your best bet is DNS tunneling in `.wslconfig` or manually setting DNS servers.
*   **Netskope, Zscaler, Forcepoint:** These enterprise solutions can be tricky. Contact your IT team to confirm they support DNS forwarding to WSL2's virtual adapter.

---

## Making It Persistent Across VPN Reconnects
The trickiest scenario: VPN disconnects and reconnects, changing DNS servers. Your WSL2 DNS config becomes stale.
**Automated Solution: Create a reconnection script**
Save this as `~/reconnect-dns.sh`:
```bash
#!/bin/bash

# Wait for VPN to stabilize
sleep 2

# Get company DNS from Windows
DNS_SERVERS=$(powershell.exe -NoProfile -Command "Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object {\$_.InterfaceAlias -match 'VPN'} | Select-Object -ExpandProperty ServerAddresses")

# Extract first DNS server
COMPANY_DNS=$(echo "$DNS_SERVERS" | head -1)

# Update WSL2 resolv.conf
echo "nameserver $COMPANY_DNS" | sudo tee /etc/resolv.conf > /dev/null
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf > /dev/null

# Restart dnsmasq
sudo service dnsmasq restart

echo "DNS updated: Company=$COMPANY_DNS"
```
Make it executable:
```bash
chmod +x ~/reconnect-dns.sh
```
Run it after VPN reconnects, or set up a systemd timer to run periodically.

---

## Best Practices Going Forward
*   **Always disable** `generateResolvConf` in `/etc/wsl.conf` before manually configuring DNS
*   **Use dnsmasq** if your company has multiple internal domains – it's the professional solution
*   **Test both WSL2 and Docker containers separately** – they have independent DNS stacks
*   **Enable DNS tunneling** on Windows 11 22H2+ – it solves 90% of VPN issues automatically
*   **Keep Windows DNS working first** – WSL2 inherits from Windows, so if Windows DNS fails, WSL2 will too
*   **Document your DNS configuration** – leave comments in config files for when you return to this later

## Conclusion
Split DNS configuration in WSL2 is thorny because you're dealing with three overlapping systems: Windows DNS, WSL2's isolated resolver, and Docker's container networking. But with these solutions, you can make them work together smoothly.
Start with the quick fix if your company has a single static DNS server. Graduate to dnsmasq if you need intelligent domain routing. And always test both `nslookup` from WSL2 and `docker run --rm busybox nslookup` from Docker to ensure the entire chain is working.
Your development setup should never fight your infrastructure. Once configured, you should be able to connect the VPN, open WSL2, and immediately have access to both public internet and company internal services—just like on a native Linux machine. That's the goal.

*By Huzi from huzi.pk*
