# Test Notebook Studio ONLINE build locally - before GitHub Pages upload
# Run this from the folder you are about to upload (the one with index.html in it)
# It checks the 3 things that break registration, then serves on localhost:8000

$ErrorActionPreference = "Stop"
$here = Get-Location
Write-Host "Testing in: $here" -ForegroundColor Cyan

# 1. Files that MUST be at root
$required = @("index.html", "service-worker.js", "manifest.json", "version.json")
foreach ($f in $required) {
  if (Test-Path (Join-Path $here $f)) { Write-Host "  OK  $f" -ForegroundColor Green }
  else { Write-Host "  MISSING  $f  <- registration / push will fail" -ForegroundColor Red }
}

# 2. Registration snippet in index.html?
$idx = Get-Content (Join-Path $here "index.html") -Raw -ErrorAction SilentlyContinue
if ($idx -match "serviceWorker\.register") {
  Write-Host "  OK  index.html contains serviceWorker.register" -ForegroundColor Green
  if ($idx -match "register\('([^']+)'") { Write-Host "      registers: $($Matches[1])" -ForegroundColor Gray }
} else {
  Write-Host "  FAIL  index.html has NO serviceWorker.register - SW will never run" -ForegroundColor Red
  Write-Host "        Paste the snippet from sw-register-snippet.html before </body>" -ForegroundColor Yellow
}

# 3. Case check - Windows hides this, GitHub Pages does NOT
# v148 links to ./Help/ (capital H). Folder must be Help, not help.
if (Test-Path (Join-Path $here "Help")) { Write-Host "  OK  Help/ folder (capital H) matches v148.html" -ForegroundColor Green }
elseif (Test-Path (Join-Path $here "help")) { Write-Host "  FAIL  Folder is help/ lowercase but v148 links to Help/ - will 404 on GitHub Pages. Rename to Help" -ForegroundColor Red }
else { Write-Host "  MISSING  Help/ folder" -ForegroundColor Red }

foreach ($d in @("dbs","flashcards","offline-spreadsheets-charts")) {
  if (Test-Path (Join-Path $here $d)) { Write-Host "  OK  $d/" -ForegroundColor Green }
  else { Write-Host "  MISSING  $d/" -ForegroundColor Yellow }
}

# 4. Cache name in SW
$sw = Get-Content (Join-Path $here "service-worker.js") -Raw -ErrorAction SilentlyContinue
if ($sw -match "CACHE_NAME\s*=\s*'([^']+)'") { Write-Host "  SW cache: $($Matches[1])" -ForegroundColor Gray }

Write-Host ""
Write-Host "Starting local server at http://localhost:8000/  (Ctrl+C to stop)" -ForegroundColor Cyan
Write-Host "Then open Chrome and check:" -ForegroundColor White
Write-Host "  1. Console should show: [SW] registered" -ForegroundColor White
Write-Host "  2. DevTools > Application > Service Workers = Activated and running" -ForegroundColor White
Write-Host "  3. DevTools > Application > Cache Storage = notebook-studio-v148 with all files" -ForegroundColor White
Write-Host ""
python -m http.server 8000
