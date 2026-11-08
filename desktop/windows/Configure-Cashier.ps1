param([Parameter(Mandatory)][string]$InstallDir,[string]$DefaultsPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$profile=Join-Path $env:LOCALAPPDATA 'Sham Touch\Retail Cashier';New-Item -ItemType Directory -Path $profile -Force | Out-Null
$defaults=@{};if(Test-Path -LiteralPath (Join-Path $profile 'client.json')){$defaults=Get-Content -LiteralPath (Join-Path $profile 'client.json') -Raw | ConvertFrom-Json}elseif($DefaultsPath -and (Test-Path -LiteralPath $DefaultsPath)){$defaults=Get-Content -LiteralPath $DefaultsPath -Raw | ConvertFrom-Json}
$form=[Windows.Forms.Form]::new();$form.Text='Sham Touch Retail — Cashier connection';$form.Size=[Drawing.Size]::new(650,420);$form.StartPosition='CenterScreen'
function Field($text,$top,$value){$label=[Windows.Forms.Label]::new();$label.Text=$text;$label.Location=[Drawing.Point]::new(15,$top);$label.Size=[Drawing.Size]::new(600,20);$form.Controls.Add($label);$box=[Windows.Forms.TextBox]::new();$box.Location=[Drawing.Point]::new(15,($top+22));$box.Size=[Drawing.Size]::new(600,25);$box.Text=$value;$form.Controls.Add($box);return $box}
$server=Field 'HTTPS server address / عنوان السيرفر' 15 ([string]$defaults.server)
$certificate=Field 'Server certificate PEM file / شهادة السيرفر' 80 ([string]$defaults.caFile)
$chromeDefault=Join-Path $env:PROGRAMFILES 'Google\Chrome\Application\chrome.exe';if(!(Test-Path -LiteralPath $chromeDefault)){$chromeDefault=Join-Path ${env:PROGRAMFILES(X86)} 'Microsoft\Edge\Application\msedge.exe'}
$chrome=Field 'Chrome or Edge executable / مسار المتصفح' 145 $chromeDefault
$status=[Windows.Forms.Label]::new();$status.Location=[Drawing.Point]::new(15,225);$status.Size=[Drawing.Size]::new(600,65);$form.Controls.Add($status)
$button=[Windows.Forms.Button]::new();$button.Text='Test TLS and save / فحص الاتصال والحفظ';$button.Location=[Drawing.Point]::new(15,310);$button.Size=[Drawing.Size]::new(600,40);$form.Controls.Add($button)
$button.Add_Click({try{
    $uri=[Uri]$server.Text.Trim();if($uri.Scheme -ne 'https' -or $uri.AbsolutePath -ne '/'){throw 'Use an HTTPS server origin'}
    if(!(Test-Path -LiteralPath $certificate.Text -PathType Leaf) -or !(Test-Path -LiteralPath $chrome.Text -PathType Leaf)){throw 'Choose an existing certificate and browser'}
    $candidate=Join-Path $profile 'connection-candidate.json';$value=@{product='retail-cashier';server=$uri.GetLeftPart([UriPartial]::Authority);caFile=[IO.Path]::GetFullPath($certificate.Text);chrome=[IO.Path]::GetFullPath($chrome.Text);port=37945;printers=@{}}
    if($defaults.terminalId){$value.terminalId=$defaults.terminalId};if($defaults.printers){$value.printers=$defaults.printers}
    [IO.File]::WriteAllText($candidate,($value | ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false))
    $result=& (Join-Path $InstallDir 'runtime\node.exe') (Join-Path $InstallDir 'desktop\test-connection.mjs') $candidate 2>&1
    if($LASTEXITCODE -ne 0){throw 'TLS connection failed. Verify server address, certificate and server startup.'}
    $targetCa=Join-Path $profile 'server-ca.pem';if(![IO.Path]::GetFullPath($value.caFile).Equals([IO.Path]::GetFullPath($targetCa),[StringComparison]::OrdinalIgnoreCase)){Copy-Item -LiteralPath $value.caFile -Destination $targetCa -Force};$value.caFile=$targetCa
    [IO.File]::WriteAllText((Join-Path $profile 'client.json'),($value | ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false));$form.Tag='saved';$form.Close()
}catch{$status.Text=$_.Exception.Message}})
[void]$form.ShowDialog();if($form.Tag -ne 'saved'){exit 1}
