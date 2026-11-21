# KuroWhale 开发路线图 / Development roadmap

## 已完成里程碑

### v0.1.x — Windows MVP 与市场规范化（已发布至 npm 0.1.4）
- [x] Windows x64 + Neutralino 6.9.0 透明悬浮窗、拖动、缩放、置顶、位置记忆、系统托盘
- [x] 黑银鲸鱼娘 9 状态 57 帧 WebP 图集与独立 SHA-256 固定校验机制
- [x] DSH Agent 状态联动（工作、审批、完成、失败、多会话优先级）
- [x] 双 manifest 一致性校验、市场仓库关联修复与可复现打包测试

### v0.2.0 — 兼容升级与核心陪伴体验（候选源码已完成，待实机验收发布）
- [x] 兼容范围扩展至 `>=0.2.1-rc.3 <0.3.0 || >=0.2.2-rc.0 <0.3.0`；版本号单一事实源
- [x] 无重启平滑缩放、黑银紧凑右键菜单（诊断折叠）、崩溃有限次自动恢复
- [x] Neutralino 与素材多镜像源 fallback（强 SHA-256 校验不变）
- [x] 可选 `/kurowhale` 斜杠命令（探测 `ctx.commands`，缺失时静默降级）
- [x] 本地双语气泡台词（细分思考/编码/命令行/检索/子 Agent 并行与本轮耗时，零 LLM 成本）
- [x] 审批常驻气泡 + 可选 Web Audio 轻提示音 + 点击/双击一键切回 DSH 窗口
- [x] 单击微互动、空闲自主巡逻（盘活既有左右跑与挥手动画）、`hideWhenIdle` 专注模式

---

## 下一阶段规划

### v0.3.0 — 跨平台与多形态扩展
- [ ] 抽象 `WindowBackend` 与多平台 Neutralino 资源校验（macOS WKWebView / Linux WebKitGTK）
- [ ] 可选 `shell.overlay` 内嵌模式，支持 `dsh web` 与无原生运行时环境
- [ ] 兼容社区 Petdex 格式皮肤目录（`~/.dsh/kurowhale-pet/pets/<id>/`），支持换装与自定义角色
- [ ] GitHub Actions 自动化发布流（npm OIDC Trusted Publishing + 自动打包校验）

### 美术资产专项（独立于代码版本）
- [ ] 推进完全原创重绘的高清资产包（`artwork v0.2.0`），补全真实侧面跑动、打盹（`sleeping`）与托腮思考（`thinking`）独立动作，进一步理清长期许可边界
