# Code-only installer. No model/credential parsing, downloads or auto-restarts.
[CmdletBinding()]
param(
 [ValidateSet('Check','Install','Uninstall')][string]$Action='Check',
 [Parameter(Mandatory=$true)][string]$DshInstall,
 [string]$AssetDirectory,
 [string]$RuntimePath,
 [string]$BundleRoot=(Split-Path $PSScriptRoot -Parent),
 [switch]$TasksEnded
)
$ErrorActionPreference='Stop'
if(-not $IsWindows){throw 'Windows and PowerShell 7 are required.'}
$kwBundle=[IO.Path]::GetFullPath($BundleRoot)
$kwManifestPath=Join-Path $kwBundle 'bundle-manifest.json'
$kwManifest=Get-Content -LiteralPath $kwManifestPath -Raw | ConvertFrom-Json
if($kwManifest.name -ne 'dsh-kurowhale-pet' -or $kwManifest.artworkIncluded -ne $false){throw 'Invalid code-only bundle manifest.'}
foreach($kwEntry in $kwManifest.files.PSObject.Properties){
 $kwFile=[IO.Path]::GetFullPath((Join-Path $kwBundle $kwEntry.Name))
 if(-not $kwFile.StartsWith($kwBundle.TrimEnd('\','/')+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Bundle path escapes extraction directory.'}
 if((Get-FileHash -LiteralPath $kwFile -Algorithm SHA256).Hash -ne $kwEntry.Value){throw ('Bundle integrity mismatch: '+$kwEntry.Name)}
}
if([IO.Path]::GetFileName($kwManifest.package) -ne $kwManifest.package -or -not $kwManifest.files.PSObject.Properties[$kwManifest.package]){throw 'Invalid package reference.'}
$kwCli=Join-Path ([IO.Path]::GetFullPath($DshInstall)) 'resources/runtime/cli/bin/dsh.cmd'
if(-not (Test-Path -LiteralPath $kwCli -PathType Leaf)){throw 'Desktop bundled CLI not found. Specify the installed Desktop directory.'}
$kwVersion=(& $kwCli --version 2>$null | Out-String).Trim()
if($LASTEXITCODE -ne 0 -or $kwVersion -notmatch '(?<![\w.])0\.2\.1-rc\.3(?![\w.-])'){throw 'This candidate requires the Desktop-bundled CLI 0.2.1-rc.3.'}
$kwNode=(& node --version).Trim()
if([version]$kwNode.TrimStart('v') -lt [version]'22.18.0'){throw 'Node >=22.18.0 is required.'}
$kwProfile=Join-Path $env:USERPROFILE '.dsh/profiles/desktop'
if($env:DSH_HOME -and [IO.Path]::GetFullPath($env:DSH_HOME).TrimEnd('\','/') -ne [IO.Path]::GetFullPath((Join-Path $env:USERPROFILE '.dsh')).TrimEnd('\','/')){throw 'Custom DSH_HOME is not supported by this desktop-profile installer.'}
if(-not (Test-Path -LiteralPath (Join-Path $kwProfile package.json))){throw 'Initialize DSH Desktop normally first. The installer does not create profiles or configure models.'}
$kwPet=Join-Path $env:USERPROFILE '.dsh/kurowhale-pet'
$kwOwnConfigPath=Join-Path $kwPet local.json
$kwOwnConfig=if(Test-Path -LiteralPath $kwOwnConfigPath){Get-Content -LiteralPath $kwOwnConfigPath -Raw | ConvertFrom-Json}else{[pscustomobject]@{}}
if(-not $AssetDirectory){$AssetDirectory=$kwOwnConfig.assetDirectory}
if(-not $RuntimePath){$RuntimePath=$kwOwnConfig.runtimePath}
if($Action -ne 'Uninstall'){
 if(-not $AssetDirectory -or -not $RuntimePath){throw 'Supply your own lawfully obtained local character pack and official Neutralino runtime. Neither is bundled.'}
 $AssetDirectory=(Resolve-Path -LiteralPath $AssetDirectory).Path
 $RuntimePath=(Resolve-Path -LiteralPath $RuntimePath).Path
 $kwDependencies=Get-Content -LiteralPath (Join-Path $kwBundle dependencies.lock.json) -Raw | ConvertFrom-Json
 $kwRuntime=@($kwDependencies.externalPrerequisites | Where-Object name -eq 'Neutralino Windows x64')[0]
 if((Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash -ne $kwRuntime.exeSha256){throw 'Runtime differs from the pinned official Neutralino 6.9.0 x64 executable.'}
 $kwPetManifest=Get-Content -LiteralPath (Join-Path $AssetDirectory pet.json) -Raw | ConvertFrom-Json
 $kwSheet=$kwPetManifest.spritesheetPath
 if(-not $kwSheet -or [IO.Path]::GetFileName($kwSheet) -ne $kwSheet -or [IO.Path]::GetExtension($kwSheet) -ne '.webp'){throw 'Invalid character spritesheet path.'}
 $kwBytes=[IO.File]::ReadAllBytes((Join-Path $AssetDirectory $kwSheet))
 if($kwBytes.Length -lt 30 -or [Text.Encoding]::ASCII.GetString($kwBytes,0,4) -ne 'RIFF' -or [Text.Encoding]::ASCII.GetString($kwBytes,8,4) -ne 'WEBP'){throw 'Not a WebP spritesheet.'}
 # The native decoder checks actual atlas dimensions at startup. This is only file preflight.
}
$kwDshProcesses=@(Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue)
if($Action -eq 'Check'){
 [pscustomobject]@{result='preflight-only';bundleVersion=$kwManifest.version;dshVersion=$kwVersion;dshRunning=($kwDshProcesses.Count -gt 0);runtimeHashVerified=$true;characterFilesPresent=$true;desktopAcceptance='not performed by Check'} | ConvertTo-Json
 return
}
if(-not $TasksEnded){throw 'Confirm DSH tasks have ended using -TasksEnded.'}
if($kwDshProcesses.Count -gt 0){throw 'Exit DSH Desktop before changing plugins. This installer never terminates tasks or restarts the app.'}
$kwBackup=Join-Path $kwPet ('backups/'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $kwBackup -Force | Out-Null
$kwBackupRecords=@()
foreach($kwName in @('package.json','pnpm-lock.yaml','pnpm-workspace.yaml','cordis.patch.yml','cordis.yml')){
 $kwSource=Join-Path $kwProfile $kwName
 if(Test-Path -LiteralPath $kwSource){$kwDestination=Join-Path $kwBackup $kwName;Copy-Item -LiteralPath $kwSource -Destination $kwDestination;$kwBackupRecords+=@{source=$kwSource;backup=$kwDestination;sha256=(Get-FileHash -LiteralPath $kwDestination).Hash}}
}
if(Test-Path -LiteralPath $kwOwnConfigPath){Copy-Item -LiteralPath $kwOwnConfigPath -Destination (Join-Path $kwBackup pet-local.json)}
$kwBackupRecords | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $kwBackup backup-manifest.json)
$kwBefore=Get-Content -LiteralPath (Join-Path $kwProfile package.json) -Raw | ConvertFrom-Json
$kwInstalledBefore=($null -ne $kwBefore.dependencies.'dsh-kurowhale-pet')
if($Action -eq 'Uninstall' -and -not $kwInstalledBefore){
 [pscustomobject]@{result='already-uninstalled';backup=$kwBackup;next='No plugin changes were needed.'} | ConvertTo-Json
 return
}
# Preserve only our previous package's shipped code for rollback, not node_modules trees.
$kwOldPackage=Join-Path $kwProfile node_modules/dsh-kurowhale-pet
$kwOldCopy=Join-Path $kwBackup previous-package
if($kwInstalledBefore -and (Test-Path -LiteralPath $kwOldPackage)){
 New-Item -ItemType Directory -Path $kwOldCopy | Out-Null
 foreach($kwName in @('package.json','index.js','animations.js','overlay.js','cordis.patch.yml','LICENSE','THIRD_PARTY_NOTICES.md','native')){
  $kwSource=Join-Path $kwOldPackage $kwName
  if(Test-Path -LiteralPath $kwSource){Copy-Item -LiteralPath $kwSource -Destination (Join-Path $kwOldCopy $kwName) -Recurse}
 }
}
$kwPriorIgnore=$env:npm_config_ignore_scripts
try{
 $env:npm_config_ignore_scripts='true'
 if($Action -eq 'Install'){
  & $kwCli plugin --profile desktop add (Join-Path $kwBundle $kwManifest.package) --ignore-scripts *> (Join-Path $kwBackup operation.log)
 }else{
  & $kwCli plugin --profile desktop remove dsh-kurowhale-pet *> (Join-Path $kwBackup operation.log)
 }
 if($LASTEXITCODE -ne 0){throw 'DSH plugin operation failed; see private backup operation.log.'}
 if($Action -eq 'Install'){
  if(-not $kwManifest.pluginFiles){throw 'Missing installed-package integrity manifest.'}
  foreach($kwEntry in $kwManifest.pluginFiles.PSObject.Properties){
   $kwInstalled=[IO.Path]::GetFullPath((Join-Path (Join-Path $kwProfile node_modules/dsh-kurowhale-pet) $kwEntry.Name))
   $kwInstalledRoot=[IO.Path]::GetFullPath((Join-Path $kwProfile node_modules/dsh-kurowhale-pet))
   if(-not $kwInstalled.StartsWith($kwInstalledRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Installed file path escapes package.'}
   if((Get-FileHash -LiteralPath $kwInstalled -Algorithm SHA256).Hash -ne $kwEntry.Value){throw 'Installed package differs from bundle, possibly package-manager cache reuse.'}
  }
  $kwOwnConfig | Add-Member rendererEnabled $true -Force
  $kwOwnConfig | Add-Member assetDirectory $AssetDirectory -Force
  $kwOwnConfig | Add-Member runtimePath $RuntimePath -Force
  $kwOwnConfig | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath ($kwOwnConfigPath+'.new')
  Move-Item -LiteralPath ($kwOwnConfigPath+'.new') -Destination $kwOwnConfigPath -Force
 }
 [pscustomobject]@{result='plugin-operation-finished';action=$Action;version=$kwManifest.version;backup=$kwBackup;next='Start DSH Desktop and verify actual UI/pet. This output is not desktop acceptance.'} | ConvertTo-Json
}catch{
 # Roll back plugin package through the same official CLI. Never reset a profile.
 $kwRecovered=$false
 if($kwInstalledBefore -and (Test-Path -LiteralPath (Join-Path $kwOldCopy package.json))){
  & $kwCli plugin --profile desktop add $kwOldCopy --ignore-scripts *> (Join-Path $kwBackup rollback.log)
  $kwRecovered=($LASTEXITCODE -eq 0)
 }elseif(-not $kwInstalledBefore){
  & $kwCli plugin --profile desktop remove dsh-kurowhale-pet *> (Join-Path $kwBackup rollback.log)
  $kwRecovered=($LASTEXITCODE -eq 0)
 }
 if(Test-Path -LiteralPath (Join-Path $kwBackup pet-local.json)){Copy-Item -LiteralPath (Join-Path $kwBackup pet-local.json) -Destination $kwOwnConfigPath -Force}
 throw ('Plugin operation failed. Official-CLI rollback success='+$kwRecovered+'. Backup: '+$kwBackup+'. No model settings were parsed or reset. Keep DSH closed if rollback failed; follow docs/WINDOWS-INSTALL.md.')
}finally{$env:npm_config_ignore_scripts=$kwPriorIgnore}
