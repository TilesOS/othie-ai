param(
  [Parameter(Mandatory=$true)][string]$NodePath,
  [Parameter(Mandatory=$true)][string]$CliPath,
  [Parameter(Mandatory=$true)][string]$ConfigPath
)
$ErrorActionPreference = "Stop"
$NodePath = (Resolve-Path -LiteralPath $NodePath).Path
$CliPath = (Resolve-Path -LiteralPath $CliPath).Path
$ConfigPath = (Resolve-Path -LiteralPath $ConfigPath).Path
$userIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute $NodePath -Argument ('"{0}" engine foreground --config "{1}"' -f $CliPath, $ConfigPath)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userIdentity
$principal = New-ScheduledTaskPrincipal -UserId $userIdentity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Days 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "Othie Context Engine" -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Per-user Othie local context compiler" -Force | Out-Null
Write-Host "Installed per-user task: Othie Context Engine"
