# Link Bypasser for Firefox (Android + desktop)

Firefox port of [Chrome-Ext-Link-Bypasser](https://github.com/nikhil914/Chrome-Ext-Link-Bypasser).
Skips the waiting steps on shortlink pages so the link opens without tapping through every step.

Supported sites: `linkshortx.in`, `hindisink.com`, `dragontales.lat`, `nanotech.org.in`,
`softspoker.co.in`, `audioverse.org.in`.

## How the LinkShortX flow is handled

`linkshortx.in` → `hindisink.com` "Step 1 … N of N" → `linkshortx.in` "Get Link" → `telegram.me`

The step timer is checked by the server, so it can't be skipped completely:
- Step 1 is accepted instantly.
- Steps 2+ are rejected before 9 s and accepted from 9 s (measured on the live site).
- Each step's token only works for that step, so steps can't be jumped.

What the add-on does:
- Step 1: submitted instantly.
- Every later step: the hidden next-step form is submitted at ~9.2 s (a badge in the top-right shows the countdown). No need to tap Verify or Continue.
- If the server still says "too early": the same token is re-sent every 1.5 s (up to 6 times).
- Final `linkshortx.in` page: opens the Get Link URL as soon as it unlocks.

A full run takes about 30 seconds.

Tap the add-on in the Firefox menu to turn it off or on.

## Install on Firefox for Android

Firefox for Android only installs add-ons that Mozilla has signed. Signing as **unlisted** is free,
automatic and does not publish the add-on on the store.

### 1. Get a signed `.xpi`

**Option A: GitHub Actions (this repo)**
0. One-time: copy `extras/sign-workflow.yml` to `.github/workflows/sign.yml` (on GitHub: Add file → Create new file,
   name it `.github/workflows/sign.yml`, paste the contents, commit).
1. Create API keys at https://addons.mozilla.org/developers/addon/api/key/
2. In this repo: Settings → Secrets and variables → Actions → add `AMO_JWT_ISSUER` (the "JWT issuer")
   and `AMO_JWT_SECRET` (the "JWT secret").
3. Push a version tag (e.g. `git tag v1.5.0 && git push origin v1.5.0`), or run the
   **Sign Firefox add-on** workflow manually from the Actions tab.
4. Download the signed `.xpi` from the release (or the workflow's artifacts).

Each upload needs a new `version` in `manifest.json`.

**Option B: on your computer**
```sh
npx web-ext sign --channel unlisted --api-key <JWT issuer> --api-secret <JWT secret> \
  --ignore-files ".github/**" "extras/**" README.md
```

### 2. Install it on the phone
1. Copy the `.xpi` to the phone.
2. In Firefox: menu → Settings → About Firefox → tap the Firefox logo 5 times to enable the debug menu.
3. Back in Settings, tap **Install add-on from file** and pick the `.xpi`.

## Development

```sh
npx web-ext lint --ignore-files ".github/**" "extras/**" README.md
npx web-ext run                                   # Firefox desktop
npx web-ext run -t firefox-android --android-device <adb id>   # phone over USB (temporary install)
```
