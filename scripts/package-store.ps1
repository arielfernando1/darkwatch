$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'dist\extension-store-ready'
$zipPath = Join-Path $root 'dist\darkwatch-store.zip'

if (!(Test-Path $source)) {
    Write-Host 'Primero ejecuta: npm run build:extension' -ForegroundColor Yellow
    exit 1
}

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $source '*') -DestinationPath $zipPath -Force
Write-Host "ZIP generado en: $zipPath" -ForegroundColor Green
