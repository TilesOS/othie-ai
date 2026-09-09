param(
  [Parameter(Mandatory=$true)][string]$NodePath,
  [Parameter(Mandatory=$true)][string]$CliPath,
  [Parameter(Mandatory=$true)][string]$ConfigPath
)
$ErrorActionPreference = "Stop"
$action = New-ScheduledTaskAction -Execute $NodePath -Argument ('"{0}" engine foreground --config "{1}"' -f $CliPath, $ConfigPath)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Days 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName "Kith AI Context Engine" -Action $action -Trigger $trigger -Settings $settings -Description "Per-user Kith AI local context compiler" -Force | Out-Null
Write-Host "Installed per-user task: Kith AI Context Engine"
