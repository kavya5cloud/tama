<img width="493" height="209" alt="Screenshot 2026-08-29 at 3 05 35 AM" src="https://github.com/user-attachments/assets/a6891013-3a8e-462a-9ed5-b7c9dbb15e27" />

# Tama

> Show it once. It does it again.

Tama is a Chrome extension MVP for teaching a browser workflow by demonstration.

## Current architecture

The Tama interface is **injected into the current webpage** as a floating Shadow DOM panel. It is not a Chrome action popup, so it can use the intended landscape/Dynamic-Island-like layout.

Product loop:

Tell Tama the goal → demonstrate one task → compile it into a readable workflow → review → replay.

## Test

Click Tama → enter a goal → Start → perform the task → reopen Tama if needed → Finish teaching → review the compiled workflow.

## MVP boundary

This version focuses on capture → compile → review → replay. It is intentionally not a general-purpose autonomous browser agent yet.
