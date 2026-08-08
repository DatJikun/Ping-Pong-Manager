# Windows desktop release

The desktop edition wraps the existing offline game in Electron. Game code has
no Node.js access: context isolation and Chromium sandboxing are enabled,
permissions and in-app navigation are denied, and external links leave the app.
Career saves use Chromium's persistent IndexedDB storage inside Electron's
per-user application-data directory.

## Reproducible build

```powershell
npm ci
npm run check
npm test
npm run dist:win
```

The portable executable is written to `dist/`. An NSIS installer can be built
with `npm run dist:win:installer`. Build outputs are intentionally ignored by
Git.

## Branding assets

The Windows executable uses `assets/branding/pingpong-manager.ico`, which
contains 16, 24, 32, 48, 64, 128 and 256 pixel layers. The desktop window and
browser favicon use the opaque 512 pixel PNG. Approved source logo and itch.io
artwork are kept alongside their derived release assets in `assets/branding/`
and are included by the existing `assets/**/*` package rule.

## Verified baseline

On 2026-07-28 the x64 portable target built successfully, its unpacked
application launched, and `app.asar` contained only the game runtime, local
fonts, licences and desktop entry point. Production dependencies reported zero
known vulnerabilities with `npm audit --omit=dev`.

## Required before a public store build

- Add Windows code signing; unsigned downloads trigger SmartScreen warnings.
- Set final publisher/company metadata.
- Test install, update, save persistence and uninstall on a clean Windows user.
- Add Steamworks only after the standalone build is stable. The game does not
  require Steam APIs to run; achievements and Workshop support can be layered
  on later without coupling the save format to Steam.
