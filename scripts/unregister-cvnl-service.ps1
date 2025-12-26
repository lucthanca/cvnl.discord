# Script để gỡ bỏ CVNL Discord service khỏi Windows Task Scheduler
# Chạy với quyền Administrator

# Kiểm tra quyền Admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Script này cần chạy với quyền Administrator!" -ForegroundColor Red
    Write-Host "Click chuột phải PowerShell và chọn 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

$taskName = "CVNL Discord Service"

# Kiểm tra task tồn tại
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if (-not $existingTask) {
    Write-Host "Task '$taskName' không tồn tại." -ForegroundColor Yellow
    pause
    exit 0
}

# Xóa task
Write-Host "Removing task: $taskName" -ForegroundColor Yellow
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false

Write-Host ""
Write-Host "✅ Task đã được gỡ bỏ thành công!" -ForegroundColor Green
Write-Host ""

pause
