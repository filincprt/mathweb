$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$startPy = Join-Path $scriptDir 'start.py'
python $startPy @args
exit $LASTEXITCODE
