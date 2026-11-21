# KuroWhale 黑色系鲸鱼娘桌宠 v0.2.0 / Release notes

## 中文

**v0.2.0 发布！** 在 DSH Desktop 的“插件管理 → 添加插件”中输入 `dsh-kurowhale-pet@0.2.0`，选择 npm 官方源，安装、启用后重启即可体验。

### 亮点更新

#### 动画与视觉焕新
- **真正侧身转身 + 6 步纯侧身行走（图集 `v0.2.0`）**：升级 `running-right` 与 `running-left` 为 **3/4 侧身转身 + 头部刚体等比纯侧身 6 步迈步**，严格锁死头顶白蕾丝、眼睛中心（`y=92`）、下巴、裙摆和鞋底水平线，告别生硬平移与比例跳变；其余 7 组状态与 1536 × 1872 九行 57 帧布局完整保留。
- **极简霜白轻胶囊气泡**：采用通透冷白磨砂轻胶囊 + `1px` 极细描边 + `6px` 呼吸状态光点，实时播报 Agent 工具细分状态（思考 / 编辑代码 / 执行命令 / 检索 / 协作）、并发数与本轮耗时，零额外 LLM 成本。
- **深色紧凑右键菜单**：统一风格并将“开发者诊断”折叠收纳，日常操作清爽直达。

#### 陪伴交互与实用提醒
- **审批强提醒 + 一键切回 DSH**：进入 `waiting` 审批态时弹出琥珀光点常驻提醒，支持可选 Web Audio 轻柔提示音（零外部音频文件）；点击审批气泡或双击桌宠即可尝试将 DSH 主窗口置前。
- **微交互与空闲巡逻**：单击角色触发打招呼/跳跃与轻台词；空闲时自动完成「3/4 转身 → 60fps 丝滑侧身散步 → 3/4 回正」巡逻，Agent 任务到来或拖拽时立刻让位。
- **专注模式（`hideWhenIdle`）**：开启后空闲 30 秒自动收起，有新任务或审批请求立刻现身。

#### 兼容性与工程稳定性
- **扩展 DSH 兼容范围**：`engines.dsh` 更新为 `>=0.2.1-rc.3 <0.3.0 || >=0.2.2-rc.0 <0.3.0`，覆盖 0.2.1 正式版与 0.2.2 预发布/正式系列，并通过上游 `dsh-plugin-catalog` 索引器校验。
- **无重启平滑缩放**：放大/缩小直接在原生窗口原地调整尺寸与重绘，不再销毁重建 Neutralino 进程。
- **有限次崩溃自动恢复**：原生窗口意外退出后按退避策略（1.5s / 4s / 8s，最多 3 次）自动恢复。
- **下载镜像回退 + SHA-256 校验**：Neutralino 6.9.0 与素材包支持多源镜像回退（亦支持在 `local.json` 自定义 `runtimeMirrors` / `assetMirrors`），所有文件严格执行 SHA-256 校验。
- **`/kurowhale` 斜杠命令**：若宿主提供 `ctx.commands`，自动注册 `/kurowhale`（`status | show | hide | scale | topmost | bubbles | patrol | quiet | sound | focus | center | demo | resume | help`），缺失时静默降级。
- **版本号单一事实源**：`plugin/index.js` 直接读取 `plugin/package.json`，修复状态快照版本号滞后问题。

---

## English

**v0.2.0 is out!** In DSH Desktop → **Plugins → Add plugin**, enter `dsh-kurowhale-pet@0.2.0`, choose the official npm registry, install, enable, and restart.

### Highlights

- **True side-profile turn & 6-step walk (artwork `v0.2.0`):** upgrades `running-right` and `running-left` with 3/4 turn transitions and rigid-head, eye-level-locked 6-step side walking while preserving all other 7 rows and the 1536 × 1872 layout.
- **Minimal frosted capsule bubbles:** clean frosted-white pill with a 6px breathing status dot reporting live tool activity, parallel sessions, and turn duration with zero extra LLM calls.
- **Approval alerts & DSH focus:** sticky waiting bubble, optional synthesized chime, and one-click/double-click focus back to the DSH window.
- **Smooth interactions & focus mode:** flicker-free in-place scaling (no Neutralino restart), click greetings, 60fps side-profile idle patrol, `hideWhenIdle` auto-hide/wake, and bounded auto-restart on unexpected window exit.
- **Wider DSH compatibility & ecosystem integration:** `engines.dsh` widened to `>=0.2.1-rc.3 <0.3.0 || >=0.2.2-rc.0 <0.3.0`, optional `/kurowhale` slash command, dark compact context menu, and mirror fallback for automatic downloads under strict SHA-256 verification.

---

## 发行产物与校验 / Artifacts & verification

- **npm tarball (`dsh-kurowhale-pet-0.2.0.tgz`, 30 files, includes `v0.2.0` character assets):**
  - SHA-256: `cf22e4f54a24e668d84a74f399ce1d19c3a0f1737a9593de9e48a37a4e2c07b6`
  - npm integrity: `sha512-n7AHKr/rfg6ZyM6QYQcCkiiWX9VRDlpwUVW1f8sgZkXWugY0fjZek86ZAxjzCTcWcTfMYwx6B8Yb5OBEAeJ0ow==`
- **Windows code-only ZIP (`DSH-KuroWhale-0.2.0-Windows-code.zip`):**
  - SHA-256: `9a38437fa582b8cfe731ae23498aab23c995ba550523693037249e244cb5ee04`
- **Artwork `v0.2.0` SHA-256:**
  - `character/pet.json`: `2f3613cc882be81b8a6106947a64972def78eac90cc234e3095e02f7518ee45d`
  - `character/spritesheet.webp`: `7ba604af016af7974af7cb093ce927c31c993b71566eb6500d523c52ce2969a9`
- **Validation:** 28/28 Node tests, 2/2 reproducible release-bundle tests, 1/1 install-upgrade rollback test, standalone Neutralino 6.9.0 Windows visual & interactive acceptance, and upstream `buildMarketIndex` catalog check passed.
