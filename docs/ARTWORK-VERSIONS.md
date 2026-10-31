# 素材版本维护 / Artwork version maintenance

自动素材的唯一版本固定项位于 `plugin/resources.js`：`artworkVersion`、npm 归档 URL 和 SHA-256，以及 `pet.json`、`spritesheet.webp` 的 SHA-256。当前素材版本为 0.1.0，与插件版本独立；该归档是固定的素材来源，并非要求安装旧插件。GitHub 安装会下载并校验归档及两个文件；npm 构建脚本从同一来源校验后打包，运行时也校验包内文件。用户显式设置的路径继续由用户管理，不会被替换或按固定哈希拒绝。

升级时先确认素材许可和来源，生成新的不可变发行归档，独立计算归档及两个文件的 SHA-256，同时更新上述全部固定项和素材版本。保留旧缓存目录，运行自动测试，使用 `scripts/stage-npm.mjs` 构建候选包并比较包内文件哈希，再进行 Windows Desktop 验收。不要覆盖已有 npm 版本。

The artwork release pin lives in `plugin/resources.js`: `artworkVersion`, archive URL and SHA-256, and both file SHA-256 values. Artwork version 0.1.0 is independent of the plugin version. GitHub installs verify the archive and extracted files; npm staging obtains the same verified files, which are verified again at runtime. Explicit user paths remain user-managed.

For an upgrade, verify provenance and licensing, publish an immutable artwork archive, independently calculate all three SHA-256 values, and update the pin and artwork version together. Keep old caches, run tests, stage and compare the npm package, then perform Windows Desktop acceptance. Never overwrite an existing npm version.

## README 九状态展示 / README state preview

`docs/images/kurowhale-preview.png` 保留不变。`kurowhale-nine-states.png` 为文档用静态总览，从原有 `pet.json` 指向的 1536 × 1872 图集裁取九帧，以原始 192 × 208 尺寸放入三列排版；只添加背景和中英状态标签，不重绘、不修改图集或运行时。没有新增 GIF。

安装 Pillow 后，在 Windows 上运行（其他系统可通过 `--font` 指定支持中文的字体）：

```powershell
python scripts/build-state-preview.py --assets KuroWhale-Pet
```

也可将 `--assets` 指向已发布 npm 包的 `character` 目录。脚本核验图集 SHA-256 为 `7ae1e467778139d7da381fd860af6ebff3a3bd0385b69f9f0c278fbeb4d89298`，再按 `plugin/animations.js` 和原生渲染器的行列布局提取以下帧（从 0 计数）。素材本身的历史名称与文件内容均保留不变。

| 状态 / State | 行 / Row | 帧 / Frame |
| --- | --- | --- |
| idle | 0 | 0 |
| running-right | 1 | 2 |
| running-left | 2 | 2 |
| waving | 3 | 2 |
| jumping | 4 | 2 |
| failed | 5 | 4 |
| waiting | 6 | 2 |
| running | 7 | 2 |
| review | 8 | 3 |

The original lead preview is retained. The contact sheet uses unchanged frames from the published atlas, at their native size, with bilingual labels. The script only writes a documentation image; no character artwork, animation timing, manifest, or runtime file is edited. Artwork attribution and licensing remain in [NOTICE-ARTWORK.md](../NOTICE-ARTWORK.md) and [LICENSE-ARTWORK](../LICENSE-ARTWORK).
