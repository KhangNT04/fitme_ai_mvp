# Tạo .env local từ .env.example nếu chưa có
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
$example = Join-Path $root ".env.example"

if (Test-Path $envFile) {
    Write-Host ".env da ton tai — bo qua. Chinh sua thu cong neu can."
    exit 0
}

if (-not (Test-Path $example)) {
    Write-Error ".env.example khong tim thay"
    exit 1
}

Copy-Item $example $envFile
Write-Host "Da tao .env tu .env.example"
Write-Host "Local: PAYOS_MOCK=true — test billing tai http://localhost:3000/brand/billing"
Write-Host "PayOS that: dat PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY trong .env va PAYOS_MOCK=false"
