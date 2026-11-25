# KuroWhale 黑色系鲸鱼娘桌宠 v0.3.0 发布说明 / Release notes

> **状态：v0.3.0 正式版发布。** 零新增外部端口，继续保持 DSH Market `0` 安全红线，并将兼容范围放宽至 `>=0.2.1-rc.3`。

## 中文亮点（桌面生产力、侧开交互与广泛兼容）

### 1. 侧开式多会话审批快捷浮卡与右键菜单（不挡角色）
- **人物旁侧展开，屏幕边缘自动翻转**：右键菜单与任务/统计浮卡通过 `openBeside()` 在角色旁侧打开（角色本身静止不动，靠近屏幕右缘时自动左翻），配合双列紧凑按钮与 4px 细滚动条，再也不遮挡鲸鱼娘立绘。
- **一键查看与原地快捷批准 / 拒绝**：点击等待审批的霜白胶囊（或从菜单/托盘/ `/kurowhale panel`）即可查看所有活跃会话、工具名与已运行时间；通过 DSH 受信任的内部 `approval/request` 瀑布流与原生 UI 透明竞速（**绝不阻断或吞掉 DSH 原有审批卡片**），支持直接查看 `toolName` 与审批 `reason`，一键 **「允许一次」**、**「拒绝」**、**「切到 DSH」** 或 **「停止当前轮次」**（`WeakRef` + `agent.cancel({ kind: 'user' })`）。

### 2. 纯本地「今日陪伴微统计」
- 按本地自然日自动滚存并原子持久化至 `~/.dsh/kurowhale-pet/stats.json`（零网络、零遥测）。
- 汇总今日**陪伴时长、完成轮次、工具调用次数、审批处理次数**，并在 DSH 的 `assistant/message` 或 `step/end` 附带 `usage` 时只读统计今日 **Token 用量**（`/kurowhale stats` 或浮卡底部查看）。

### 3. 克制的专注 / 深夜轻关怀
- 新增 `careReminders`（默认开启，可右键菜单或 `/kurowhale care off` 随时关闭）。
- 仅在 Agent 回到空闲的喘息瞬间触发：连续专注 50 分钟提醒歇息喝水（带冷却），23:30–04:59 期间每晚仅轻柔提醒一次早点休息。

### 4. 十二组互动姿态、高频自主生活循环与轻量粒子反馈
- **全新 12 行 `v0.3.0` 扩展图集（`1536×2496`）**：在既有 9 组侧身/工作动画基础上，新增 **摸头眯眼（`petted`）**、**打盹睡觉（`dozing`）** 与 **吃小鱼干（`eating`）** 三组 6 帧全彩互动姿态；兼容旧版 9 行自定义皮肤优雅降级，并可自动在本地升级历史 `v0.1.x` / `v0.2.0` 官方缓存路径。
- **高频自主生活轮换（自动触发，防连续重复）**：启动后 6–10 秒、后续空闲每 9–15 秒自动防重复抽签切换 **侧身散步（30%）、自己啃小鱼干（22%）、犯困打盹飘 `zZz`（20%）、心情好眯眼摇尾（10%）、开心小跳（10%）与挥手打招呼（8%）**，右键「自主动作」可随时开关，Agent 工作或点击立刻让位。
- **分区触控反应与微粒动效**：头顶来回轻抚搓动或轻点头顶可触发开心蹭蹭与飘升爱心/星光；戳身体/裙摆触发 Q 弹跳跃与俏皮左右闪避；2.2 秒内连续狂点 4 次进入头晕晃动并环绕星星；右键快捷条「摸头 / 喂鱼 / 打盹 / 欢呼」或 `/kurowhale pet|feed|doze|cheer` 也可随时主动触发。

### 5. 放宽 DSH 版本兼容范围（`>=0.2.1-rc.3`）与新版本兼容修复
- 移除人为的 `<0.3.0` 上限，经核对 DSH 内部 `semver.satisfies(..., { includePrerelease: true })` 与市场索引规则，现已直接支持 **`0.2.1-rc.3`、`0.2.3-alpha.2` 及后续常规升级版本**，减少小版本更新导致的误报不兼容。
- 改用 Cordis `ctx.inject(['commands'], ...)` 与 `ctx.get('agents')` 安全读取可选服务，修复 `0.2.3-alpha.2` 启用时报 `cannot get property "commands" without inject` 的问题。

## English highlights

- **Twelve animation poses, lively autonomous idle routine & partitioned interactions:** extends the atlas to 12 rows (`1536×2496`) with new **`petted` head-pat**, **`dozing` sleepy nap**, and **`eating` dried fish snack** animations. Automatically cycles without consecutive repeats after a 6–10s startup warm-up and every 9–15s of idle across walking, snacking, dozing, happy tail-wags, hopping, and waving; plus head-pat hover rub, head tap, body poke dodge, 4-click dizzy wobble, subtle Canvas heart/sparkle/`zZz` particles, a compact quick-play strip, `/kurowhale pet|feed|doze|cheer`, graceful fallback for 9-row custom skins, and offline auto-upgrade from legacy `v0.1.x`/`v0.2.0` stock paths.
- **Side-mounted frosted menu & multi-session approval card:** both the compact 2-column right-click menu (with slim 4px scrollbar) and the approval/stats card open neatly beside the character (`openBeside()`, auto-flipping near screen edges without shifting the pet). Inspect active sessions, `toolName`, and approval `reason`, then trigger **Allow once**, **Reject**, **Stop turn** (`agent.cancel`), or **Focus DSH** via in-process Cordis waterfall racing (zero HTTP ports, `0` security red lines).
- **Offline daily companion & token micro-stats:** rolls over cleanly by local calendar date in `~/.dsh/kurowhale-pet/stats.json`, tracking companion time, completed turns, tool calls, approvals, and passive read-only token usage (`/kurowhale stats`).
- **Gentle focus & late-night care reminders:** fires only when returning to idle — a 50-minute focus break nudge (with cooldown) and a once-per-night late-night rest note (`/kurowhale care [on|off]`).
- **Widened DSH compatibility (`engines.dsh: ">=0.2.1-rc.3"`) & Cordis fix:** removes the artificial `<0.3.0` cap (verified against DSH's `includePrerelease: true` semver check), supporting `0.2.1-rc.3` through `0.2.3-alpha.2` and future DSH updates cleanly, and switches optional `commands`/`agents` access to `ctx.inject` / `ctx.get`.

## 发行包与校验 / Artifacts & verification

- **Windows code-only ZIP (`DSH-KuroWhale-0.3.0-Windows-code.zip`)** — `85746` bytes (12 entries, excluding private character artwork; inner `dsh-kurowhale-pet-0.3.0.tgz` contains `stats.js`)
  - SHA-256: `8e844d11bb02c757baa492f899c3a7e7ca5362354f14243b996b1ccf61f069ef`
- **npm tarball (`dsh-kurowhale-pet-0.3.0.tgz`)** — `1144051` bytes (32 files, bundles verified 12-row `v0.3.0` artwork with `validAssets: true`)
  - SHA-256: `6695b05b36b9cd0befaf13a66cd8a19f28ce640ed39affb397723b20b729c6a0`
  - Integrity: `sha512-QH2vOeOLgYJiSq2fKZqs5fDsiVVTyodr9j4kowNHwhA2RY8vV4RvRHmJW3nmslspHoKp6CnPl5QykRODHWzbRw==`
- **Automated & market checks:** `node --test plugin/test/*.test.mjs` (`39/39` pass), `python scripts/test_release_bundle.py` (`2/2` pass), `python scripts/test_install_upgrade.py` (`1/1` pass), upstream `buildMarketIndex` (`plugins: 1`, `refused: 0`), plus standalone Neutralino 6.9.0 interactive visual acceptance of the side-mounted menu & card and `KuroWhale-Pet` / `v0.2.0` -> `v0.3.0` local upgrade checks.
