---
title: "Taming the Digital Wild: How I Taught Sway to Remember Where My Windows Belong"
description: "Master Sway window rules on Arch Linux. Learn to use app_id, for_window, and workspace assignments to organize your tiling desktop."
date: "2026-01-24"
topic: "tech"
slug: "sway-window-rules-guide"
---

# Taming the Digital Wild: How I Taught Sway to Remember Where My Windows Belong

**There’s a unique kind of digital whiplash you experience when you open your favorite apps, only to find them scattered across your virtual workspace like leaves in the wind.** You carefully place your terminal on the right, your browser on the left, and your notes just so. You close them, feeling organized. You reopen them, and… chaos. The terminal is now floating in the middle, the browser is full-screen, and nothing is where you left it. This was my daily reality after I fell in love with the sleek, minimal purity of Sway on Arch Linux—a tiling window manager that promised efficiency but seemed to have a mind of its own about where my applications should live.

If this resonates with you, that feeling of your digital tools refusing to stay put, take heart. Your apps aren’t being defiant. Sway simply operates on a different philosophy than traditional desktop environments. It doesn’t remember positions; it follows rules. The solution isn’t to fight its nature, but to learn its language and write a clear, declarative script for your desktop. Let me show you how to craft those rules and understand where this beautiful, stubborn system might still have its own ideas.

## The Immediate Fix: Writing Your First Window Rules
The magic happens in your Sway configuration file, typically at `~/.config/sway/config`. This file is the blueprint of your desktop universe. To make an app open in a specific place, you use the `for_window` command.

Here’s the basic syntax that will become your new mantra:
```bash
for_window [criteria] command
```
Let’s say you want your terminal (kitty) to always open on workspace 2, in a stacked layout. You would add this line:
```bash
for_window [app_id="kitty"] move container to workspace number 2, layout stacking
```
Or, if you want your web browser (firefox) to always open on workspace 1 and be fullscreen:
```bash
for_window [app_id="firefox"] move container to workspace number 1, fullscreen enable
```

### The First Step: Reload Your Config
After adding your rules, save the file and tell Sway to reload its configuration without restarting:
```bash
swaymsg reload
```
Your new rules should take effect immediately for any new application window.

## Understanding the Sway Mindset: It’s Not a Bug, It’s a Philosophy
To work with Sway, you must understand where it comes from. Sway is a Wayland-native, i3-compatible tiling window manager. This lineage is crucial.

*   **Tiling by Default:** Unlike floating window managers, Sway wants to manage space for you. It arranges windows like tiles in a mosaic, without overlap. When you ask an app to open, Sway asks, “Where is there space in the current layout?” not “Where did this app open last time?”
*   **Stateless and Rule-Based:** Sway is stateless between sessions. It doesn’t save the pixel-perfect position of your windows. Instead, it relies on the rules you write in your config file. This makes your setup predictable, reproducible, and portable. Your desktop becomes code.
*   **The App_ID is Key:** On X11, you’d match windows by class. On Wayland with Sway, the primary key is the `app_id`. This is a unique identifier set by the application itself. Finding the correct app_id is the first step to writing a successful rule.

## Finding Your App’s Identity: The Swaymsg Command
How do you know what app_id to use for `[app_id="..."]`? Use the `swaymsg` command.

1.  Open the application you want to create a rule for.
2.  In a terminal, run:
    ```bash
    swaymsg -t get_tree
    ```
    This outputs a large JSON tree of your entire Sway workspace. Look through it for a "app_id" or "window_properties" field that matches your application. For example, Firefox might show `"app_id": "firefox"`, while a terminal might show `"app_id": "kitty"`.

**Pro-Tip:** You can use grep to filter this:
```bash
swaymsg -t get_tree | grep -B5 -A5 "firefox"
```

## Crafting Advanced Rules: Beyond the Basics
Once you grasp the basic `for_window`, you can write more sophisticated rules to create a truly intelligent workspace.

### Matching on Different Criteria
The app_id is just one way to match. You can also use:
*   **title:** The window title. Useful for specific instances of an app.
    ```bash
    for_window [title="Save File"] floating enable
    ```
*   **shell:** Match if it’s a floating window shell like xdg_shell or xwayland.
    ```bash
    for_window [shell="xwayland"] floating enable
    ```

### Combining Criteria and Commands
You can get very specific by combining criteria and issuing multiple commands.
```bash
# Make all XWayland windows floating and centered, but keep kitty terminal tiled
for_window [shell="xwayland" app_id!="kitty"] floating enable, move position center
```

### The Power of Workspace Assignments
Instead of moving windows after they open, you can assign an app directly to a workspace at launch. This is often cleaner.
```bash
# Assign Firefox to workspace 1 on startup
assign [app_id="firefox"] $ws1
# Assign any LibreOffice window to workspace 3
assign [app_id="libreoffice-*"] $ws3
```
(Note: You’d define `$ws1` earlier in your config as `set $ws1 "1"`)

## Where the Rules Fail: The Limits of Control
For all its power, Sway’s rule-based system has edges. Understanding these is key to avoiding frustration.

1.  **Applications That Change Their app_id:** Some apps, particularly Electron-based ones (like Discord, Slack, some IDEs), may use different app_ids for different windows (main window, pop-ups, dialogs). A rule for the main window might not catch a settings dialog. You may need to use a less specific match with `*` or match on title.
2.  **The XWayland Wild Card:** X11 applications running through XWayland can be notoriously inconsistent. Their app_id might be generic (like "xwayland"), or their window properties might not be set correctly. This is why a catch-all rule like `for_window [shell="xwayland"] floating enable` is so common—it accepts the chaos and contains it by making all such windows float.
3.  **Dynamic & Temporary Windows:** File pickers, password dialogs, tool palettes—these are often created and destroyed on the fly. They might not persist long enough for complex rules or might be transient windows that bypass some rules. The best approach is often broad, gentle rules that handle a class of windows (all file dialogs) rather than trying to target each one perfectly.

## The Human Factor
Rules are static, but your workflow is dynamic. What if you sometimes want Firefox on workspace 1 for research, but other times you want it on workspace 3 next to your code? Rules can feel restrictive. The solution is to embrace Sway’s keyboard-driven nature: use keybinds to quickly move windows between workspaces manually when your rule doesn’t fit the moment.

```bash
# Example keybind to move focused window to next workspace
bindsym $mod+Shift+period move container to workspace next
```

## A Final Reflection: From Chaos to Composed Intention
Learning to write Sway window rules is more than solving a problem. It’s a shift in perspective. You move from being a user of a desktop, reacting to where windows appear, to being an architect who defines the very laws of your digital space.

The initial frustration of windows forgetting their place melts away when you realize you were asking the wrong question. You weren’t dealing with a faulty memory; you were trying to speak a language of “remember” to a system that only understands “if this, then that.”

Now, when I type a command and my terminal snaps to its dedicated workspace, or my browser opens full-screen on its own virtual canvas, it feels not like luck, but like harmony. I have composed a silent symphony for my windows, and they play their parts perfectly every time. The failures at the edges—the occasional X11 dialog that pops up askew—are no longer bugs. They are reminders of the messy, human world of software that this elegant, rule-bound system gracefully contains.

Embrace the rulebook. Write your desktop’s constitution. And find peace in the orderly, predictable world you’ve coded into existence.

> “O Allah, never let the world forget the suffering of our brothers and sisters in Palestine. Shower them with Your mercy, steady their hearts with patience, and replace their every tear with the light of peace. O Most Merciful, be their protector, their healer, their unbreakable hope. Ameen, ya Rabb al-ʿālamīn.”
