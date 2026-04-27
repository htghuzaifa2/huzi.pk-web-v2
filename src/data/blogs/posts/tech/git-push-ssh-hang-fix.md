---
title: "The Silent Push: How I Uncovered the Proxy Ghost Freezing My Git"
description: "Fix 'git push' hanging over SSH forever. Diagnose frozen pushes using verbose SSH logs and find hidden ProxyCommand or network configurations."
date: "2026-01-24"
topic: "tech"
slug: "git-push-ssh-hang-fix"
---

# The Silent Push: How I Uncovered the Proxy Ghost Freezing My Git

**There is a particular flavor of digital silence that is more maddening than any error.** It's the silence of a command that will not end. You type `git push origin main`, hit Enter with purpose, and then... nothing. No progress bar, no failure message, no triumphant "done." Just a blinking cursor hanging in a void, as if your words have been swallowed by the network itself. Minutes pass. Your confidence curdles into frustration. A `Ctrl+C` is your only escape.

If you've faced this frozen purgatory where `git push` over SSH hangs forever, you know the feeling. The internet is fine. The repository exists. But something invisible is blocking the path. After many such silent battles, I learned that the culprit is rarely Git itself. It is almost always the SSH tunnel it relies on, and often, a hidden, misconfigured, or forgotten **proxy setting** lying in wait. Let me guide you through the detective work that turns that infuriating silence into a smooth, flowing push.

## The Immediate Diagnostic: Is It SSH or Git?
First, we must isolate the problem. The magic command is `GIT_SSH_COMMAND`. This allows you to run Git with verbose SSH output without changing your global config.

In your terminal, run:
```bash
GIT_SSH_COMMAND="ssh -v" git push origin main
```
The `-v` flag (verbose) forces SSH to reveal its intimate conversation. Watch the output carefully. SSH will freeze at a specific line.
*   **Hangs after `debug1: Authentication succeeded`:** The login worked, but the data channel is blocked. This strongly points to a proxy or deeply broken MTU/network issue.
*   **Hangs on `debug1: Connecting to github.com...`:** SSH can't even reach the server. Firewall or dead proxy.
*   **Failures with `proxy connect`:** You've struck gold. A proxy command is failing explicitly.

### The Quick Fix (If the Proxy is the Culprit)
The verbose output might name a specific proxy command. The fastest way to confirm is to bypass it:
```bash
GIT_SSH_COMMAND="ssh -o ProxyCommand=none" git push
```
If this works, you've confirmed the issue is in your SSH configuration. Now, we find it.

## The Investigation: Finding the Hidden Proxy
Your SSH configuration is a chain of files. We must search systematically.

### 1. Check Your Project's Config
Git can use a repository-specific config.
```bash
cat ./.git/config | grep -i proxy
```

### 2. Check Your User's SSH Config (The Usual Suspect)
Open `~/.ssh/config`. Look for the `Host` block matching your Git server (e.g., `github.com` or `*`).
```bash
nano ~/.ssh/config
```
Look for a line starting with `ProxyCommand` or `ProxyJump`. It might look like:
```text
ProxyCommand nc -X connect -x proxy.company.com:8080 %h %p
```
If this proxy is dead, unreachable, or you are no longer on that network (e.g., worked at office, now at home), this command will hang forever trying to connect.

### 3. Check Environment Variables
Sometimes, the proxy is in your shell environment.
```bash
echo $http_proxy
echo $https_proxy
echo $GIT_PROXY_COMMAND
```

## The Solution: Correction or Removal
Once you've found the culprit, choose your path.

*   **Option A: Disable It.** If you don't need the proxy anymore, comment it out in `~/.ssh/config` by adding a `#`.
*   **Option B: Fix It.** If you need the proxy, verify the address/port is correct and reachable (`nc -zv proxy.com 8080`).
*   **Option C: The Nuclear Option.** Test with a truly clean slate:
    ```bash
    GIT_SSH_COMMAND="ssh -F /dev/null" git push
    ```
    This ignores *all* config files. If this works, you know for sure the bug is in your config files.

## Understanding the "Why": How a Proxy Freezes Git
When you `git push` over SSH, Git spawns the `ssh` command.
1.  Git asks SSH: "Connect me to github.com."
2.  SSH reads config, finds a `ProxyCommand`.
3.  SSH launches that command (e.g., `nc -x proxy...`).
4.  SSH expects this proxy process to handle the traffic.

**The Hang:** If the proxy command points to a dead IP, it tries to connect... and waits. And waits. The default TCP timeout can be huge. SSH waits for the proxy. Git waits for SSH. You wait for Git. Because the connection is "attempting" rather than "failed," no error is thrown immediately.

## Debugging Checklist

| Step | Command | What It Reveals |
| :--- | :--- | :--- |
| **1. Verbose Test** | `GIT_SSH_COMMAND="ssh -v" git push` | The exact step where SSH hangs. |
| **2. Bypass Test** | `GIT_SSH_COMMAND="ssh -o ProxyCommand=none" ...` | Confirms if ProxyCommand is the cause. |
| **3. Clean Slate** | `GIT_SSH_COMMAND="ssh -F /dev/null" ...` | Isolates issue to config files vs. network. |

## Final Reflection: Silence is Not Golden
Solving the forever-hanging git push is an exercise in listening to the silence. In a world of noisy errors, this particular problem is a quiet breakdown. It teaches you that your system is a network of dependencies, where a single, forgotten line in a hidden file can bring a workflow to a standstill.

When you run that push and see the scrolling lines of objects writing, it feels like unclogging a blocked artery. The lifeblood of your code flows again. Embrace the `-v` flag. Learn to read the whispers of your tools. And may your pushes always be swift.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
