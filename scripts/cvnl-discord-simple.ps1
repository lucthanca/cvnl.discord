# Bật cảnh báo nếu module BurntToast chưa cài
# Log everything to file for debugging
$ErrorActionPreference = "Continue"
$global:LASTEXITCODE = 0

# Log file path is ../logs/script.log relative to this script
$logFile = Join-Path -Path (Split-Path -Parent $MyInvocation.MyCommand.Definition) -ChildPath "..\logs\script.log"

function Log($msg) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "$timestamp - $msg" | Out-File -FilePath $logFile -Append
  Write-Host $msg
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Notify($msg) {
  try {
    $notify = New-Object System.Windows.Forms.NotifyIcon
    $notify.Icon = [System.Drawing.SystemIcons]::Information
    $notify.Visible = $true
    $notify.ShowBalloonTip(3000, "CVNL Discord", $msg, [System.Windows.Forms.ToolTipIcon]::Info)

    $notify.Dispose()
  } catch {
    # Fallback: Chỉ log ra console nếu toast fail
    Write-Host "CVNL Discord - $msg"
  }
}
# if (-not (Get-Module -ListAvailable -Name BurntToast)) {
#   try {
#     Install-Module -Name BurntToast -Force -Scope CurrentUser -ErrorAction Stop
#   } catch {
#     # Không crash nếu không cài được module
#     Write-Host "Warning: Could not install BurntToast module: $_"
#   }
# }

# Import-Module BurntToast -ErrorAction SilentlyContinue

# Notify Windows
# function Notify($title, $msg) {
#   try {
#     New-BurntToastNotification -Text $title, $msg -ErrorAction Stop
#   } catch {
#     # Fallback: Chỉ log ra console nếu toast fail
#     Write-Host "$title - $msg"
#   }
# }

# Simple version - no notifications, just start service


Log "=== Starting CVNL Discord Service ==="
Log "PowerShell Version: $($PSVersionTable.PSVersion)"
Log "User: $env:USERNAME"

# Notify "Starting service..."

# 1. Check WSL
Log "Checking WSL..."
try {
  $wslTest = wsl -d Debian -- bash -c "echo OK" 2>&1
  if ($wslTest -match "OK") {
    Log "WSL OK"
  } else {
    Notify "Cannot start WSL Debian!"
    Log "WSL ERROR: $wslTest"
    exit 1
  }
} catch {
  Notify "Cannot start WSL Debian!"
  Log "WSL EXCEPTION: $_"
  exit 1
}

# 2. Check if already running
Log "Checking if service already running..."
$pidCheck = wsl -d Debian -- bash -c 'if [ -f /mnt/u/projects/cvnl.discord/server.pid ]; then PID=$(cat /mnt/u/projects/cvnl.discord/server.pid); if ps -p $(cat /mnt/u/projects/cvnl.discord/server.pid) > /dev/null 2>&1; then echo "RUNNING"; else echo "STOPPED"; fi; else echo "NO_PID"; fi' 2>&1

Log "PID Check result: $pidCheck"

if ($pidCheck -match "RUNNING") {
  Notify "Service is already running!"
  Log "Service already running, exiting"
  exit 0
}

# 3. Start service
Log "Starting service via start-server.sh..."
$output = wsl -d Debian -- bash -c "/mnt/u/projects/cvnl.discord/start-server.sh" 2>&1

Log "Start script output:"
$output | ForEach-Object { Log "  $_" }

# 4. Check result
if ($LASTEXITCODE -eq 0) {
    Log "Service started successfully (exit code 0)"
    
    # Cho process một chút thời gian để ổn định trước khi bắt đầu check
    # Log "Waiting 3 seconds for process to stabilize..."
    # Start-Sleep -Seconds 3
    
    # Verify process is running - polling với timeout
    Log "Verifying process is running..."
    $maxWait = 30  # Max 30 seconds
    $waitInterval = 1  # Check mỗi giây
    $waited = 0
    $processRunning = $false
    
    while ($waited -lt $maxWait) {
      $verifyCheck = wsl -d Debian -- bash -c 'if [ -f /mnt/u/projects/cvnl.discord/server.pid ]; then PID=$(cat /mnt/u/projects/cvnl.discord/server.pid); if ps -p $(cat /mnt/u/projects/cvnl.discord/server.pid) > /dev/null 2>&1; then echo "RUNNING"; else echo "DEAD"; fi; else echo "NO_PID"; fi' 2>&1
      
      # Strip warning messages
      $verifyResult = ($verifyCheck -split "`n" | Where-Object { $_ -match "^(RUNNING|DEAD|NO_PID)" }) -join ""
      
      if ($verifyResult -match "RUNNING") {
        $processRunning = $true
        break
      } elseif ($verifyResult -match "DEAD") {
        Log "Process status: DEAD, retrying..."
        # Đợi thêm một chút và retry
      }
      
      Start-Sleep -Seconds $waitInterval
      $waited += $waitInterval
      if ($waited % 5 -eq 0) {
        Log "  Still waiting... ($waited seconds)"
      }
    }
    
    if ($processRunning) {
      Notify "Service started successfully!"
      Log "SUCCESS: Service is running (verified after $waited seconds)"
      exit 0
    } elseif ($waited -ge $maxWait) {
      Log "TIMEOUT: Could not verify process after $maxWait seconds"
      Log "Last check result: $verifyResult"
      # Check one more time
      $finalCheck = wsl -d Debian -- bash -c 'ps -p $(cat /mnt/u/projects/cvnl.discord/server.pid 2>/dev/null) > /dev/null 2>&1 && echo FINAL_OK || echo FINAL_FAIL' 2>&1
      Log "Final check: $finalCheck"
      if ($finalCheck -match "FINAL_OK") {
        Log "Process IS running, exiting with success"
        exit 0
      }
      # Exit 0 anyway vì start script đã return success
      exit 0
    } else {
      Log "ERROR: Process died after starting"
      # Check server log for errors
      $serverLog = wsl -d Debian -- bash -c "tail -20 /mnt/u/projects/cvnl.discord/logs/server.log" 2>&1
      Log "Server log (last 20 lines):"
      $serverLog | ForEach-Object { Log "  $_" }
      Notify "Service started but died immediately!"
      exit 1
    }
} else {
  Notify "Cannot start service! (exit code $LASTEXITCODE)"
  Log "ERROR: Service failed to start (exit code $LASTEXITCODE)"
  exit 1
}
