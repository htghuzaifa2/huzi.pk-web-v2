---
title: "Slow Curl HTTPS Connections & IPv6 Timeouts - Unraveling the Mystery"
description: "Why is curl so slow? Diagnose and fix IPv6 timeouts, TLS handshake delays, and MTU mismatches that cause HTTPS connections to crawl."
date: "2026-01-24"
topic: "tech"
slug: "fix-slow-curl-https-ipv6"
---

# When Curl Crawls: Unraveling the Mystery of Slow HTTPS Connections

As-salamu alaikum, my friends. Have you ever invited a guest for tea, only to watch them stand motionless at your door for minutes on end, hand raised, but never knocking? You see them there, you expect them to act, but nothing happens. The anticipated moment of connection stretches into a bewildering silence.

This is the digital equivalent of typing `curl https://example.com` and watching your terminal hang. The cursor blinks, mocking your patience. You know the website is up. Your network is fine. Yet, curl seems trapped in its own thoughts, taking five, ten, sometimes twenty seconds before it finally springs to life or fails entirely. That silence isn't just slow; it feels broken.

I've been there, staring at a frozen pipeline, a stalled download, a script that hangs on a single HTTPS request. The frustration is profound because the tool—curl—is supposed to be the reliable workhorse of the command line. When it fails in this silent, stubborn way, it shakes our trust in the very fabric of our system's connectivity.

But here is the truth I've learned: curl is rarely the source of the problem. It is the messenger, and it is delivering a message about a deeper conflict in the layers of your network stack. The slowness is a symptom, a clue pointing to one of three common culprits: a TLS handshake struggling to begin, a confused dance with IPv6, or a hidden MTU mismatch choking your data in the pipes. Today, we will learn to listen to that message, diagnose the true cause, and restore the swift, reliable flow of data.

## First Steps: Diagnosing Where the Delay Lives

Before we dive into complex solutions, we must locate the problem. The following diagnostic commands will reveal where curl is spending its agonizing quiet time.

### The Essential Diagnostic Command

Use curl with verbose and timestamp output. This is your primary investigative tool:

```bash
curl -v --trace-time https://archlinux.org
```

Analyze the output. The timestamps will show you exactly where the delay occurs:

1.  **A long pause AFTER "Trying [IP address]..." but BEFORE "Connected to..."?** This is a socket connection delay, pointing to IPv6 issues or general network routing.
2.  **A long pause AFTER "Connected to" and "TLS handshake, Client hello" but BEFORE "Server hello..."?** This is a TLS/SSL handshake delay. The client speaks, but the server takes seconds to reply.
3.  **Transfer starts but then proceeds in extreme bursts with timeouts?** This could be an MTU/packet fragmentation issue, especially over VPNs or tunnels.

#### Quick Diagnosis Table

| What You See in `curl -v --trace-time` | Likely Culprit | First Action |
| :--- | :--- | :--- |
| **Pause at `Trying [IPv6 address]...` then Immediate connect fail** | IPv6 connection failure causing a timeout before falling back to IPv4. | Run `curl -4` to force IPv4 and see if it's instantly faster. |
| **Delay between Client hello and Server hello messages (5-20 seconds).** | Severe TLS handshake delay. Could be local (CA cert loading) or remote. | Test with `curl --cacert /dev/null --insecure` to bypass local CA checks (use with caution for testing only). |
| **Connection is fast with `--insecure` but slow with certificate verification.** | Delay in loading/parsing your local Certificate Authority (CA) bundle file. | Check the size of `/etc/ssl/certs/ca-certificates.crt`. Consider using a `--capath` instead of `--cacert`. |
| **Timeouts (`Operation timed out`) or retransmissions visible in packet captures.** | MTU mismatch causing packet fragmentation and loss. | Check MTU with `ip link show` and test by lowering it temporarily: `sudo ip link set dev eth0 mtu 1400`. |

## The Three Core Villains: TLS, IPv6, and MTU

Let's understand each problem at its root, so your fix is permanent, not just a temporary workaround.

### 1. TLS Handshake Delays – The Silent Introduction

Think of the TLS handshake as the formal, encrypted introduction before any real conversation can happen. Sometimes, this introduction gets stuck.

*   **Local CA Bundle Paralysis:** On some systems (noticed in Ubuntu 22.04 vs. 18.04), curl/OpenSSL can take an extra 50-100ms just to read and parse the massive bundle of trusted CA certificates (`/etc/ssl/certs/ca-certificates.crt`). Using `--capath` (pointing to a directory of individual certificates) can be more efficient than `--cacert` (a single large file).
*   **Network-Level Delays:** The Client Hello message is sent, but the Server Hello response takes 5-20 seconds. This is often a network path issue—stateful firewalls, overloaded load balancers, or severe packet loss disrupting the initial negotiation.

### 2. The IPv6 Misadventure – Knocking on the Wrong Door

This is a classic and frustrating cause. Your system has IPv6 enabled, and DNS returns an IPv6 address (AAAA record) for a site. Curl, following modern protocols, tries to connect to it first.
However, if your network, your router, or an intermediate hop does not have functional IPv6 routing, that connection attempt will hang until it times out—often after a 5-second delay—before curl gives up and tries the IPv4 address. You see this as a long pause on the `Trying [2606:2800:220:1:248:1893:25c8:1946]...` line.

### 3. MTU Mismatch – The Choked Pipe

Maximum Transmission Unit (MTU) is the largest packet size your network interface can send. When you use a VPN, GRE tunnel, or certain Docker networking modes, a new virtual interface is created with its own MTU.
If this virtual MTU is larger than what the physical network path can handle, large packets (like those containing TLS handshake data or HTTP requests) get silently fragmented or dropped. The result is catastrophic: connections may establish (small packets work) but time out as soon as data transfer begins, or they become unbearably slow with repeated timeouts and retransmissions.

## Systematic Troubleshooting and Robust Fixes

### Step 1: Isolating and Fixing IPv6 Problems

1.  **Test:** Force IPv4. If `curl -4 https://example.com` is fast, IPv6 is the issue.
2.  **Fix (for curl only):** Make IPv4 your default for curl. Set an alias in your `~/.bashrc`:
    ```bash
    alias curl='curl -4'
    ```
3.  **Fix (System-wide - More drastic):** You can disable IPv6 for curl at compile time with `--disable-ipv6`, or disable IPv6 system-wide via sysctl (`net.ipv6.conf.all.disable_ipv6 = 1`). Use this only if you are sure you don't need IPv6.

### Step 2: Investigating TLS Handshake Slowness

1.  **Measure:** Use the `--trace-time` output to see if the delay is before or after the Client Hello.
2.  **Check Local CA Load:** Compare speed using a single CA file versus the directory. Try creating a minimal PEM file with just one root CA and test with `curl --cacert ./minimal.pem`.
3.  **Bypass for Testing:** Use `curl --insecure` to skip verification entirely. If this is fast, the delay is in the local certificate verification process or the path to the server. Never use `--insecure` in production scripts.

### Step 3: Detecting and Solving MTU Issues

MTU problems are insidious because they often work for small exchanges but break larger ones.

1.  **Identify the MTU:** Run `ip link show` and note the MTU for your main interface (e.g., `eth0`) and any tunnel interfaces (e.g., `tun0`, `docker0`, `veth...`).
2.  **The Golden Rule:** The MTU of a virtual/tunnel interface must be **lower** than the physical interface to account for the extra tunnel headers. A typical safe value is 1400 or even 1350.
3.  **Test and Set:**
    ```bash
    # Test a lower MTU temporarily
    sudo ip link set dev eth0 mtu 1400
    # If it works, make it permanent in your network config (e.g., /etc/network/interfaces or Netplan)
    ```
    For Docker, you may need to set `--mtu` in the daemon configuration (`/etc/docker/daemon.json`).

## Building a Robust, Production-Ready Approach

For scripts and services that must be reliable, you must code defensively.

### 1. Implement Timeouts and Retries

Never let a curl call hang indefinitely. Always use timeouts and a retry logic with exponential backoff.

```bash
curl --max-time 10 --retry 3 --retry-delay 5 --retry-max-time 40 https://your-api.com/data
```

*   `--max-time 10`: Fail if the whole operation takes over 10 seconds.
*   `--retry 3`: Retry up to 3 times on transient errors.
*   `--retry-delay 5`: Wait 5 seconds before the first retry.

### 2. Create a Diagnostic Wrapper Script

For critical environments, create a wrapper script that logs performance.

```bash
#!/bin/bash
# safe-curl.sh
URL=$1
TIMEFILE="/tmp/curl-timing-$$.log"

echo "Testing: $URL" | tee $TIMEFILE
/usr/bin/time -v curl --max-time 15 --connect-timeout 5 -4 -v "$URL" 2>&1 | grep -E "(time|Trying|Connected|Hello|HTTP)" | tee -a $TIMEFILE

EXIT_CODE=${PIPESTATUS[0]}
echo "Exit code: $EXIT_CODE" | tee -a $TIMEFILE
```

## A Reflection on Digital Resilience

My dear reader, solving this curl slowness is more than a technical fix. It is a lesson in digital resilience. It teaches us that our tools operate in a complex, layered world where a misconfiguration one layer down can cause chaos several layers above.

The IPv6 issue teaches us about graceful fallback—a system should fail fast and move on, not cling stubbornly to a broken path for seconds on end. The MTU problem teaches us about accommodating the weakest link; our systems must be configured for the tightest constraint in the path, not the most ideal. The TLS delay reminds us that security has a cost, and we must ensure that cost doesn't cripple the very connection it's trying to protect.

When you finally run that curl command and see the data flash onto your screen instantaneously, you will feel more than relief. You will have the quiet confidence of someone who has peered into the digital machinery, understood its whispers and shouts, and helped it run smoothly again.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
