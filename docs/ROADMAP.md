# KuroWhale 开发路线图 / Development roadmap

## 目标 / Goal
优先发布可安装、能稳定显示透明 Q 版角色、并能响应 DSH Agent 状态的 Windows MVP。先验证真实宿主 API 和运行兼容性，不以未运行的样例代码充当成果。

Ship a small, verified Windows-first desktop companion before exploring Live2D, voice, or progression systems.

## P0 — 技术调研与兼容性验证
- [ ] 固定目标 DSH 版本与 Windows 测试环境
- [ ] 查阅 DSH 插件 SDK、实际事件名、安装及打包规则
- [ ] 比较现有开源桌宠底座的代码许可证和素材许可证
- [ ] 用最小测试窗口确认透明、置顶、拖动、关闭与卸载行为
- **验收 / Done when:** 测试环境、版本、验证记录、已知问题均明确

## P1 — 角色资产 / Character pack
- [ ] 定稿黑白 Q 版鲸鱼娘及独立原创鲸鱼徽章
- [ ] 透明角色 PNG；备份来源与编辑记录
- [ ] 动态精灵图及配置，按选定引擎的**真实**规范生成
- [ ] 至少三组可识别的动画：待机、工作、等待审批
- [ ] 逐帧检查一致性、透明边缘与小尺寸显示
- **验收 / Done when:** 通过文件校验，且在选定运行器中可实际播放

## P2 — DSH 插件 / Plugin MVP
- [ ] Agent 工作/空闲状态映射
- [ ] 用户审批提醒（仅使用宿主允许的可靠事件）
- [ ] 透明窗口拖动、缩放、位置保存、隐藏、恢复
- [ ] 多会话优先级与状态去抖
- [ ] 退出与卸载后无残留窗口、进程
- **验收 / Done when:** Windows + 目标 DSH 版本的端到端手工测试通过

## P3 — 发布 / Release
- [ ] 版权声明和依赖清单逐项检查
- [ ] 中英安装、卸载、故障排查说明
- [ ] 可复现构建、包结构校验、基础安全审查
- [ ] 演示 GIF、截图（仅使用有权利发布的素材）
- [ ] GitHub Release 与实际受支持的插件渠道
- **验收 / Done when:** 新用户可依文档安装并复现基本功能

## 非 MVP / Deferred
Live2D、语音聊天、养成系统、额外皮肤、macOS/Linux 支持。

## 风险 / Risks
- DSH API 或桌面窗口桥接可能随版本变动
- 精灵图规范须以最终选定运行器文档为准
- 代码 MIT 不等于所有角色素材自动允许商用
- 切忌宣称未经实测的兼容性
