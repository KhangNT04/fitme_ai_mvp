# FitMe - run tests per layer + per E2E flow (each spec = one screen group)
# Usage: .\scripts\test-flows.ps1

param(
    [switch]$SkipUnit,
    [switch]$SkipE2e,
    [switch]$E2eOnly
)

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Frontend = Join-Path $Root "frontend"
$Backend = Join-Path $Root "backend"

$results = @()

function Add-Result($Layer, $Name, $Ok, $Detail = "") {
    $script:results += [PSCustomObject]@{
        Layer  = $Layer
        Name   = $Name
        Status = if ($Ok) { "PASS" } else { "FAIL" }
        Detail = $Detail
    }
}

function Test-Server($Url, $Label) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        return $r.StatusCode -eq 200
    } catch {
        Write-Host "  [!] $Label not reachable at $Url" -ForegroundColor Yellow
        return $false
    }
}

Write-Host ""
Write-Host "=== FitMe - Test per flow / screen ===" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host ""

if (-not $E2eOnly -and -not $SkipUnit) {
    Write-Host ">> [1/3] Backend unit (mvn test)" -ForegroundColor Green
    Push-Location $Backend
    $beOut = mvn test -q 2>&1 | Out-String
    $beOk = $LASTEXITCODE -eq 0
    Pop-Location
    if (-not $beOk) { Write-Host $beOut -ForegroundColor Red }
    Add-Result "BE" "mvn test" $beOk $(if ($beOk) { "46+ tests" } else { "exit $LASTEXITCODE" })

    Write-Host ">> [2/3] Frontend unit (npm test)" -ForegroundColor Green
    Push-Location $Frontend
    $feOut = npm test -- --run 2>&1 | Out-String
    $feOk = $LASTEXITCODE -eq 0
    Pop-Location
    if (-not $feOk) { Write-Host $feOut -ForegroundColor Red }
    Add-Result "FE" "npm test" $feOk $(if ($feOk) { "30+ tests" } else { "exit $LASTEXITCODE" })
}

if (-not $SkipE2e) {
    $feUp = Test-Server "http://localhost:3000" "Frontend"
    if (-not $feUp) {
        Write-Host "  Frontend not running. Start: cd frontend; npm run dev" -ForegroundColor Red
        Add-Result "E2E" "(skipped)" $false "frontend :3000 down"
    } else {
        Write-Host ">> [3/3] E2E Playwright - one spec per flow" -ForegroundColor Green

        $e2eFlows = @(
            @{ File = "smoke-routes.spec.ts";       Label = "Smoke public routes per screen" }
            @{ File = "navigation.spec.ts";         Label = "Navigation header footer" }
            @{ File = "auth-pages.spec.ts";         Label = "Auth pages load" }
            @{ File = "auth-flow.spec.ts";          Label = "Auth login logout forgot" }
            @{ File = "rbac.spec.ts";               Label = "RBAC role guards" }
            @{ File = "discover.spec.ts";           Label = "Discover product list" }
            @{ File = "consultation-anonymous.spec.ts"; Label = "AI anonymous consultation" }
            @{ File = "product-advice.spec.ts";     Label = "AI product advice flow" }
            @{ File = "photo-preview.spec.ts";      Label = "AI photo preview upload" }
            @{ File = "ai-extras.spec.ts";          Label = "AI extra pages" }
            @{ File = "try-on.spec.ts";             Label = "Try-on main flow" }
            @{ File = "try-on-extras.spec.ts";      Label = "Try-on extra pages" }
            @{ File = "wardrobe.spec.ts";           Label = "Wardrobe add item" }
            @{ File = "saved-outfits.spec.ts";      Label = "Saved outfits list" }
            @{ File = "redirect-flow.spec.ts";      Label = "Redirect buy flow" }
            @{ File = "brand-portal.spec.ts";       Label = "Brand portal smoke" }
            @{ File = "brand-full.spec.ts";         Label = "Brand product CRUD" }
            @{ File = "admin-portal.spec.ts";       Label = "Admin portal smoke" }
            @{ File = "admin-full.spec.ts";         Label = "Admin approve flows" }
            @{ File = "role-flows.spec.ts";         Label = "Role flows 3 roles serial"; Workers = 1 }
        )

        if ($env:FITME_TEST_EXPOSE_RESET_TOKENS -eq "true") {
            $e2eFlows += @{ File = "reset-password.spec.ts"; Label = "Reset password E2E" }
        }

        Push-Location $Frontend
        foreach ($flow in $e2eFlows) {
            $spec = "e2e/$($flow.File)"
            $workers = if ($flow.Workers) { $flow.Workers } else { 2 }
            Write-Host "  -> $($flow.Label) [$spec]" -ForegroundColor DarkGray
            $out = npx playwright test $spec --workers=$workers 2>&1 | Out-String
            $ok = $LASTEXITCODE -eq 0
            if (-not $ok) {
                Write-Host $out -ForegroundColor Red
            } else {
                $passed = "?"
                if ($out -match "(\d+) passed") { $passed = $Matches[1] }
                Write-Host "    OK ($passed tests)" -ForegroundColor DarkGreen
            }
            Add-Result "E2E" $flow.Label $ok $flow.File
        }
        Pop-Location
    }
}

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize Layer, Name, Status, Detail

$failed = @($results | Where-Object { $_.Status -eq "FAIL" })
$passed = @($results | Where-Object { $_.Status -eq "PASS" })
$color = if ($failed.Count -eq 0) { "Green" } else { "Yellow" }
Write-Host "Total: $($passed.Count) pass / $($failed.Count) fail / $($results.Count) groups" -ForegroundColor $color

if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  - [$($_.Layer)] $($_.Name)" }
    exit 1
}
exit 0
