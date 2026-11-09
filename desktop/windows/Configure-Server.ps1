param([Parameter(Mandatory)][string]$InstallDir,[Parameter(Mandatory)][string]$InputPath)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath($InstallDir)
$data=Join-Path $env:PROGRAMDATA 'Sham Touch\Retail Server'
$configPath=Join-Path $data 'server-private.json'
if(Test-Path -LiteralPath $configPath){throw 'Existing configuration must be prepared by the update workflow; it will not be replaced'}
$input=Get-Content -LiteralPath $InputPath -Raw | ConvertFrom-Json
if($input.port -lt 1024 -or $input.port -gt 65535){throw 'Invalid server port'}
$uri=[Uri]$input.origin
if($uri.Scheme -ne 'https' -or $uri.Port -ne $input.port -or $uri.AbsolutePath -ne '/'){throw 'HTTPS server address and port must match'}
New-Item -ItemType Directory -Path $data -Force | Out-Null
# Protect secrets before generating or writing any sensitive state.
$acl=New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true,$false)
foreach($id in @('S-1-5-18','S-1-5-32-544')){$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($id)),'FullControl','ContainerInherit,ObjectInherit','None','Allow')))}
$acl.SetOwner((New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')))
Set-Acl -LiteralPath $data -AclObject $acl
$input | Add-Member -NotePropertyName provisionJournal -NotePropertyValue (Join-Path $data 'provision-recovery.json')
$input | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $InputPath -Encoding UTF8
$provision=(& (Join-Path $root 'runtime\node.exe') (Join-Path $root 'desktop\provision.mjs') $InputPath | Out-String)
if($LASTEXITCODE -ne 0){throw 'Database preparation failed; existing databases were not overwritten'}
$database=$provision | ConvertFrom-Json
$tls=Join-Path $data 'tls';New-Item -ItemType Directory -Path $tls -Force | Out-Null
$san='DNS=localhost&IPAddress=127.0.0.1'
$parsed=$null
if([Net.IPAddress]::TryParse($uri.Host,[ref]$parsed)){$san+='&IPAddress='+$uri.Host}else{$san+='&DNS='+$uri.DnsSafeHost}
$certificate=New-SelfSignedCertificate -Type Custom -Subject 'CN=Sham Touch Retail Server' -KeyAlgorithm RSA -KeyLength 3072 -KeyUsage DigitalSignature,KeyEncipherment -TextExtension @('2.5.29.19={critical}{text}ca=false',('2.5.29.17={text}'+$san),'2.5.29.37={text}1.3.6.1.5.5.7.3.1') -NotAfter (Get-Date).AddYears(2) -CertStoreLocation 'Cert:\LocalMachine\My'
$bytes=New-Object byte[] 32;[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes);$tlsPassword=[Convert]::ToBase64String($bytes)
$pfx=Join-Path $tls 'server.pfx';Export-PfxCertificate -Cert $certificate -FilePath $pfx -Password (ConvertTo-SecureString $tlsPassword -AsPlainText -Force) | Out-Null
$public=Join-Path $env:PROGRAMDATA 'Sham Touch\Retail Public';New-Item -ItemType Directory -Path $public -Force | Out-Null
$pem="-----BEGIN CERTIFICATE-----`r`n"+[Convert]::ToBase64String($certificate.RawData,[Base64FormattingOptions]::InsertLineBreaks)+"`r`n-----END CERTIFICATE-----`r`n"
[IO.File]::WriteAllText((Join-Path $public 'server-ca.pem'),$pem,[Text.UTF8Encoding]::new($false))
$environment=@{DATABASE_URL=$database.databaseUrl;RETAIL_MAINTENANCE_URL=$database.maintenanceUrl;RETAIL_COMPANY_ID=$database.companyId;HOST='0.0.0.0';PORT=[string]$input.port;WEB_ORIGIN=$uri.GetLeftPart([UriPartial]::Authority);COOKIE_SECURE='true';NODE_ENV='test';RETAIL_TLS_PFX=$pfx;RETAIL_TLS_PASSWORD=$tlsPassword;RETAIL_RUNTIME_DIR=(Join-Path $data 'runtime');RETAIL_OPERATIONS_DIR=(Join-Path $data 'operations');RETAIL_BACKUP_DIR=[IO.Path]::GetFullPath($input.backupDirectory);RETAIL_PG_TOOLS=(Join-Path $root 'pg-tools');RETAIL_CONTROL_TOKEN=[Guid]::NewGuid().ToString('N')+[Guid]::NewGuid().ToString('N')}
foreach($folder in @('runtime','operations','logs')){New-Item -ItemType Directory -Path (Join-Path $data $folder) -Force | Out-Null}
$json=@{product='sham-touch-retail';version='0.4.0-rc.2';environment=$environment} | ConvertTo-Json -Depth 6 -Compress
$json | & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $root 'desktop\windows\Private-Config.ps1') -Action Write -Path $configPath
if($LASTEXITCODE -ne 0){throw 'Unable to protect Retail configuration'}
@{product='retail';server=$environment.WEB_ORIGIN;certificate=(Join-Path $public 'server-ca.pem');thumbprint=$certificate.Thumbprint} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $public 'server.json') -Encoding UTF8
