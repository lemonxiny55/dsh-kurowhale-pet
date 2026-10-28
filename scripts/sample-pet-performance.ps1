param([Parameter(Mandatory=$true)][string]$OutputDirectory,[int]$Seconds=300)
$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$kwOutput=Join-Path $OutputDirectory 'performance.jsonl'
$kwStatusPath=Join-Path $env:USERPROFILE '.dsh/kurowhale-pet/status.json'
$kwPrevious=@{}
$kwKnownNative=@{}
$kwLogical=[Environment]::ProcessorCount
for($kwI=0;$kwI -lt $Seconds;$kwI++){
 if(Test-Path -LiteralPath (Join-Path $OutputDirectory 'stop-performance.txt')){break}
 $kwStart=Get-Date
 try {
  $kwStatus=Get-Content -LiteralPath $kwStatusPath -Raw | ConvertFrom-Json
  $kwProcesses=@(Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CreationDate)
  $kwById=@{};foreach($kwProcess in $kwProcesses){$kwById[[int]$kwProcess.ProcessId]=$kwProcess}
  $kwNative=[Collections.Generic.HashSet[int]]::new()
  if($kwStatus.nativePid -and $kwById[[int]$kwStatus.nativePid].Name -eq 'neutralino-win_x64.exe'){[void]$kwNative.Add([int]$kwStatus.nativePid)}
  do{$kwAdded=$false;foreach($kwProcess in $kwProcesses){if($kwNative.Contains([int]$kwProcess.ParentProcessId) -and $kwProcess.CreationDate -ge $kwById[[int]$kwProcess.ParentProcessId].CreationDate){if($kwNative.Add([int]$kwProcess.ProcessId)){$kwAdded=$true}}}}while($kwAdded)
  foreach($kwId in $kwNative){$kwKnownNative[$kwId]=$kwById[$kwId].CreationDate}
  $kwGroups=@{native=@($kwProcesses | Where-Object {$kwNative.Contains([int]$_.ProcessId)});dsh=@($kwProcesses | Where-Object {$_.Name -eq 'DeepSeek Harness.exe'})}
  $kwStats=@{}
  foreach($kwRole in @('native','dsh')){
   $kwCpu=0.0;$kwWs=0L;$kwPrivate=0L;$kwCount=0;$kwNormalized=0.0
   foreach($kwProcess in $kwGroups[$kwRole]){
    try{
     $kwLive=Get-Process -Id $kwProcess.ProcessId -ErrorAction Stop
     $kwKey=$kwRole+':'+$kwLive.Id+':'+$kwLive.StartTime.Ticks
     $kwNow=[DateTime]::UtcNow
     if($kwPrevious.ContainsKey($kwKey)){$kwDelta=($kwNow-$kwPrevious[$kwKey].time).TotalSeconds;if($kwDelta -gt 0){$kwCpu+=100*($kwLive.CPU-$kwPrevious[$kwKey].cpu)/$kwDelta}}
     $kwPrevious[$kwKey]=@{cpu=$kwLive.CPU;time=$kwNow}
     $kwWs+=$kwLive.WorkingSet64;$kwPrivate+=$kwLive.PrivateMemorySize64;$kwCount++
    }catch{}
   }
   $kwStats[$kwRole]=@{count=$kwCount;cpuOneCorePercent=[Math]::Round($kwCpu,2);cpuTotalMachinePercent=[Math]::Round($kwCpu/$kwLogical,3);workingSetMiB=[Math]::Round($kwWs/1MB,2);privateMiB=[Math]::Round($kwPrivate/1MB,2)}
  }
  $kwOrphans=@($kwProcesses | Where-Object {$kwKnownNative.ContainsKey([int]$_.ProcessId) -and $kwKnownNative[[int]$_.ProcessId] -eq $_.CreationDate -and -not $kwNative.Contains([int]$_.ProcessId)}).Count
  @{time=[DateTime]::UtcNow.ToString('o');state=$kwStatus.state;source=$kwStatus.source;visible=$kwStatus.visible;nativePid=$kwStatus.nativePid;logicalProcessors=$kwLogical;firstSample=($kwI -eq 0);native=$kwStats.native;dsh=$kwStats.dsh;previousNativeProcessesStillAlive=$kwOrphans} | ConvertTo-Json -Depth 5 -Compress | Add-Content -LiteralPath $kwOutput
 }catch{ @{time=[DateTime]::UtcNow.ToString('o');sampleError=$true} | ConvertTo-Json -Compress | Add-Content -LiteralPath $kwOutput }
 $kwRemaining=1000-((Get-Date)-$kwStart).TotalMilliseconds
 if($kwRemaining -gt 0){Start-Sleep -Milliseconds ([int]$kwRemaining)}
}
Write-Output 'Sampling finished. CPU is measured from process CPU-time deltas; aggregate working sets can count shared pages more than once.'
