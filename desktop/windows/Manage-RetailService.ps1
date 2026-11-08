param([Parameter(Mandatory)][ValidateSet('Install','Start','Stop','Remove','Status')][string]$Action,[Parameter(Mandatory)][string]$InstallDir,[switch]$PlanOnly)
$ErrorActionPreference='Stop'
$name='ShamTouchRetailServer'
$install=[IO.Path]::GetFullPath($InstallDir)
$wrapper=Join-Path $install 'service\ShamTouchRetailServer.exe'
$data=Join-Path $env:PROGRAMDATA 'Sham Touch\Retail Server'
if($PlanOnly){@{service=$name;account='NT AUTHORITY\LocalService';automatic=$true;recoverySeconds=@(10,30,60);data=$data;action=$Action;install=$install} | ConvertTo-Json;exit 0}
if(!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Administrator required'}
$existing=Get-CimInstance Win32_Service -Filter "Name='$name'"
if($existing -and !$existing.PathName.Trim('"').StartsWith($wrapper,[StringComparison]::OrdinalIgnoreCase)){throw 'Retail service belongs to another installation; no changes applied'}
if($Action -eq 'Status'){if($existing){$existing | Select-Object Name,State,StartMode | ConvertTo-Json}else{'{"installed":false}'};exit 0}
if($Action -eq 'Install'){
    if(!$existing){& $wrapper install;if($LASTEXITCODE -ne 0){throw 'Service registration failed'}}
    & sc.exe sidtype $name unrestricted | Out-Null
    $sid=([Security.Principal.NTAccount]"NT SERVICE\$name").Translate([Security.Principal.SecurityIdentifier]).Value
    if(!(Test-Path -LiteralPath $data)){throw 'Retail private configuration must be prepared first'}
    # Restrict Retail's own runtime tree; never alter restaurant or PostgreSQL folders.
    & icacls.exe $data /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' "*$($sid):(OI)(CI)M" | Out-Null
    if($LASTEXITCODE -ne 0){throw 'Unable to protect Retail runtime data'}
    foreach($file in Get-ChildItem -LiteralPath $data -Recurse -File){if($file.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Runtime reparse point requires review'};& icacls.exe $file.FullName /inheritance:e | Out-Null;if($LASTEXITCODE -ne 0){throw 'Unable to protect runtime file'}}
    Start-Service -Name $name
}elseif($Action -eq 'Start'){Start-Service -Name $name}
elseif($Action -eq 'Stop'){if($existing){Stop-Service -Name $name -ErrorAction Stop}}
elseif($Action -eq 'Remove'){if($existing){if($existing.State -ne 'Stopped'){Stop-Service -Name $name};& $wrapper uninstall;if($LASTEXITCODE -ne 0){throw 'Service removal failed'}}}
