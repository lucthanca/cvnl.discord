# Re-register với simple script và logging
# Chạy với quyền Administrator

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Cần quyền Administrator!" -ForegroundColor Red
    pause
    exit 1
}

$taskName = "CVNL Discord Service"
$scriptPath = # Current folder + script name
    Join-Path -Path (Split-Path -Parent $MyInvocation.MyCommand.Definition) -ChildPath "cvnl-discord-simple.ps1"

# Remove old task
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create action với logging
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

# Triggers
$trigger = New-ScheduledTaskTrigger -AtLogOn
$triggerEveryDay = New-ScheduledTaskTrigger -Once -At 00:00 `
    -RepetitionInterval (New-TimeSpan -Hours 1)

# Settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

# Principal
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

# Register
Write-Host "Registering task with simple script..." -ForegroundColor Green
Register-ScheduledTask -TaskName $taskName `
    -Action $action `
    -Trigger $trigger,$triggerEveryDay `
    -Settings $settings `
    -Principal $principal `
    -Description "Auto-start CVNL Discord server (Simple version with logging)"

Write-Host ""
Write-Host "✅ Task registered!" -ForegroundColor Green
Write-Host "Script: $scriptPath" -ForegroundColor Cyan
Write-Host "Log file: C:\scripts\cvnl-simple.log" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test:" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
Write-Host "  Get-Content C:\scripts\cvnl-simple.log -Tail 20" -ForegroundColor White
Write-Host ""

pause
