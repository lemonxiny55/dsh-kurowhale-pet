# Full-pack entry point. The nested code bundle has its own code-only manifest.
[CmdletBinding()]
param(
 [ValidateSet('Check','Install','Uninstall')][string]$Action='Check',
 [Parameter(Mandatory=$true)][string]$DshInstall,
 [string]$RuntimePath,
 [switch]$TasksEnded
)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath($PSScriptRoot)
$manifest=Get-Content -LiteralPath (Join-Path $root 'full-bundle-manifest.json') -Raw | ConvertFrom-Json
if($manifest.name -ne 'dsh-kurowhale-pet-full-private' -or $manifest.artworkIncluded -ne $true -or $manifest.version -ne '0.1.0'){throw 'Invalid full pack manifest.'}
foreach($entry in $manifest.files.PSObject.Properties){
 $file=[IO.Path]::GetFullPath((Join-Path $root $entry.Name))
 if(-not $file.StartsWith($root.TrimEnd('\','/')+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Invalid path in full pack manifest.'}
 if((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $entry.Value){throw ('Full pack integrity mismatch: '+$entry.Name)}
}
foreach($required in @('character/pet.json','character/spritesheet.webp','code/bundle-manifest.json','code/scripts/install-windows.ps1')){if(-not $manifest.files.PSObject.Properties[$required]){throw ('Missing full pack manifest entry: '+$required)}}
$pet=Get-Content -LiteralPath (Join-Path $root 'character/pet.json') -Raw | ConvertFrom-Json
if($pet.spritesheetPath -ne 'spritesheet.webp'){throw 'Unexpected character spritesheet path.'}
$params=@{Action=$Action;DshInstall=$DshInstall;AssetDirectory=(Join-Path $root 'character');BundleRoot=(Join-Path $root 'code')}
if($RuntimePath){$params.RuntimePath=$RuntimePath}
if($TasksEnded){$params.TasksEnded=$true}
& (Join-Path $root 'code/scripts/install-windows.ps1') @params
