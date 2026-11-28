# KuroWhale 黑色系鲸鱼娘桌宠 v0.4.0 发布说明 / Release notes

> **状态：v0.4.0 发版准备完成。** 延续零新增外部监听端口、`0` 安全红线与 Neutralino 6.9.0 + WebView2 轻量架构，兼容 DSH Desktop `>=0.2.1-rc.3` 并将全部外部资源下载保留严格 SHA-256 校验。

## 中文亮点

### 1. 底盘稳固与无干扰专注（M1）
- **混合 DPI / 多屏坐标自愈**：`position.json` 升级为「显示器标识 + 工作区相对百分比锚点」（完全兼容 `v0.3.0` 旧版纯像素坐标自动迁移）；启动、切屏或显示器热插拔检测到越界时，自动吸附回主屏可见工作区安全范围并记录日志。
- **智能鼠标穿透（Smart Click-through）**：右键菜单、系统托盘与 `/kurowhale clickthrough` 新增「专注穿透模式」，角色半透明常驻不挡点击；遇到 `waiting`（等待审批/问答/方案评审）或 `failed` 状态时自动临时取消穿透并高亮唤醒胶囊，处理完成后自动恢复穿透态。
- **一键复制脱敏诊断信息**：托盘、右键开发者菜单与 `/kurowhale diag` 一键汇总插件版本、DSH 宿主版本、显示器/DPI、Neutralino 运行态与最近错误日志，自动脱敏用户主目录路径与敏感 Token 字段。

### 2. 全桌面轻提醒闭环与霜白浮卡升级（M2）
- **分级轻提示音与勿扰时段**：基于原生 Web Audio 合成三类克制提示音（`waiting` / `review` / `failed`），支持右键/托盘/`/kurowhale mute` 一键静音及 `/kurowhale dnd [on|off|HH:MM-HH:MM]` 跨夜勿扰时段配置。
- **Windows 原生 Toast 通知联动**：当 DSH 主窗口失焦且触发等待/完成/失败事件时，通过内置 WinRT Toast（自动降级系统托盘气泡，免编译零重依赖）弹出轻量提醒，点击通知可展开霜白浮卡或置前 DSH。
- **霜白浮卡能力增强**：3 个以上活跃会话自动折叠并支持一键展开/收起，避免浮卡撑爆高度；结合 DSH 会话事件平滑兼容 `question`（快捷选项）与 `plan-review` 入口，上游字段缺失时优雅降级不报错。

### 3. 轻养成循环与社交战报卡（M3）
- **「工作攒小鱼干」正向循环**：`~/.dsh/kurowhale-pet/stats.json` 平滑迁移至 v2 结构，保留全部旧字段并新增小鱼干库存、连续陪伴天数与里程碑徽章；完成轮次、处理审批或每 5 次工具调用自动攒鱼干，喂鱼消耗库存并触发里程碑专属粒子与隐藏短句；库存为 0 也可可爱互动并给出俏皮攒鱼提示。
- **一键生成「Vibe Coding 陪伴战报卡」**：浮卡与 `/kurowhale report [today|week]`（或 `/kurowhale stats export`）可在本地用 Canvas 绘制黑蓝霜白极客风格 PNG 战报卡（含陪伴时长、完成轮次、工具调用、审批数、只读 Token 用量、喂鱼数、鲸鱼娘立绘与极小 `dsh-kurowhale-pet` 标识），支持保存 PNG 与一键复制到剪贴板。

### 4. 极简皮肤包生态（Skin Pack）与热切换（M4）
- **本地皮肤包无重启热切换**：制定并文档化 [皮肤包规范](SKIN-PACK.md)（`manifest.json` + `spritesheet.webp` + `pet.json` + 可选分级音效），保留对旧版 9 行自定义皮肤的自动降级兼容；支持在右键菜单/浮卡/`/kurowhale skin <dir|reset>` 无重启切换，异常时自动回滚默认皮肤并记入日志。
- **皮肤校验脚本**：新增 `scripts/validate-skin.mjs`（`npm run validate-skin -- <dir>`），自动校验 JSON Schema、精灵图 1536px 对齐、WebP Alpha 透明通道与路径安全。

---

## English highlights

- **Mixed-DPI multi-display self-healing, Smart Click-through & redacted diagnostics (M1):** upgrades position persistence to display ID + work-area percentage anchors with legacy migration and automatic out-of-bounds recovery; adds translucent click-through mode with automatic wake/highlight on `waiting`/`failed` states; adds one-click redacted diagnostic clipboard export.
- **Tiered desktop alerts & upgraded frosted card (M2):** adds lightweight Web Audio chimes (`waiting`/`review`/`failed`), mute toggle, overnight DND quiet hours, unfocused Windows Toast notifications (click to open card or focus DSH), 3+ active session collapse/expand, and graceful `question` / `plan-review` support.
- **Dried-fish progression & Vibe Coding report card (M3):** smoothly migrates `stats.json` to earn fish snacks from completed work, spend them on feeding with streak/milestone particles, and render local Canvas PNG daily/weekly Vibe Coding report cards (save PNG or copy to clipboard).
- **Hot-swappable Skin Packs & validator (M4):** adds [docs/SKIN-PACK.md](SKIN-PACK.md), `scripts/validate-skin.mjs` (`npm run validate-skin`), and restart-free local skin hot-swapping (with 9-row legacy fallback, optional custom alert sounds, and automatic rollback to default artwork on error).
