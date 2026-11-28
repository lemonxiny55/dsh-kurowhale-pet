# KuroWhale 极简皮肤包规范（Skin Pack v1）

`dsh-kurowhale-pet` `v0.4.0` 支持本地皮肤包无重启热切换，并完整保留对旧版 9 行（`1536×1872`）自定义皮肤的自动降级兼容。

## 1. 目录结构

```text
my-whale-skin/
├─ manifest.json      # 皮肤包元数据（标准包必需；旧版 9 行目录可省略以兼容模式加载）
├─ pet.json           # 角色基础信息与默认精灵图文件名
├─ spritesheet.webp   # 带透明通道的 WebP 精灵图（1536×2496 为 12 行，1536×1872 为 9 行）
└─ sounds/            # 可选：自定义分级提示音（支持 .wav / .mp3 / .ogg / .webm，单文件 <= 256 KB）
   ├─ waiting.wav
   ├─ review.wav
   └─ failed.wav
```

## 2. `manifest.json` Schema (v1)

```json
{
  "schemaVersion": 1,
  "id": "my-whale-skin",
  "name": "Starry KuroWhale",
  "version": "1.0.0",
  "author": "community",
  "rows": 12,
  "columns": 8,
  "frameWidth": 192,
  "frameHeight": 208,
  "spritesheet": "spritesheet.webp",
  "pet": "pet.json",
  "sounds": {
    "waiting": "sounds/waiting.wav",
    "review": "sounds/review.wav",
    "failed": "sounds/failed.wav"
  }
}
```

### 字段约束
- `schemaVersion`: 固定为 `1`。
- `id`: 仅允许小写字母、数字、`-` 和 `_`（2–48 字符，匹配 `/^[a-z0-9][a-z0-9_-]{1,47}$/`）。
- `rows`: `12`（完整 12 组互动姿态）或 `9`（旧版兼容，前端自动将第 9–11 行降级映射至已有行：`petted -> waving`、`dozing -> idle`、`eating -> review`）。
- `frameWidth` / `frameHeight` / `columns`: 固定对齐 `192 × 208 × 8`（精灵图宽必须为 `1536px`，高为 `208px` 整数倍）。
- `spritesheet.webp`: 必须为包含 Alpha 透明通道的 WebP（`<= 8 MB`）。
- 安全路径：所有相对路径禁止包含 `..`、盘符或绝对路径。

## 3. 皮肤校验脚本

校验标准皮肤包（要求含 `manifest.json`）：

```powershell
npm run validate-skin -- ./path/to/my-whale-skin --strict
```

校验旧版 9 行兼容目录或仅校验结构（输出 JSON）：

```powershell
node scripts/validate-skin.mjs ./KuroWhale-Pet --json
```

## 4. 热切换与故障自愈
- 可在桌宠右键菜单「切换本地皮肤…」或斜杠命令 `/kurowhale skin <目录>` 无重启切换。
- 如皮肤目录校验失败、文件缺失或 WebView2 解码失败，插件将自动回滚至默认官方素材并在 `lifecycle.jsonl` 记录日志，绝不影响 DSH 主窗口运行。
