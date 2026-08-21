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

## Legacy package verification

The first Windows candidates used retired internal version labels. Public beta
numbering starts at `0.1.0`; patch updates use `0.1.1`, `0.1.2` and so on.

On 2026-08-08 the first candidate passed 336/336 non-slow tests and the
syntax gate, built as an x64 portable executable with the approved Windows icon,
and stayed alive for a 12-second isolated-profile startup smoke test. The final
friend ZIP is 88,403,846 bytes with SHA-256
`DBEB9410C98945420F6221FB2A60126CE0C37941FDD0808BEC7350DE95C1141B`.

The second candidate passed 352/352 non-slow tests, 386/386 full tests and a
separate five-season soak. Its build stayed alive for a 12-second startup smoke
test with an isolated data profile. The old package and checksum remain a
historical record only.

## Current 0.1.1 beta candidate

The game version is `0.1.1`. The GitHub Release title is
`PingPong Manager 0.1.1 beta (20260821)` and the tag is
`v0.1.1-20260821`. The date identifies the build and is not part of the game
version. The package is 88,422,545 bytes and its SHA-256 is
`E543661CF05A4B60C0CDBAC2C8DFEE63C677D9953AD3F0D2854A8BE823B112A0`.
The Windows process stayed alive for a 12-second smoke test with an isolated
data profile.

## Required before a public store build

- Add Windows code signing; unsigned downloads trigger SmartScreen warnings.
- Set final publisher/company metadata.
- Test install, update, save persistence and uninstall on a clean Windows user.
- Add Steamworks only after the standalone build is stable. The game does not
  require Steam APIs to run; achievements and Workshop support can be layered
  on later without coupling the save format to Steam.
