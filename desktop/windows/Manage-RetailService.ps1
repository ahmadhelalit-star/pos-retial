param([Parameter(Mandatory)][ValidateSet('Install','Start','Stop','Remove','Status')][string]$Action,[Parameter(Mandatory)][string]$InstallDir,[switch]$PlanOnly)
$ErrorActionPreference='Stop'
$name='ShamTouchRetailServer'
$install=[IO.Path]::GetFullPath($InstallDir)
$wrapper=Join-Path $install 'service\ShamTouchRetailServer.exe'
$data=Join-Path $env:PROGRAMDATA 'Sham Touch\Retail Server'
if($PlanOnly){@{service=$name;account='NT AUTHORITY\LocalService';automatic=$true;recoverySeconds=@(10,30,60);data=$data;action=$Action;install=$install} | ConvertTo-Json;exit 0}
if(!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Administrator required'}
$existing=Get-CimInstance Win32_Service -Filter "Name='$name'"
if($existing -and $existing.PathName -notmatch ('^(?i)"?'+[Regex]::Escape($wrapper)+'"?(?:\s|$)')){throw 'Retail service belongs to another installation; no changes applied'}
if($Action -eq 'Status'){if($existing){$existing | Select-Object Name,State,StartMode | ConvertTo-Json}else{'{"installed":false}'};exit 0}
if($Action -eq 'Install'){
    if(!$existing){& $wrapper install;if($LASTEXITCODE -ne 0){throw 'Service registration failed'}}
    & sc.exe sidtype $name unrestricted | Out-Null
    $sid=([Security.Principal.NTAccount]"NT SERVICE\$name").Translate([Security.Principal.SecurityIdentifier]).Value
    if(!(Test-Path -LiteralPath $data)){throw 'Retail private configuration must be prepared first'}
    # Exact private ACL: no inherited or stale explicit grants survive on Retail's own tree.
    $acl=New-Object Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true,$false)
    $inherit=[Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'
    foreach($entry in @(@('S-1-5-18','FullControl'),@('S-1-5-32-544','FullControl'),@($sid,'Modify'))){
      $identity=New-Object Security.Principal.SecurityIdentifier($entry[0])
      $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($identity,$entry[1],$inherit,'None','Allow')))
    }
    $acl.SetOwner((New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')))
    $items=@(Get-Item -LiteralPath $data)+@(Get-ChildItem -LiteralPath $data -Recurse -Force)
    foreach($item in $items){if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Retail private reparse point requires review'}}
    Set-Acl -LiteralPath $data -AclObject $acl
    foreach($item in $items | Select-Object -Skip 1){& icacls.exe $item.FullName /reset | Out-Null;if($LASTEXITCODE -ne 0){throw 'Unable to protect Retail private item'}}
    # Code contains no customer state. The service only receives execute/read on its own program tree.
    & icacls.exe $install /grant:r "*$($sid):(OI)(CI)RX" | Out-Null
    if($LASTEXITCODE -ne 0){throw 'Unable to grant Retail code read access'}
    $version=(Get-Content -LiteralPath (Join-Path $install 'current.json') -Raw | ConvertFrom-Json).version
    if($version -notmatch '^\d+\.\d+\.\d+(?:-rc\.\d+)?$'){throw 'Invalid active Retail version'}
    $code=Join-Path $install ('versions\'+$version)
    $private=(& powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $code 'desktop\windows\Private-Config.ps1') -Action Read -Path (Join-Path $data 'server-private.json') | Out-String) | ConvertFrom-Json
    if($LASTEXITCODE -ne 0){throw 'Cannot read Retail backup configuration'}
    $backup=$private.environment.RETAIL_BACKUP_DIR
    $location=Join-Path $data 'operations\backup-location.json'
    if(Test-Path -LiteralPath $location){$backup=(Get-Content -LiteralPath $location -Raw | ConvertFrom-Json).directory}
    New-Item -ItemType Directory -Path $backup -Force | Out-Null
    if((Get-Item -LiteralPath $backup).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Backup folder cannot be a reparse point'}
    # Preserve existing folder grants; only add the Retail service identity to the chosen backup folder.
    & icacls.exe $backup /grant:r "*$($sid):(OI)(CI)M" | Out-Null
    if($LASTEXITCODE -ne 0){throw 'Unable to grant backup-folder access'}
    Start-Service -Name $name
}elseif($Action -eq 'Start'){Start-Service -Name $name}
elseif($Action -eq 'Stop'){if($existing){Stop-Service -Name $name -ErrorAction Stop}}
elseif($Action -eq 'Remove'){if($existing){if($existing.State -ne 'Stopped'){Stop-Service -Name $name};& $wrapper uninstall;if($LASTEXITCODE -ne 0){throw 'Service removal failed'}}}
