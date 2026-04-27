---
title: "Hyprland: Gaps Disappear After Reload – Parsing Order and Config Inheritance Gotchas"
description: "Fix vanishing gaps in Hyprland after reloading your config. Understanding windowrule parsing order, config hierarchy, and syntax rules."
date: "2026-01-24"
topic: "tech"
slug: "hyprland-gaps-disappear-fix"
---

# Hyprland: Gaps Disappear After Reload – Parsing Order and Config Inheritance Gotchas

**The Vanishing Space: When Your Hyprland Gaps Disappear Into the Digital Ether**

Assalam-o-Alaikum, my friend. Have you ever carefully arranged cushions in your dera to create that perfect, welcoming space between guests? You step back, admire the arrangement—the breathing room, the elegance of separation—and then someone enters and… the cushions shift. The beautiful gaps collapse. The space you designed with intention vanishes.

This is the exact digital frustration you feel when you set `gaps_in = 5` and `gaps_out = 20` in your Hyprland config, reload with a sigh of satisfaction, and watch your pristine gaps disappear into thin air. Your windows cling to each other and the screen edges like shy children, refusing to honor the spacious layout you decreed. The gap, that essential "breathing room," is gone.

I’ve been in that silent argument with my monitor more times than I’d care to admit. The truth is, Hyprland isn’t being disobedient. It’s following a strict, logical order—a qanoon of parsing—that, when misunderstood, leads to this apparent defiance. Today, we’ll sit together and learn this language. We’ll uncover why your gaps vanish and, more importantly, how to make them stay, permanently and faithfully.

## The Immediate Fix: Restoring Your Gaps in Moments

First, let’s bring your spaces back. The problem almost always lies in one of two places: a misplaced rule or a syntax oversight. Here’s your first-aid kit.

### 1. The Primary Diagnosis: Find the Rule That’s Erasing Your Gaps
Open your `hyprland.conf` and search (Ctrl+F) for every instance of:
*   `windowrule`
*   `windowrulev2`

Your mission is to find any rule that might be affecting borders, rounding, or gaps. The most common culprit is a misplaced or overly broad window rule that sets `bordersize 0`, `rounding 0`, or, critically, `no_gaps` (or similar). A rule intended for a specific app might be accidentally applied to all windows.

### 2. The Syntax Check: Are Your Gaps Defined Correctly?
Look at your `general` block. The correct, modern syntax is:

```bash
general {
    gaps_in = 5
    gaps_out = 20
    # You can also use CSS-style syntax for asymmetric gaps[citation:10]:
    # gaps_out = 5, 10, 15, 20 # top, right, bottom, left
}
```
Ensure there is no trailing comma after the number. A line like `gaps_out = 20,` can sometimes cause the entire variable to be ignored.

### 3. The Quick Reload Test
After checking, save the file and execute a soft reload in your terminal:
```bash
hyprctl reload
```
This reloads the config. Do your gaps return? If yes, you've identified the config file as the source. If no, the issue might be deeper with monitor rules.

#### First-Aid Checklist: Why Gaps Vanish

| Symptom | Likely Cause | Immediate Action |
| :--- | :--- | :--- |
| **Gaps disappear only for certain apps (e.g., Firefox, Kitty).** | A windowrule for that app is overriding global defaults. | Find and comment out (#) suspect window rules for that app's class. |
| **Gaps disappear globally after reload.** | A syntax error or a later rule in the config is overriding the general block. | Check the very end of your config for conflicting rules. |
| **Gaps are fine until you open a floating window.** | Floating windows have a separate `float_gaps` variable. | Ensure `float_gaps` is set in the general block (e.g., `float_gaps = 10`). |
| **Gaps work on one monitor but not another.** | A monitor= rule may be applying a different scale or modeline that resets effective area. | Check your monitor= lines for correctness. |

## The Heart of the Matter: Hyprland’s Top-Down Law of Parsing

To solve this permanently, you must understand how Hyprland reads your `hyprland.conf`. It doesn't read it as a collection of suggestions; it reads it as a strict, top-to-bottom list of commandments.

### The Cardinal Rule: Last Write Wins
Imagine you are giving instructions to a very literal friend:
1.  "Please set the gaps to 20 pixels."
2.  "Now, for this kitty terminal, set the border size to 0."
Your friend does exactly that. Now imagine you reverse the order:
1.  "For this kitty terminal, set the border size to 0."
2.  "Please set the gaps to 20 pixels."

The global command at the end still applies. But what if your second instruction was: "For all windows, set the gaps to 0"? The later, more general command would overwrite the earlier one.

This is Hyprland's logic. Rules are evaluated from the top of the file to the bottom. A rule defined lower in the file can override a rule defined above it. This is the single most important concept to grasp.

### The Inheritance Gotcha: How Window Rules Swallow Global Settings
Window rules are powerful. They let you say, "For windows matching X, apply Y." But some properties, when set via a window rule, don't add to the global setting—they replace it entirely for that window.

If your global config has `gaps_in = 5` and you have a window rule like:
```bash
windowrulev2 = float, class:^(kitty)$
```
Your gaps are safe. This rule only adds the float effect. But if you have a rule like:
```bash
windowrulev2 = noborder, class:^(firefox)$
```
Firefox will have no border, but its gaps remain. The real danger comes from rules that implicitly or explicitly alter the window's geometry or decoration in a way that clashes with the gap logic.

## Advanced Diagnosis and Surgical Fixes

### Step 1: Isolate the Conflicting Rule
Use the `hyprctl` command to inspect windows and active rules.
1.  Open an application whose gaps are missing.
2.  In a terminal, get its class and title:
    ```bash
    hyprctl activewindow
    ```
3.  Now, check all window rules to see which ones match:
    ```bash
    hyprctl listrules
    ```
    This will list all parsed rules in the order Hyprland sees them. Look for any rule matching your app's class or title that has effects like `noborder`, `rounding 0`, or `bordersize 0`. A rule with bordersize 0 can sometimes...

> *[Note: The original content provided ended here. Please verify your configuration carefully and check the official Hyprland wiki for the latest rule syntax if problems persist.]*
