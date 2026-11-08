param([Parameter(Mandatory)][string]$InstallDir,[switch]$StopBackend)
$ErrorActionPreference='Stop'
$base=[IO.Path]::GetFullPath($InstallDir)
$current=Get-Content -LiteralPath (Join-Path $base 'current.json') -Raw | ConvertFrom-Json
if($current.product -ne 'retail' -or $current.version -notmatch '^\d+\.\d+\.\d+(?:-rc\.\d+)?$'){throw 'Invalid Retail active version'}
$version=[IO.Path]::GetFullPath((Join-Path $base ('versions\'+$current.version)))
if(!$version.StartsWith((Join-Path $base 'versions')+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Version outside Retail installation'}
$entry=if($StopBackend){'service-stop.mjs'}else{'server-entry.mjs'}
& (Join-Path $version 'runtime\node.exe') (Join-Path $version ('desktop\'+$entry)) (Join-Path $env:PROGRAMDATA 'Sham Touch\Retail Server\server-private.json')
exit $LASTEXITCODE
