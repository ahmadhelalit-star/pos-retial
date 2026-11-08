param([Parameter(Mandatory)][ValidateSet('Add','Remove')][string]$Action,[int]$Port,[string]$Program,[switch]$UserApproved,[switch]$PlanOnly)
$ErrorActionPreference='Stop';$name='ShamTouchRetailServer-HTTPS'
if($PlanOnly){@{name=$name;action=$Action;port=$Port;profiles='Private,Domain';remote='LocalSubnet';requiresApproval=$true} | ConvertTo-Json;exit 0}
if($Action -eq 'Add'){
    if(!$UserApproved){throw 'Explicit firewall approval required'}
    if($Port -lt 1024 -or $Port -gt 65535 -or !(Test-Path -LiteralPath $Program)){throw 'Invalid Retail firewall input'}
    $existing=Get-NetFirewallRule -Name $name -ErrorAction SilentlyContinue
    if($existing -and $existing.Description -ne 'Sham Touch Retail HTTPS only'){throw 'Unexpected firewall rule owner'}
    if($existing){Remove-NetFirewallRule -Name $name}
    New-NetFirewallRule -Name $name -DisplayName 'Sham Touch Retail HTTPS' -Description 'Sham Touch Retail HTTPS only' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -Program ([IO.Path]::GetFullPath($Program)) -Profile Private,Domain -RemoteAddress LocalSubnet | Out-Null
}else{$existing=Get-NetFirewallRule -Name $name -ErrorAction SilentlyContinue;if($existing -and $existing.Description -eq 'Sham Touch Retail HTTPS only'){Remove-NetFirewallRule -Name $name}}
