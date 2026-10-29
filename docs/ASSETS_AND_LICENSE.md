# 角色素材与授权规范 / Asset and licensing policy

## 当前状态 / Current status
2026-10-29：所有者明确决定“代码采用 MIT，美术稍后决定”。插件、脚本、测试、文档和通用 K 托盘图标由根目录 LICENSE 覆盖。美术未获公开分发许可，不得上传公开仓库。第三方组件单独见 THIRD_PARTY_NOTICES.md。

Original code is MIT; artwork remains reserved pending clearance. This document grants no artwork license.

## 基本原则 / Principles
1. 只提交有权发布的素材；记录原图、修改、生成过程与使用工具。
2. 第三方代码和素材的授权分开核查；保留需要的版权和许可证声明。
3. 不使用 DeepSeek 官方 Logo 或容易使用户误认为得到官方认可的标识。
4. 若使用 MIT 代码，保留其原有版权和许可通知；检查各依赖的许可与义务。
5. 不把工作图、未经定稿素材、凭据或私人数据直接推送到公开仓库。
6. 正式发布前按目标地区和发布方式检查可能涉及的版权、商标及商业使用风险。

## 建议的资产记录 / Suggested provenance record
对每份素材记录：文件名、来源、作者或生成流程、生成/修改日期、许可证或授权证明、可否再分发/商用、是否需要署名、审核状态。

## 分发说明 / Distribution
美术最终确定许可后，再分别声明原图、派生透明图、动画、精灵图和预览的权利范围。用户不能仅根据仓库公开可见或下载免费就推定美术可自由复用。

Code and artwork have distinct terms. Public availability does not establish artwork rights.

## 来源核查 / Provenance audit — 2026-10-29

|阶段|已知事实|证据缺口|
|---|---|---|
|最早参考|所有者说明：浏览器找到蓝白鲸鱼娘，再用 ChatGPT 仿照生成|本地低分辨率 JPEG 已查看并记录哈希；Google 缩略图不是原作者或原作品的许可证明。作者、作品身份、原网页未知|
|黑白候选原图|用户提供 1010×1557 PNG，上游使用 ChatGPT|具体模型、日期、完整提示词与生成对话未提供；不能说整个创作过程“未使用 AI”|
|抠图与动画|2026-10-28 的 Pillow/NumPy/SciPy 确定性加工、局部遮罩、动作和几何道具|这个加工阶段没有 AI 补画；不能借此认定上游参考权利已清除|
|文件溯源|生产时本地来源字节比较与后续 RGB 像素比较分别记录|像素一致不等于 PNG 文件字节一致。保留旧记录的时间范围|
|动画完整性|原有 81 个图像文件上轮与原交付包逐字节一致|本轮不改美术，不将角色图或角色截图上传 Git|

参考文件哈希、所有者说明及来源 URL 保存在本地私有验收目录；不公开参考图片和私人对话。同目录另两份鲸鱼标识不视作授权素材，也未加入角色包。外观比较不能独自证明权属或侵权；缺少权利证明也不能认定有公开发行权。

[OpenAI 使用条款](https://openai.com/policies/terms-of-use/)安排用户与 OpenAI 之间的输出权利，并要求用户拥有输入所需权利；它不是第三方角色权利的许可或保证。还须按实际生成时间、地区及服务核对适用条款。

## 授权方案建议，尚未生效 / Proposed art options, NOT grants

|方案|可允许的范围|需接受的条件|
|---|---|---|
|代码 MIT（已决定）|使用、修改、再分发及商用|保留版权和许可；不扩展到美术|
|美术 CC BY 4.0（候选）|署名、注明修改后分享/改编，包含商用|不能追加禁止商用条件|
|美术 CC BY-NC 4.0（候选）|署名的非商业分享和改编|非商业不等于免费下载；整套素材不能宣传为无条件开源|
|独立角色使用许可（候选）|明确允许公众免费下载安装/运行，另约定镜像、改编、直播展示与商用|需要有权授权者签署清晰条款；“保留全部权利”本身没有授予下载分发许可|

方案只在上游参考权利已经核清、许可人有权授权的范围内成立。官方说明：[MIT](https://opensource.org/license/mit)、[CC BY](https://creativecommons.org/licenses/by/4.0/)、[CC BY-NC](https://creativecommons.org/licenses/by-nc/4.0/)、[许可选择](https://creativecommons.org/chooser/)。限制代码商用不符合 [OSI 开源定义](https://opensource.org/osd)。**没有替所有者选择任何美术许可。**

最短路径：找到参考作者/作品页并取得改编和公开再分发许可 → 保存权利凭证 → 权利人决定美术许可及署名 → 为最终美术包记录条款、版本和哈希 → 验证下载后的全套安装。若无法清权，另行委托有完整来源记录的原创设计；本轮不自动替换。

现在可准备 MIT 代码包，使用者自行提供合法兼容美术；不能称为已清权的 KuroWhale 完整发行包。

## 本轮找到的来源线索，尚非完整授权链 / New leads, not clearance

进一步检索发现相关社区形象的公开来源链条线索。原角色创作者“上善无形”的
[2026-08-02 原始动态](https://www.bilibili.com/opus/1231977657712771073)
明确声明该动态内容采用 CC BY-NC-SA 4.0。这证明该发布内容存在许可声明，
**尚不能证明用户提供的这张 360×555 Q 版参考图就是该作品或覆盖其后续所有改编**。
参考 JPEG 没有 EXIF 作者信息。

另有公开衍生项目记录“上善无形 → ZipZipPipe → 后续 Q 版加工”的线索；
[YunYueSama 的素材说明](https://github.com/YunYueSama/codex-deepseek-pet/blob/main/ASSET_LICENSE.md)
也明确保留社区参考图的权利缺口，不能把其自定义项目许可扩展到未清权参考图。
ZipZipPipe 的具体原发布页在本轮访问受限，精确 Q 版来源与中间作者尚未确认。

若最终确认参考受 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
约束，公开演绎贡献还须满足署名、非商业与相同方式共享等适用条件，不能任意
改选上表的 CC BY 或自定义限制；除非另获相关权利人授权。现阶段仍不为本包
自动应用任何美术许可证，也不因发现相近角色的许可而宣布全套已清权。

English: The owner selected MIT for original code on 2026-10-29. The illustration was generated with ChatGPT using an online blue-and-white character reference. Its author's identity and adaptation/redistribution permission remain unknown. Later cutout/animation work used no generative redraw; that limited statement does not clear the upstream reference. Keep artwork and character screenshots private until clearance and a separate explicit artwork grant. CC BY, CC BY-NC and a custom character-use license are proposals only. No license cures missing upstream rights.
