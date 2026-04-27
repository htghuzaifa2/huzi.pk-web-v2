---
title: "The Silent Disconnect: Understanding SSH Timeouts and the Keepalive Fix"
description: "Stop SSH connections from freezing or timing out. Configure ServerAliveInterval and ClientAliveInterval to keep remote sessions active."
date: "2026-01-24"
topic: "tech"
slug: "ssh-timeout-keepalive-fix"
---

# The Silent Disconnect: Understanding SSH Timeouts and the Keepalive Fix

**Have you ever been deep in focus, tracing logs on a remote server through SSH, only to have your terminal suddenly freeze into a silent, unresponsive slab?** You type, but nothing appears. You press Enter, and the cursor just blinks mockingly back at you. The connection isn't closed—it's hung, trapped in a digital void. After exactly ten minutes of inactivity, this ghost takes your session hostage.

If this silent disconnection haunts your workflow, you've met a common, frustrating default behavior of most SSH servers and clients. It's not a bug; it's an intended, if heavy-handed, feature to clean up stale connections on the network. But for those of us who need our long-running processes to stay visible, it's a workflow killer. The fix lies in understanding and configuring two small but powerful settings: `ServerAliveInterval` and `ClientAliveInterval`.

## The Heartbeat Solution: Enabling SSH Keepalive Packets
The hanging is caused by intermediate routers or firewalls dropping the connection mapping ("state") after a period of no traffic. The solution is to send periodic, tiny "keepalive" packets to keep the connection alive in their tables.

### The Quick Fix (Client-Side)
You can configure this on your local SSH client (the machine you're typing from). This is the safest and easiest approach.
1.  Edit or create your user-specific SSH config file:
    ```bash
    nano ~/.ssh/config
    ```
2.  Add these lines:
    ```text
    Host *
        ServerAliveInterval 120
        ServerAliveCountMax 3
    ```

**What this does:**
*   `ServerAliveInterval 120`: Tells your client to send a keepalive packet to the server every **120 seconds** (2 minutes) if no other data is sent.
*   `ServerAliveCountMax 3`: If the server doesn't respond to **3** consecutive keepalives, the client assumes the connection is dead and closes it cleanly.

In total, if the network dies, your client will notice within about 6 minutes (120 * 3) and terminate, rather than hanging forever.

## The Two Sides of the Conversation: Client vs. Server
To truly master this, you need to understand that keepalives can be set from either end.

*   **`ServerAliveInterval` (Client-side):** Your local machine poking the server ("Are you still there?"). **Best for:** Fixing hangs on your personal laptop/desktop.
*   **`ClientAliveInterval` (Server-side):** The remote server poking you ("Are you still there?"). **Best for:** Admins managing a server where *all* users complain of drops. Requires root to edit `/etc/ssh/sshd_config`.

| Your Situation | Recommended Action |
| :--- | :--- |
| **You experience hangs from your laptop.** | Configure `ServerAliveInterval` in your local `~/.ssh/config`. |
| **Your server's users all complain of drops.** | Configure `ClientAliveInterval` on the server in `/etc/ssh/sshd_config`. |
| **Reverse SSH tunnels (`-R`) keep dying.** | You likely need **both**, as tunnels are sensitive. |

## Configuring the Server Side (ClientAliveInterval)
If you manage the server, you can apply this globally for all users.
1.  Edit the daemon config:
    ```bash
    sudo nano /etc/ssh/sshd_config
    ```
2.  Find/add these lines:
    ```text
    ClientAliveInterval 120
    ClientAliveCountMax 3
    ```
3.  Restart the SSH service:
    ```bash
    sudo systemctl restart sshd
    ```
    *(Ensure you have another active session open before restarting, just in case!)*

## The Underlying Guardian: TCPKeepAlive
You might also see `TCPKeepAlive` in configs. This toggles the OS-level TCP heartbeat. It's lower-level and less configurable than the SSH-specific `AliveInterval` settings. It's usually best to leave it enabled (`yes`) as a final safety net, but rely on `ServerAliveInterval` for preventing the specific "idle timeout" hang.

## A Practical Example: Saving a Reverse Tunnel
Reverse SSH tunnels (`ssh -R 2222:localhost:22 ...`) are notorious for disconnecting silently.
To keep a tunnel rock-solid:
1.  **On the origin server:** Add `ServerAliveInterval 60`.
2.  **On the destination server:** Add `ClientAliveInterval 60`.

This dual-heartbeat approach ensures neither side closes the tunnel during quiet periods.

## Final Thoughts: The Philosophy of a Persistent Connection
Taming SSH timeouts is more than just tweaking configs; it's about understanding the philosophy of persistent state on a stateless network. The internet wasn't designed to remember your terminal session forever. Firewalls, routers, and NAT gateways are constantly cleaning house.

By setting these keepalive intervals, you're not being annoying. You're politely raising your hand every few minutes in a vast, busy room to say, "I'm still here." You're providing a gentle, regular proof of life that satisfies the network's need for efficiency while preserving your own need for stability.

Configure your heartbeat. Reclaim your sessions. And may your long compiles never be silently interrupted again.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
