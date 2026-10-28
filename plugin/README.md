# KuroWhale host-only development bundle

Target: Windows, **DSH Desktop 0.2.1-rc.3**. No `dsh.client` declaration or legacy DSH frontend imports.

## Actual qualification

- `64b3717` / `0.0.1-dev.0`: loaded in the owner's existing Desktop profile, cold-started successfully, uninstalled and restored successfully.
- `e1c8293` / `0.0.2-dev.0`: host loaded and a real Neutralino/WebView2 canvas acknowledged all 57 sprite frames, but **the character was not visible on the desktop**. Screenshot checks and the owner both confirmed failure. It was uninstalled; no further build was installed after this failure.
- Current `0.0.2-dev.1`: offline safety changes after rollback. **Not reinstalled or Desktop-qualified.** Renderer now requires explicit opt-in. The `rendererReady` field means protocol/atlas readiness, never a visual pass; `visibilityVerified` remains false.

See [the actual test report](../docs/WINDOWS-TEST-REPORT-2026-10-28.md). This is not a release or a finished desktop pet.

## Structure

- `index.js`: Cordis lifecycle, contained renderer startup, local control queue and session-event adapter.
- `overlay.js`: Windows Neutralino extension transport and owned-process cleanup.
- `animations.js`: fixed nine-row atlas and activity mapping.
- `native/index.html`: local native canvas UI, drag logic and diagnostic menu.
- `native/neutralino.js`: official `@neutralinojs/lib@6.9.0`, with its original MIT notice in `LICENSE-neutralinojs.txt`.

There are no character assets, runtime executables, model configurations or credentials in this package. Character art stays in the owner's existing local pack. The renderer's own short-lived native IPC capabilities are private to its newly created process and are never logged; DSH/model credentials are not read by this code.

## Development and local configuration

```powershell
node --test plugin/test/*.test.mjs
```

Tests cover structural metadata, activity mapping, opt-in behavior, stale-command protection and cleanup. They do **not** substitute for Desktop tests. On this Work host the restricted command environment blocks atomic rename in its temporary directory; tests passed in a normal Windows process.

Configuration belongs only to `~/.dsh/kurowhale-pet/local.json`. The future experimental renderer accepts:

```json
{
  "rendererEnabled": false,
  "assetDirectory": "D:/path/to/existing/KuroWhale-Pet",
  "runtimePath": "D:/path/to/official/neutralino-win_x64.exe",
  "scale": 1.25
}
```

Keep `rendererEnabled` false until the visibility defect is fixed and qualified. A successful canvas acknowledgement does not justify enabling it in a release. Existing local configuration is not overwritten by the package.

`scripts/pet-control.mjs` sends commands through the plugin's own local file queue, without accessing the Desktop authentication transport:

```powershell
node scripts/pet-control.mjs status
node scripts/pet-control.mjs all
node scripts/pet-control.mjs state waiting
node scripts/pet-control.mjs resume
node scripts/pet-control.mjs scale 1.25
node scripts/pet-control.mjs hide
node scripts/pet-control.mjs show
```

These are development controls, not proof of live Agent behavior. `all` and `state` are explicitly diagnostic. Real tool/approval mapping remains untested because visual qualification failed first.

## Recovery

Only after tasks have ended, use the **Desktop-bundled** command (not a different PATH CLI):

```powershell
& '<DSH install>/resources/runtime/cli/bin/dsh.cmd' plugin --profile desktop remove dsh-kurowhale-pet
```

Restart and verify the original plugin list, configuration hashes and model operation. Do not disable all third-party plugins, reset the profile or change model settings. Private configuration backups and raw local test evidence are excluded from Git.

## Licensing

The repository's own code license has not been selected. The MIT notice included here applies specifically to the official Neutralino client library; it does not grant a license for character artwork or automatically relicense this whole repository.
