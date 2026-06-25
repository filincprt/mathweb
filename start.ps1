$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptDir 'backend'
$frontendDir = Join-Path $scriptDir 'frontend'
$venvDir = Join-Path $backendDir '.venv'
$pythonExe = Join-Path $venvDir 'Scripts\python.exe'

function Ensure-Venv {
    if (-not (Test-Path $pythonExe)) {
        Write-Host 'Создаю виртуальное окружение для backend...'
        Push-Location $backendDir
        python -m venv .venv
        & "$pythonExe" -m pip install --upgrade pip
        & "$pythonExe" -m pip install -r requirements.txt
        Pop-Location
    }
}

Ensure-Venv

$backendCommand = "Set-Location -Path '$backendDir'; & '$pythonExe' main.py"
$frontendCommand = "Set-Location -Path '$frontendDir'; npm run dev"

Write-Host 'Запускаю backend в новом окне...'
Start-Process powershell -ArgumentList @('-NoExit', '-Command', $backendCommand)
Write-Host 'Запускаю frontend в новом окне...'
Start-Process powershell -ArgumentList @('-NoExit', '-Command', $frontendCommand)
Write-Host 'Сервисы запущены. Проверьте новые терминалы.'
