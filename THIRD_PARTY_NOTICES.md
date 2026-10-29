# Third-party scope / 第三方范围

The repository's original code is MIT by the owner's explicit decision on
2026-10-29. This does not relicense the character or third-party components.

|Component|Version / source|Distribution and obligations|
|---|---|---|
|Neutralino JS client|`@neutralinojs/lib@6.9.0`, https://www.npmjs.com/package/@neutralinojs/lib/v/6.9.0|Vendored unchanged as `plugin/native/neutralino.js`; MIT. Keep the complete original `plugin/native/LICENSE-neutralinojs.txt` in packages.|
|Neutralino native runtime|6.9.0, https://github.com/neutralinojs/neutralinojs/releases/tag/v6.9.0|External prerequisite, **not bundled**. The native core and its incorporated libraries have their own notices; client MIT alone is not a complete native-binary notice. Review the tagged native source notices before any future binary redistribution.|
|Microsoft Edge WebView2 Runtime|Machine-installed version, https://developer.microsoft.com/microsoft-edge/webview2/|External Microsoft runtime; not MIT and not bundled. Installation/use follows Microsoft's applicable terms. No silent runtime installation or security bypass.|
|DSH Desktop / its Node, Cordis and package manager|DSH Desktop 0.2.1-rc.3|External host, not redistributed. Its licenses are not replaced by this repository's MIT. The plugin declares no npm runtime dependencies; host services and Node built-ins are used.|
|Node / PowerShell / Python|Node >=22.18.0 (24 recommended); PowerShell 7; Python >=3.10 for building only|External tools, not bundled. Installing the prepared code bundle does not require Python or npm. DSH's bundled CLI handles its own dependencies.|
|Upstream pet projects|sereinmono/dsh-desktop-pet; Luv061211/dsh-pet|Consulted for format/API research. No upstream source tree, built-in art, executable or package is included in the plugin. This statement does not claim those projects' licenses cover KuroWhale.|

MIT utility icon: the 20×20 monochrome K tray icon was authored for this
project. It contains no character illustration or DeepSeek logo.

Machine-readable distribution inventory and hashes: `dependencies.lock.json`.
The inventory covers shipped files plus explicit external prerequisites; it is
not a claim to enumerate every transitive component inside external DSH,
WebView2 or Neutralino executables. There are no vendored Python libraries.

Local art-processing tools observed on 2026-10-29: Pillow 12.3.0 (MIT-CMU),
NumPy 2.3.5 and SciPy 1.16.3 (BSD notices, plus incorporated dependency
notices if their distributions are redistributed). These are external tools,
not shipped here; observed versions are not a recovered lockfile proving the
exact earlier production environment. Original requirements used lower bounds.

美术与截图不属于代码许可。角色原始图来源链尚未核清，现有美术、派生
精灵图和角色截图均不得作为公开发行素材。安装包只包含代码、通用 K 图标
和许可说明，不包含角色图片、私人日志、配置或运行时可执行文件。
