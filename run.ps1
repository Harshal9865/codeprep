# CodePrep One-Click PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  CodePrep Personal Interview Preparation Platform" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = $PSScriptRoot

Write-Host "[0/3] Terminating any lingering processes on ports 5000 and 5173..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Write-Host "[1/3] Preparing Backend, Database, and Default Credentials..." -ForegroundColor Yellow
Set-Location "$rootPath\backend"
npm install
npx prisma generate
npx prisma db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Rebuilding corrupted SQLite database..." -ForegroundColor Yellow
    if (Test-Path "$rootPath\backend\prisma\dev.db") { Move-Item "$rootPath\backend\prisma\dev.db" "$rootPath\backend\prisma\dev.db.corrupt.bak" -Force -ErrorAction SilentlyContinue }
    Remove-Item "$rootPath\backend\prisma\dev.db-wal", "$rootPath\backend\prisma\dev.db-shm", "$rootPath\backend\prisma\dev.db-journal", "$rootPath\backend\dev.db" -Force -ErrorAction SilentlyContinue
    npx prisma db push
}
npm run seed-user
npm run seed-problems

Write-Host ""
Write-Host "[2/3] Launching Backend Server on port 5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootPath\backend'; npm run dev"
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[3/3] Preparing and Launching Frontend Client on port 5173..." -ForegroundColor Green
Set-Location "$rootPath\frontend"
npm install
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootPath\frontend'; npm run dev"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  CodePrep is starting up!" -ForegroundColor Cyan
Write-Host "  Opening http://localhost:5173 in browser..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Start-Sleep -Seconds 4
Start-Process "http://localhost:5173"

