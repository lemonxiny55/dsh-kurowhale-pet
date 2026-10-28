# KuroWhale Windows 功能候选 / Windows functional candidate

Target: **Windows / DSH Desktop 0.2.1-rc.3 / Neutralino 6.9.0**. Version: **0.1.0-rc.1**. This is a local development candidate, not a published release. No legacy DSH frontend imports or `dsh.client` entrypoint.

## 已验收 / Qualified scope

在用户当前 `desktop` profile 中实测：九种动画、鼠标拖动、菜单缩放、置顶切换、隐藏/恢复、托盘恢复、重启持久化、屏幕外坐标恢复，以及真实工具、审批和两会话状态联动。正常关闭和强制结束原生窗口后，原进程树清零；可以重新显示。详见 [真实验收报告](../docs/WINDOWS-MVP-ACCEPTANCE-2026-10-28.md)。

Direct tests covered nine visible animations, dragging, menu scaling, topmost, hide/show, tray recovery, restart persistence, off-screen recovery, real tools, approval and concurrent-session priority in the owner's existing Desktop. See the report for exact evidence, limits, performance and candidate startup results.

`rendererReady` means transport/atlas readiness. Runtime `visibilityVerified` stays false because software does not automatically certify human visibility; visual qualification is recorded separately in the report.

## 本地使用 / Local use

Use the owner's existing local character pack and an official Neutralino 6.9.0 Windows runtime. Artwork and runtime executables are not included in this repository.

Only configure `~/.dsh/kurowhale-pet/local.json`:

```json
{
  "rendererEnabled": true,
  "assetDirectory": "D:/path/to/existing/KuroWhale-Pet",
  "runtimePath": "D:/path/to/official/neutralino-win_x64.exe",
  "scale": 1.25
}
```

Renderer activation is explicitly opt-in. Install only when DSH tasks have ended; back up profile files first. The Desktop-bundled CLI must match rc3; a different PATH CLI is not equivalent.

```powershell
npm pack ./plugin --ignore-scripts
& '<DSH install>/resources/runtime/cli/bin/dsh.cmd' plugin --profile desktop add '<absolute-path-to-local-tgz>' --ignore-scripts
```

Restart DSH after replacing an existing package; a package-manager success does not mean the live host has refreshed its module cache. Check the visible pet, Desktop UI, and `~/.dsh/kurowhale-pet/status.json` version.

右键角色打开菜单，支持放大/缩小、置顶、回到屏幕中央、隐藏与关闭。隐藏后在 Windows 通知区域右键黑底白色 **K** 图标，选择显示。关闭桌宠会退出原生窗口及托盘；可用下面的本地命令重新打开。位置、大小、可见性和置顶设置保存在自己的 `position.json`。

Right-click the pet for controls. Hidden pets can be restored through the notification-area K icon. Closing the pet exits its native window and tray; the local `show` command recreates it. Visibility, position, scale and topmost preferences persist independently of DSH model settings.

```powershell
node scripts/pet-control.mjs status
node scripts/pet-control.mjs show
node scripts/pet-control.mjs hide
node scripts/pet-control.mjs center
node scripts/pet-control.mjs scale 1.25
node scripts/pet-control.mjs topmost true
node scripts/pet-control.mjs close
```

## 动画与状态 / Animation and state mapping

Rows: idle, running-right, running-left, waving, jumping, failed, waiting, running (working), review. Occupied frames: **6,8,8,4,5,8,6,6,6**. The two run rows are simplified front-facing gaits with only five distinct pictures per row; neither is a full side-facing run. No artwork was regenerated.

Real DSH `session/event` signals drive work/tool, approval, completion and interruption feedback. Pending approval IDs remain authoritative even if the same session produces another work event. Priority: waiting, failed, running, review, idle. Completion/failure feedback lasts about two seconds before idle or other active work resumes. Hover only changes an idle pet, preserving approval alerts.

```powershell
node scripts/pet-control.mjs state waiting
node scripts/pet-control.mjs all
node scripts/pet-control.mjs resume
```

`state` and `all` are diagnostic, not Agent evidence. Always `resume` before testing real tasks. `diagnostics:true` in the pet's own local config enables per-frame trace during manual animation tests; leave it off for ordinary use.

## 验证与恢复 / Verification and recovery

```powershell
node --test plugin/test/*.test.mjs
node scripts/probe-native-window.mjs '<official-runtime.exe>' opaque 60
powershell -File scripts/sample-pet-performance.ps1 -OutputDirectory '<private-output-folder>' -Seconds 120
```

Tests include the one-shot iterator and broadcast self-feedback regressions. Unit tests do not substitute for Desktop acceptance. Performance uses real CPU-time deltas and process creation timestamps to avoid PID-reuse mistakes. Aggregate working sets may count shared pages repeatedly.

To uninstall only KuroWhale, after tasks have ended:

```powershell
$env:npm_config_ignore_scripts='true'
& '<DSH install>/resources/runtime/cli/bin/dsh.cmd' plugin --profile desktop remove dsh-kurowhale-pet
```

Restart and verify the original plugin list. If startup fails, restore the private backed-up package/lock/patch files after closing DSH; do not reset the entire profile or restore model settings over newer user changes. Keep backups and raw evidence private.

## 授权与限制 / Licensing and limits

Artwork redistribution permission remains unconfirmed. No character assets, model configurations or credentials are included. The tiny tray K icon is a new utility icon, not character art. The repository's own code license has not been selected. The included MIT notice applies specifically to official `@neutralinojs/lib@6.9.0`, not the whole repository or artwork.

Qualified on the tested Windows machine at 150% DPI. Other DSH versions, cross-monitor mixed DPI, long-duration soak testing, and other operating systems remain unqualified. No voice, progression system or games are added.
