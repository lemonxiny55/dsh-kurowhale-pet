# KuroWhale 开发路线图 / Development roadmap

## 已完成里程碑

### v0.1.x — Windows MVP 与市场规范化（已发布至 npm 0.1.4）
- [x] Windows x64 + Neutralino 6.9.0 透明悬浮窗、拖动、缩放、置顶、位置记忆、系统托盘
- [x] 黑银鲸鱼娘 9 状态 57 帧 WebP 图集与独立 SHA-256 固定校验机制
- [x] DSH Agent 状态联动（工作、审批、完成、失败、多会话优先级）
- [x] 双 manifest 一致性校验、市场仓库关联修复与可复现打包测试

### v0.2.0 — 兼容升级、极简胶囊与真侧身行走（已发布至 npm 0.2.0 & GitHub Release）
- [x] 兼容范围扩展至 `>=0.2.1-rc.3 <0.3.0 || >=0.2.2-rc.0 <0.3.0`；已同步进入 DSH Market 目录（0 安全红线）
- [x] 3/4 侧身转身 + 头部刚体等比纯侧身 6 步迈步（图集 `v0.2.0`）
- [x] 极简霜白轻胶囊 + 6px 呼吸状态光点、无重启平滑缩放、崩溃有限次自动恢复、镜像下载加速、`/kurowhale` 斜杠命令

### v0.3.0 — 多会话审批快捷浮卡、今日微统计与专注关怀（候选源码已完成，待桌面验收发布）
- [x] 多会话审批快捷浮卡（极简霜白风，查看工具与原因、支持 `approval/request` 无阻塞竞速原地允许/拒绝、一键中断活跃轮次）
- [x] 纯本地只读「今日陪伴微统计」（陪伴时长、完成轮次、工具调用、被动 Token 汇总，`/kurowhale stats`）
- [x] 久坐 50 分钟专注提醒与深夜单次轻关怀（仅空闲时触发，可一键关闭）

---

## 下一阶段规划

### v0.4.0 — 跨平台、双形态与多皮肤扩展
- [ ] 抽象 `WindowBackend` 与多平台 Neutralino 资源校验（macOS WKWebView / Linux WebKitGTK）
- [ ] 可选 `shell.overlay` 内嵌模式，支持 `dsh web` 与无原生运行时环境
- [ ] 兼容社区 Petdex 格式皮肤目录（`~/.dsh/kurowhale-pet/pets/<id>/`），支持换装与自定义角色
- [ ] GitHub Actions 自动化发布流（npm OIDC Trusted Publishing + 自动打包校验）

### 美术资产专项（独立于代码版本）
- [ ] 推进完全原创重绘的高清资产包（`artwork v0.2.0`），补全真实侧面跑动、打盹（`sleeping`）与托腮思考（`thinking`）独立动作，进一步理清长期许可边界
