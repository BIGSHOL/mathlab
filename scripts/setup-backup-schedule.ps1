# ============================================================
# DB 일일 자동 백업 — Windows 작업 스케줄러 등록 스크립트
# ============================================================
#
# 매일 지정 시각에 `npm run db:backup` 을 실행하여 backups/ 폴더에
# gzip JSON 백업을 생성합니다. (로컬 전용 — PC 가 켜져 있어야 동작)
#
# 사용법 (PowerShell, 관리자 권한 권장):
#   .\scripts\setup-backup-schedule.ps1                # 매일 03:00 등록
#   .\scripts\setup-backup-schedule.ps1 -Time "23:30"  # 시각 지정
#   .\scripts\setup-backup-schedule.ps1 -Remove        # 등록 해제
#
# 등록 확인:  schtasks /query /tn "MathLab DB Backup"
# 수동 실행:  schtasks /run   /tn "MathLab DB Backup"
# 삭제:       schtasks /delete /tn "MathLab DB Backup" /f
#
# ⚠️ 한계: 이 방식은 로컬 PC 가 켜져 있을 때만 동작합니다.
#    오프사이트(PC 비의존) 자동 백업이 필요하면 GitHub Actions 로 업그레이드하세요.

param(
    [string]$Time = "03:00",
    [switch]$Remove
)

$ErrorActionPreference = "Stop"
$TaskName = "MathLab DB Backup"

# 프로젝트 루트 (이 스크립트의 상위 폴더)
$ProjectRoot = Split-Path -Parent $PSScriptRoot

if ($Remove) {
    schtasks /delete /tn "$TaskName" /f
    Write-Host "✅ 작업 스케줄 '$TaskName' 삭제됨" -ForegroundColor Green
    exit 0
}

# npm 실행 경로 탐색
$npmCmd = (Get-Command npm -ErrorAction SilentlyContinue).Source
if (-not $npmCmd) {
    Write-Host "❌ npm 을 찾을 수 없습니다. Node.js 설치 확인 필요." -ForegroundColor Red
    exit 1
}

# cmd /c 로 작업 디렉토리 이동 후 npm run db:backup 실행
# (작업 스케줄러는 작업 디렉토리를 보장하지 않으므로 명시적으로 cd)
$Action = "cmd /c `"cd /d `"$ProjectRoot`" && npm run db:backup >> `"$ProjectRoot\backups\backup.log`" 2>&1`""

schtasks /create `
    /tn "$TaskName" `
    /tr "$Action" `
    /sc daily `
    /st $Time `
    /f

Write-Host ""
Write-Host "✅ 일일 백업 스케줄 등록 완료" -ForegroundColor Green
Write-Host "   작업명 : $TaskName"
Write-Host "   시각   : 매일 $Time"
Write-Host "   대상   : $ProjectRoot (npm run db:backup)"
Write-Host "   로그   : backups\backup.log"
Write-Host ""
Write-Host "확인:  schtasks /query /tn `"$TaskName`""
Write-Host "수동:  schtasks /run   /tn `"$TaskName`""
Write-Host "삭제:  .\scripts\setup-backup-schedule.ps1 -Remove"
Write-Host ""
Write-Host "⚠️  PC 가 켜져 있을 때만 동작합니다 (로컬 전용)." -ForegroundColor Yellow
