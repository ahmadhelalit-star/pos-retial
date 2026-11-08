param([Parameter(Mandatory)][ValidateSet('Read','Write')][string]$Action,[Parameter(Mandatory)][string]$Path)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$entropy=[Text.Encoding]::UTF8.GetBytes('ShamTouchRetail.Server.Configuration.v1')
if($Action -eq 'Read') {
    $wrapped=Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    if($wrapped.product -ne 'sham-touch-retail' -or $wrapped.version -ne 1){throw 'Wrong configuration envelope'}
    $plain=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($wrapped.protected),$entropy,[Security.Cryptography.DataProtectionScope]::LocalMachine)
    [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
    [Console]::Write([Text.Encoding]::UTF8.GetString($plain))
} else {
    $plain=[Console]::In.ReadToEnd()
    $null=$plain | ConvertFrom-Json
    $cipher=[Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($plain),$entropy,[Security.Cryptography.DataProtectionScope]::LocalMachine)
    $value=@{product='sham-touch-retail';version=1;protected=[Convert]::ToBase64String($cipher)} | ConvertTo-Json -Compress
    [IO.File]::WriteAllText([IO.Path]::GetFullPath($Path),$value,[Text.UTF8Encoding]::new($false))
}
