# Quick status check cho CVNL Discord Service

$taskName = "CVNL Discord Service"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CVNL Discord Service Status Check" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Check Task Scheduler
Write-Host "[1] Task Scheduler Status:" -ForegroundColor Yellow
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($task) {
    Write-Host "   Task exists: " -NoNewline
    Write-Host "YES" -ForegroundColor Green
    
    Write-Host "   State: " -NoNewline
    switch ($task.State) {
        "Ready"    { Write-Host "Ready (Enabled, not running)" -ForegroundColor Green }
        "Running"  { Write-Host "Running" -ForegroundColor Yellow }
        "Disabled" { Write-Host "Disabled" -ForegroundColor Red }
        default    { Write-Host $task.State -ForegroundColor White }
    }
    
    $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
    Write-Host "   Last Run: " -NoNewline
    Write-Host $taskInfo.LastRunTime -ForegroundColor Cyan
    
    Write-Host "   Last Result: " -NoNewline
    if ($taskInfo.LastTaskResult -eq 0) {
        Write-Host "Success (0)" -ForegroundColor Green
    } else {
        Write-Host "Error ($($taskInfo.LastTaskResult))" -ForegroundColor Red
    }
    
    Write-Host "   Next Run: " -NoNewline
    Write-Host $taskInfo.NextRunTime -ForegroundColor Cyan
} else {
    Write-Host "   Task NOT FOUND!" -ForegroundColor Red
    Write-Host "   Run register-cvnl-service.ps1 to install" -ForegroundColor Yellow
    exit 1
}

# 2. Check WSL Process
Write-Host "`n[2] WSL Process Status:" -ForegroundColor Yellow
$pidCheck = wsl -d Debian -- bash -c 'if [ -f /mnt/u/projects/cvnl.discord/server.pid ]; then cat /mnt/u/projects/cvnl.discord/server.pid; else echo "NO_PID"; fi' 2>$null

if ($pidCheck -eq "NO_PID") {
    Write-Host "   Status: " -NoNewline
    Write-Host "NOT RUNNING (No PID file)" -ForegroundColor Red
} else {
    $processCheck = wsl -d Debian -- bash -c "ps -p $pidCheck > /dev/null 2>&1 && echo RUNNING || echo STOPPED" 2>$null
    
    if ($processCheck -match "RUNNING") {
        Write-Host "   Status: " -NoNewline
        Write-Host "RUNNING" -ForegroundColor Green
        Write-Host "   PID: " -NoNewline
        Write-Host $pidCheck -ForegroundColor Cyan
        
        # Get process details
        $processInfo = wsl -d Debian -- bash -c "ps -p $pidCheck -o cmd --no-headers" 2>$null
        Write-Host "   Command: " -NoNewline
        Write-Host $processInfo -ForegroundColor White
    } else {
        Write-Host "   Status: " -NoNewline
        Write-Host "STOPPED (PID exists but process dead)" -ForegroundColor Red
        Write-Host "   Stale PID: " -NoNewline
        Write-Host $pidCheck -ForegroundColor Yellow
    }
}

# 3. Check Ports
Write-Host "`n[3] Port Status:" -ForegroundColor Yellow
$portsCheck = wsl -d Debian -- bash -c "ss -tuln | grep -E ':(3000|3001)' 2>/dev/null" 2>$null

if ($portsCheck) {
    Write-Host "   Ports listening:" -ForegroundColor Green
    $portsCheck -split "`n" | ForEach-Object {
        if ($_ -match ":3000") {
            Write-Host "   - Port 3000 (HTTP): " -NoNewline
            Write-Host "LISTENING" -ForegroundColor Green
        }
        if ($_ -match ":3001") {
            Write-Host "   - Port 3001 (WebSocket): " -NoNewline
            Write-Host "LISTENING" -ForegroundColor Green
        }
    }
} else {
    Write-Host "   Port 3000 (HTTP): " -NoNewline
    Write-Host "NOT LISTENING" -ForegroundColor Red
    Write-Host "   Port 3001 (WebSocket): " -NoNewline
    Write-Host "NOT LISTENING" -ForegroundColor Red
}

# 4. Overall Status
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Overall Status: " -NoNewline

if ($task.State -eq "Ready" -and $processCheck -match "RUNNING" -and $portsCheck) {
    Write-Host "HEALTHY" -ForegroundColor Green
    Write-Host "  Service is running normally" -ForegroundColor Green
} elseif ($task.State -eq "Disabled") {
    Write-Host "DISABLED" -ForegroundColor Red
    Write-Host "  Task is disabled in Task Scheduler" -ForegroundColor Yellow
} elseif ($processCheck -match "RUNNING") {
    Write-Host "RUNNING (Manual)" -ForegroundColor Yellow
    Write-Host "  Process running but task not scheduled to run" -ForegroundColor Yellow
} else {
    Write-Host "STOPPED" -ForegroundColor Red
    Write-Host "  Service is not running" -ForegroundColor Red
    Write-Host "  Run: Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Yellow
}
Write-Host "========================================`n" -ForegroundColor Cyan
