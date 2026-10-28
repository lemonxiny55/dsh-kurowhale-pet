# Windows 原生窗口可见性修复 / Native visibility fix

日期：2026-10-28，Asia/Shanghai。测试对象：当前使用的 DSH Desktop **0.2.1-rc.3**、Windows x64、Neutralino **6.9.0**。继续使用原 `desktop` profile，没有创建隔离 profile。

## 根因与修复范围

在这台 Windows / WebView2 环境中，启动 GUI 运行时的 `spawn(..., {windowsHide:true})` 会使窗口外框和原生 API 看起来正常，但 WebView 内容不出现在屏幕上。仅改为 `windowsHide:false`，内容即可显示。反向恢复 `true` 后再次复现空白。

这是本机可复现的兼容性结论，不推断所有 Windows / WebView2 版本都有相同行为。未进一步追踪 WebView2 内部隐藏机制。不要对 GUI 运行时使用该标志；清理进程所用的 `taskkill` 是控制台命令，仍保留 `windowsHide:true`。

本次代码：`overlay.js` 修正 GUI 启动参数，并提供 `inspect()`；原生页面返回 DPR、Canvas 缓冲和 CSS 尺寸；宿主只记录这些无内容的诊断。默认仍需显式 opt-in。没有增加 Agent 联动、养成或角色功能，没有修改美术。

## 单变量测试

窗口初始为屏幕居中的 400×400 普通不透明窗口，亮粉色背景和 `KuroWhale Test` 文字。各轮先销毁上轮自建窗口，再使用同一运行时启动；阶段名称/标题仅用于辨认，不是渲染条件。

|轮次|相对上一配置的关键变量|原生 isVisible|真实屏幕结果|
|---|---|---|---|
|A|基线：windowsHide=true|true|外框可见、内容空白，**失败**|
|B|仅 windowsHide=false|true|亮粉色背景、黑色文字可见，**通过**|
|A′|仅改回 windowsHide=true|true|再次空白，**复现失败**|
|C|恢复 false，启用 transparent；与 B 比较仅透明开关不同|true|亮色内容可见，**通过**|
|D|仅启用 borderless|true|内容可见，**通过**|
|E|仅启用 alwaysOnTop|true|内容可见，**通过**|
|F|仅启用 skipTaskbar|true|内容可见，**通过**|

透明模式测试保留不透明的亮色 HTML 测试块，以判断内容是否出现；随后才换成原角色透明 Canvas。普通测试窗口 API 位置 `(1080,600)`、大小 `400×400`、`isMinimized=false`。这些原生数值本身不算视觉通过。

独立原生预检加载现有精灵图后，截图见完整角色，用户确认“能看到鲸鱼娘”。随后才安装修复版到当前 DSH；预检结果与插件结果分开记录。

## 当前 DSH 插件验收结果

|检查|结果|证据边界|
|---|---|---|
|0.0.2-dev.2 安装、宿主加载|通过|当前 Desktop 内置 CLI 安装、实际宿主/Native 进程|
|角色在当前 DSH 启动后真实可见|**通过**|桌面窗口截图有完整角色；用户明确确认“能看到 DSH 插件启动的鲸鱼娘”|
|卸载 KuroWhale|通过|窗口退出；七个原配置文件 SHA256 全部恢复一致|
|卸载后 DSH 重启|通过|真实会话界面正常，没有旧前端模块错误|
|重新安装同一版、携带插件冷启动|通过|新的宿主/Native 进程，截图再次捕捉到完整角色，DSH 会话界面正常|
|未关联配置保持|通过哈希核对|workspace、生成配置、桌面选择/设置保持；原依赖/bundles 只增加 KuroWhale|
|本轮新增模型请求|未测试|只检查原配置哈希和正常 UI；未花费模型请求、未读取密钥|
|结构/安全单元测试|7/7 通过|普通 Windows 进程运行；不是桌面视觉验收替代|

本轮显示问题的成功标准已经满足。最终保留当前 DSH 中的修复版 `0.0.2-dev.2`，KuroWhale 自有配置显式启用渲染，其余配置不重设。

恢复测试中有一次**测试脚本失败**：`taskkill /T` 对部分 Chromium 沙箱子进程返回错误码，脚本遂自动回滚。事后核对 DSH 主进程已经退出并正常重新启动，KuroWhale 已卸载，七个原配置哈希一致。修正私有重启脚本为检查目标主进程是否实际退出，而不是仅判断整个进程树命令的返回码，才重复同一版本的恢复/冷启动测试。不是插件启动失败，也不隐去这次回滚。

这些重启使用用户已授权的精确目标进程树终止并重新启动，**不冒充优雅退出测试**。

## DPI 与边界

实测 `devicePixelRatio=1.5`。插件 scale=1.25 时，窗口 API 为 `240×347` 物理像素；Canvas 缓冲 `240×347`，CSS `160×231.333`，视口 `160×232`。角色绘制占 `240×260` 物理像素，对应约 `160×173.33` CSS 像素。多出的底部空间保持透明。

Canvas CSS 尺寸除以 DPR 一次，缓冲尺寸不重复除以 DPR；本次不改变该换算。截图可见完整头饰、头发、裙摆、鞋与尾巴。150% 是本轮唯一实测的系统 DPI；没有宣称跨显示器/DPI 全覆盖。

## 本机证据与保护

私有目录 `.acceptance/visibility-20261028/` 保存各阶段截图、原生 API JSON、安装日志与插件窗口截图。`.acceptance/visibility-backup-20261028/` 保存七个配置文件的字节备份及 KuroWhale 自有 local/position 文件。配置内容和私人日志不提交 Git；角色截图也只在本机交付，不上传 GitHub。

关键本地文件：`opaque-hide-true-repeat.jpg`、`opaque-hide-false.jpg`、`transparent.jpg`、`borderless.jpg`、`topmost.jpg`、`skip-taskbar.jpg`、`atlas-standalone.jpg`、`atlas-desktop-plugin.jpg`、`atlas-desktop-cold-start.jpg`、`dsh-normal-after-cold-start.jpg`。最后一张仅证明 DSH 自身界面正常；角色证据使用 Native 窗口截图，不能从仅捕获单个 DSH 窗口的截图推断其他悬浮窗口被遮挡或消失。

主要时间（Asia/Shanghai）：20:06 普通窗口对比；20:07 反向复现与透明测试；20:08 完成四种窗口条件及精灵图预检；随后当前 DSH 插件显示、用户目视确认；20:16 回滚后 DSH 正常界面；20:17 同一修复版冷启动，角色再次可见。详细 UTC 时间保留在私有 JSON 中。

开始时 DSH 进程为零，启动已安装的 Desktop 后界面正常。用户再次确认所有任务结束，才在当前环境安装 `0.0.2-dev.2`。使用桌面内置 CLI；不是 PATH 中的旧版 CLI。安装期间自动监控启动错误和验收超时，失败即移除 KuroWhale 并恢复自有配置，其他插件不删除。

`rendererReady` 仅表示通讯和图像解码就绪。运行时 `visibilityVerified` 保持 false，表示程序不具备自动判断人眼可见性的能力；人工验收应看本报告和截图，不能由 IPC 回执自动置真。

## 复现方法

使用已取得的官方 Neutralino 6.9.0 Windows 运行时；以下脚本只创建自身的临时窗口，不安装或配置 DSH：

```powershell
node scripts/probe-native-window.mjs '<official-runtime.exe>' hidden 60
node scripts/probe-native-window.mjs '<official-runtime.exe>' opaque 60
node scripts/probe-native-window.mjs '<official-runtime.exe>' hidden 60
node scripts/probe-native-window.mjs '<official-runtime.exe>' transparent 60
node scripts/probe-native-window.mjs '<official-runtime.exe>' borderless 60
node scripts/probe-native-window.mjs '<official-runtime.exe>' topmost 60
node scripts/probe-native-window.mjs '<official-runtime.exe>' skip-taskbar 60
```

每次只运行一条，观察并保存桌面截图，等它清理自身窗口后再运行下一条。日志中的原生 API 结果不是视觉验收。脚本不读取 DSH/模型凭据；仅使用其新建原生窗口自身的短期 IPC 能力，不输出能力值。

官方接口依据：[Neutralino window API](https://neutralino.js.org/docs/api/window/)、[Neutralino 配置](https://neutralino.js.org/docs/configuration/neutralino.config.json/)、[Node spawn 参数](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options)。实际结论来自本机逐项实验。

## 尚未覆盖

本次只验收窗口显示。九状态、拖动、缩放、隐藏/恢复、真实工具调用、审批、多会话和 CPU/内存没有在本轮重新完整验收。美术授权仍待确认，因此整体 v0.1.0 发布标准仍未满足。没有发布 npm、Release 或上传美术。
