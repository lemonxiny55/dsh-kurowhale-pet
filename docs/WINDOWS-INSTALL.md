# Windows 安装与恢复 / Windows installation and recovery

目标：Windows x64、DSH Desktop **0.2.1-rc.3**、PowerShell 7、Node >=22.18.0（推荐 24）。
代码子包**不含美术或运行时 exe**；完整 Windows 包另含角色图集，运行时须单独取得。参考图来源及授权不确定性见 [素材与授权说明](ASSETS_AND_LICENSE.md)。

仅支持当前用户的默认 `~/.dsh/profiles/desktop`。自定义 DSH_HOME 会明确拒绝，避免误改错误目录；不自动迁移 profile。

## 准备 / Prerequisites

需要正常初始化的 Desktop `desktop` profile、合法本地角色包（pet.json 和透明 WebP 1536×1872）、[官方 Neutralino 6.9.0 x64](https://github.com/neutralinojs/neutralinojs/releases/tag/v6.9.0) 和已安装 WebView2。[Microsoft 分发说明](https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution)。下载固定 URL、ZIP/exe 哈希见 dependencies.lock.json。安装器不下载、不安装运行时、不改模型、不创建 profile。

校验哈希检测损坏，不是发布者签名；请从可信渠道取得包及校验值。外部运行时遵守其自己的许可，不归本项目 MIT 覆盖。

## 安装 / Install

解压代码包，将示例路径替换为自己的路径。Check 只检查文件和版本，不改 DSH，也不证明桌面显示：

```powershell
pwsh -File .\scripts\install-windows.ps1 -Action Check `
  -DshInstall 'E:\DeepSeek Harness' `
  -AssetDirectory 'D:\MyPets\KuroWhale-Pet' `
  -RuntimePath 'D:\Tools\Neutralino-6.9.0\neutralino-win_x64.exe'
```

等待所有任务结束并退出 Desktop。安装器发现 DSH 仍运行会拒绝修改，不强杀进程。

```powershell
pwsh -File .\scripts\install-windows.ps1 -Action Install -TasksEnded `
  -DshInstall 'E:\DeepSeek Harness' `
  -AssetDirectory 'D:\MyPets\KuroWhale-Pet' `
  -RuntimePath 'D:\Tools\Neutralino-6.9.0\neutralino-win_x64.exe'
```

使用 Desktop 内置 CLI `plugin --profile desktop add <tgz> --ignore-scripts`，避免 PATH 的旧 dsh。备份在 `~/.dsh/kurowhale-pet/backups/<时间>/`，按字节复制插件配置/锁文件，不解析模型密钥。不要上传备份。只在自身 local.json 合并三个 renderer/path 字段，保留其他值。无管理员权限、自动重启或静默联网安装步骤。

请将解压目录放在准备长期保留的位置。当前 CLI 将本地 tgz 路径记录到插件依赖；未来依赖重建可能需要它，安装后不要立即删除该目录。升级或卸载后再按需清理旧安装包。

重新打开原 Desktop，检查原界面和**实际可见角色**。检查自己 status.json 的版本和新鲜度；rendererReady 只是通信/图集状态，不等于人眼看见。界面失败时停止重复启动，先回滚。

## 使用、卸载与回滚 / Use, uninstall, rollback

右键角色可缩放、置顶、居中、隐藏、关闭。隐藏用通知区域 K 图标恢复。关闭退出 Native 和托盘，可用 `node scripts/pet-control.mjs show` 重建。位置、大小、可见性及置顶独立记忆。

当前单屏 150% DPI 下，scale=0.5 的画布宽 96，但实际原生窗口宽 202，存在额外透明留白；画布内容没有裁切。最低缩放下细节很小，常用 scale=1.25。其他系统 DPI 与多显示器尚未验收。

确认任务结束、退出 Desktop 后，只卸载本插件：

```powershell
pwsh -File .\scripts\install-windows.ps1 -Action Uninstall -TasksEnded `
  -DshInstall 'E:\DeepSeek Harness'
```

自有美术、配置与备份保留，其他插件不删除。再打开 Desktop 验证原有功能。

命令失败时，安装器尝试通过同一 CLI 恢复备份的旧插件目录（或移除本次首次安装），恢复自己的 local.json，并明确报告成功与否。备份目录可能成为旧包引用，不能随意删除。恢复操作完成后仍须启动验证。

若安装成功但启动失败，保持 DSH 关闭，用上面的卸载先移除 KuroWhale。可重装可信旧 tgz，或：

```powershell
& 'E:\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd' plugin `
  --profile desktop add '<backup>\previous-package' --ignore-scripts
```

官方 CLI 也无法修复时，才按私有 backup-manifest.json 恢复 package/lock/workspace/patch 文件，并恢复对应依赖一致性；只拷配置不能保证 node_modules 同步。恢复前确认期间无其他插件变动。**不要整份恢复旧 cordis.yml 或模型配置覆盖后续用户修改**，不要重置整个 profile。原始日志/备份不上传。

## 可复现构建 / Reproducibility

```powershell
python scripts/build-windows-bundle.py --output .acceptance/build-a
python scripts/build-windows-bundle.py --output .acceptance/build-b
Get-FileHash .acceptance/build-*/DSH-KuroWhale-*-Windows-code.zip
```

只用 Python >=3.10 标准库，白名单输入、固定排序/时间/权限，无网络。相同文件字节、Python 实现生成相同 tar/gzip/ZIP。安装准备包不需要 Python 或 npm。

## English

This code-only bundle requires existing initialized DSH Desktop rc3, Node,
PowerShell 7, pinned Neutralino 6.9.0 x64, machine-installed WebView2, and a
lawfully obtained compatible character pack. Run Check, finish tasks and exit
Desktop, then Install -TasksEnded. No profile is created or credentials parsed.
Reopen Desktop and verify actual visibility and the original app.

Private backups remain under the pet's own directory. Uninstall removes only
this plugin. Failed operations attempt official-CLI rollback and explicitly
report the outcome; post-startup failure requires closing Desktop and removing
the plugin or reinstalling a known-good package, then verifying again. Never
restore older model settings over newer changes. An unpacked bundle on this
machine is not clean-Windows or new-user installation qualification.
