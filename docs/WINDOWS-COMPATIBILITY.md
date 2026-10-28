# Windows Desktop compatibility — 2026-10-28

## Latest: native visibility fixed

`0.0.2-dev.2` was tested in the existing Desktop profile. Switching the GUI runtime spawn option from `windowsHide:true` to `false` made WebView content and the character visible. A reverse test reproduced the blank window. Transparency, borderless, topmost and skip-taskbar conditions passed separate visual checks. The owner explicitly confirmed the DSH-started character was visible. Uninstall restored seven original configuration hashes; reinstall and cold startup passed. See [the visibility fix report](WINDOWS-VISIBILITY-FIX-2026-10-28.md). Full release gates remain pending; the following sections record earlier tests and must not be read as the current visibility result.

## New direct test result / 当前环境实测更新

The owner subsequently authorized testing in their existing Windows Desktop **0.2.1-rc.3** profile (no isolated profile). The minimal host-only bundle at `64b3717` loaded, survived cold startup, and uninstalled cleanly. Original plugin lists/configuration were restored. A real model request after rollback returned `KUROWHALE_MODEL_OK` using existing settings.

The experimental overlay at `e1c8293` acknowledged 57 canvas frames but **was not visible on the desktop**, confirmed by screenshots and the owner. It was removed immediately. Full animation visibility, live tool/approval integration and performance remain unqualified. Renderer is now opt-in and off by default; the post-rollback code was not reinstalled.

See [the detailed direct test report](WINDOWS-TEST-REPORT-2026-10-28.md). **Status: still not releasable.** The historical summary below remains context for the original third-party plugin, not the new host-only probe.

## Scope / 适用范围

Target: **DSH Desktop 0.2.1-rc.3**, Windows. This file summarizes a test outcome **reported by the project owner**. Original test archive, screenshots and failure logs have **not** been uploaded to this GitHub repository or independently reproduced by this scaffold.

## Current evidence (user-provided test summary)

- ✅ An older CLI instance displayed a real transparent overlay and supported dragging, scaling, always-on-top, hide and restore.
- ❌ Original `dsh-desktop-pet 0.2.0` triggered an incompatible legacy frontend dependency, preventing Desktop 0.2.1-rc.3 from starting.
- ✅ The incompatible original plugin was selectively removed and normal Desktop operation restored. Existing model credentials and configurations were reportedly unchanged.
- ⏳ Desktop 9-state playback, tool/approval/multi-session state mapping, persistence after restart and CPU/memory measurements remain unverified.
- ⏳ Artwork redistribution license and publishing permissions remain pending.

This report does **not** establish that all DSH Desktop failures are caused by this third-party plugin. Check actual test logs and upstream reports before attributing root cause. Do not copy or publish logs containing tokens or personal paths.

## Engineering response

1. Target exact DSH rc3 version in a tiny **backend-only** Cordis bundle (`plugin/`).
2. Avoid legacy `webRuntime`, `webServer` and older injected frontend entrypoints.
3. Original plan: test in a disposable profile. The owner explicitly superseded this and authorized the current-profile tests recorded above; retain backups and selective rollback.
4. Add a desktop overlay and agent integration only after verifying their current APIs.
5. Implement cleanup and crash recovery: removing the plugin must restore the test profile to an unchanged bootable state.
6. Never package unapproved character art or claim successful end-to-end testing before Windows proof.

## Release gates

- [ ] Cold start of unmodified rc3 in test profile
- [ ] Cold start with backend-only bundle (positive activation log)
- [ ] Remove bundle and cold start without damage
- [ ] Display imported KuroWhale sprite sheet in true transparent desktop window
- [ ] Validate all nine animations & live tool/approval/multi-session events
- [ ] Verify minimize/restore, drag, scaling, restart persistence and cleanup
- [ ] Sample CPU/memory and confirm no leaked processes
- [ ] Review third-party code, user data access and character art redistribution permission
- [ ] Clean-room installation and rollback documented

**Status:** Not releasable. Structural Node tests are not Windows / DSH integration tests.
