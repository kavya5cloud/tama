<img width="493" height="209" alt="Screenshot 2026-08-29 at 3 05 35 AM" src="https://github.com/user-attachments/assets/a6891013-3a8e-462a-9ed5-b7c9dbb15e27" />

# Tama

> Show it once. It does it again.

Tama is a Chrome extension MVP for teaching a browser workflow by demonstration.

## Current architecture

The Tama interface is **injected into the current webpage** as a floating Shadow DOM panel. It is not a Chrome action popup, so it can use the intended landscape/Dynamic-Island-like layout.

Product loop:

Tell Tama the goal → demonstrate one task → compile it into a readable workflow → review → replay.

## Run the server

```bash
cd server
npm install
npm run dev
```

Server: `http://localhost:8787`

## Load the extension

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click **Load unpacked**
4. Select `extension/`
5. Pin Tama
6. Click the Tama icon on any normal webpage

The Tama panel appears in the top-right corner of the webpage. It is intentionally a floating, landscape panel rather than the native Chrome extension popup.

## Test

Click Tama → enter a goal → Start → perform the task → reopen Tama if needed → Finish teaching → review the compiled workflow.

## MVP boundary

This version focuses on capture → compile → review → replay. It is intentionally not a general-purpose autonomous browser agent yet.
