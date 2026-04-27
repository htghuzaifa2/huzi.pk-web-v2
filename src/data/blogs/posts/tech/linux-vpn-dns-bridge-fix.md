---
title: "Linux: DNS Resolves Only When VPN is Off – How I Built a Smarter DNS Bridge"
description: "Fix DNS issues where local sites (like .local) fail when VPN is on. Learn to set up Split DNS with NetworkManager, systemd-resolved, or dnsmasq."
date: "2026-01-24"
topic: "tech"
slug: "linux-vpn-dns-bridge-fix"
---

# Linux: DNS Resolves Only When VPN is Off – How I Built a Smarter DNS Bridge

**You know that moment of digital whiplash.** One second, you're connected to your work VPN, accessing internal tools with no issue. The next, you try to open a local news site or your Raspberry Pi's admin page, and your browser just... spins. "This site can't be reached." You disconnect the VPN in frustration, and poof—everything loads instantly. It's as if your computer has developed a split personality: it can see the corporate world or your local world, but never both at the same time.

I lived with this maddening tug-of-war for months. My VPN, a tunnel to remote resources, was also a wall that cut me off from my own local network. Printing, accessing my home server, even casting to a TV became a dance of connecting and disconnecting. The culprit wasn't the VPN itself, but a blunt-force DNS configuration. It was hijacking all my domain queries, trying to resolve my local printer's name through a corporate server that had no idea it existed.

The solution wasn't to break the tunnel, but to build intelligent doorways in it. It's called **Split DNS** (or Split Tunneling for DNS), and it teaches your system to ask the right question to the right server. Here’s how I reclaimed my local network without sacrificing my remote access.

## The Quick Fix: Choose Your Tool and Regain Control
The method depends on your VPN client and network manager. Here’s the fastest path for most users.

### For Most Desktop Users (Using NetworkManager):
This is the most common and graphical method. NetworkManager has built-in support for this.
1.  Open your **connection settings**. Click the network icon in your system tray and select "Settings" or "Network Settings."
2.  Find your VPN connection in the list. Click the **gear icon** next to it.
3.  Navigate to the **"IPv4"** or **"IPv6"** tab (usually IPv4).
4.  Look for the **"DNS"** section. You will likely see "Automatic" turned on.
5.  Switch it to "**Automatic (DHCP) addresses only**." This crucial step tells NetworkManager to ignore the DNS servers pushed by your VPN for certain domains.
6.  Just below, in the "**DNS servers**" field, add your preferred DNS servers. For a system that works everywhere, add your local DNS server (e.g., your router at `192.168.1.1`) first, followed by a public resolver like `8.8.8.8` (Google) or `1.1.1.1` (Cloudflare).
7.  In the "**Search domains**" field, add your local domain (e.g., `local`, `home`, `lan`). This tells your system to try these suffixes for local hostnames.
8.  Save, disconnect from the VPN, and reconnect. Your local resolutions should now work alongside your VPN resources.

### For Systemd-Resolved Users (Common on modern distributions):
If your system uses systemd-resolved, you can create a more elegant, domain-specific rule.
1.  First, find the interface name of your VPN connection. Run:
    ```bash
    resolvectl status
    ```
    Look for an interface with your VPN's name (e.g., `tun0`, `wg0`, `proton0`).
2.  Now, tell systemd-resolved to route queries for your local domain to a specific DNS server, only on that VPN interface:
    ```bash
    sudo resolvectl dns tun0 192.168.1.1
    sudo resolvectl domain tun0 "~local" "~home.arpa"
    ```
This command says: "On the `tun0` interface, for domains ending in `.local` or `.home.arpa`, use the DNS server at `192.168.1.1`. For all other domains, use the VPN's default servers."

## Understanding the "Why": The DNS Hijack and the Smart Query
To appreciate the fix, let's follow a DNS query on a broken setup.
1.  You type `http://printer.local` into your browser.
2.  Your system sends the query: "Hey, where is printer.local?"
3.  The VPN, having set itself as the default gateway for all traffic, intercepts this query.
4.  It sends the question to the corporate DNS server (e.g., `10.10.1.1`).
5.  The corporate server has no record of your home printer. It either fails or returns a nonsense result.
6.  Your request times out.

**Split DNS changes the logic.** It sets up routing rules based on the question being asked.
*   **Question:** `printer.local`? **Rule:** Send that to the local DNS server (`192.168.1.1`).
*   **Question:** `internal.corporate.com`? **Rule:** Send that through the VPN tunnel to `10.10.1.1`.
*   **Question:** `google.com`? **Rule:** Can go either way, often defaulting to the VPN for security.

## The Deep Dive: Advanced and Robust Configurations

### The WireGuard Split DNS Method
WireGuard is configured via text files, giving you fine-grained control. In your WireGuard client config file (e.g., `/etc/wireguard/wg0.conf`), you achieve split DNS by not setting a global `DNS = server`. Or, set it to your local resolver.
```ini
[Interface]
Address = 10.8.0.2/24
PrivateKey = YOUR_KEY
# DNS = 1.1.1.1  # Comment this out or set to local DNS
```
Use `PostUp` and `PreDown` hooks to dynamically modify your DNS configuration when the tunnel goes up and down. This requires a script, but it's the most powerful method.

### Using dnsmasq as a Local Caching Resolver
This is a prosumer method that creates a smart local DNS manager.
1.  Install dnsmasq:
    ```bash
    sudo apt install dnsmasq  # Debian/Ubuntu
    sudo pacman -S dnsmasq    # Arch
    sudo dnf install dnsmasq  # Fedora
    ```
2.  Configure it to forward specific domains to specific servers. Edit `/etc/dnsmasq.conf`:
    ```bash
    # Listen only on localhost
    listen-address=127.0.0.1
    # Never forward plain names (without dots or domain parts)
    domain-needed
    bogus-priv
    # Forward local domain queries to your router
    server=/local/192.168.1.1
    # Forward corporate domain queries to the VPN DNS
    server=/corp.internal/10.10.1.1
    # Use a public DNS for everything else
    server=8.8.8.8
    server=1.1.1.1
    ```
3.  Set your system's DNS server (in NetworkManager) to `127.0.0.1`. Now, all DNS queries first go to dnsmasq on your own machine, which acts as a traffic director based on the domain.

## The Pakistani Context: Navigating Digital Dualities
For us, this technical fix resonates on another level. We constantly navigate dualities—local and global, traditional and modern, private and public. Our digital lives are no different. We might need to access a university's internal portal (a virtual Pakistan) while also needing to print to a local printer or access a family media server.

A VPN that breaks local access is like a bridge that lets you travel to another country but collapses the road to your own market. It creates a false choice. Implementing Split DNS is an act of digital sovereignty—it asserts our right to inhabit both worlds seamlessly. It ensures that our connection to global work or knowledge doesn't come at the cost of disconnection from our immediate, physical environment.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
