$ErrorActionPreference='Stop'
# Windows PowerShell can inherit PowerShell 7's module search path from the development shell.
Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Security\Microsoft.PowerShell.Security.psd1') -Force
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$private=Join-Path $root '.developer'
New-Item -ItemType Directory -Path $private -Force | Out-Null
if((Get-Item -LiteralPath $private).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Developer private folder must not be a link'}
$acl=New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true,$false)
$current=[Security.Principal.WindowsIdentity]::GetCurrent().User
foreach($identity in @($current,(New-Object Security.Principal.SecurityIdentifier('S-1-5-18')),(New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')))){
  $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($identity,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
}
$acl.SetOwner($current)
Set-Acl -LiteralPath $private -AclObject $acl
$envPath=Join-Path $private '.env'
$form=[Windows.Forms.Form]::new();$form.Text='Sham Touch Retail Developer - PostgreSQL';$form.Size=[Drawing.Size]::new(620,480);$form.StartPosition='CenterScreen';$form.TopMost=$true
function Field($label,$y,$default,$secret=$false){$l=[Windows.Forms.Label]::new();$l.Text=$label;$l.SetBounds(20,$y,560,20);$form.Controls.Add($l);$box=[Windows.Forms.TextBox]::new();$box.Text=$default;$box.SetBounds(20,($y+23),560,26);$box.UseSystemPasswordChar=$secret;$form.Controls.Add($box);return $box}
$hostField=Field 'PostgreSQL host (confirm your pgAdmin server)' 15 '127.0.0.1'
$portField=Field 'PostgreSQL port (confirm your pgAdmin server)' 80 '5432'
$userField=Field 'PostgreSQL username' 145 ''
$passwordField=Field 'PostgreSQL password (saved locally; never sent to chat)' 210 '' $true
$note=[Windows.Forms.Label]::new();$note.Text='Database: sham_retail_dev (existing database only). No database is created or reset.';$note.SetBounds(20,280,560,40);$form.Controls.Add($note)
$status=[Windows.Forms.Label]::new();$status.SetBounds(20,325,560,35);$form.Controls.Add($status)
$button=[Windows.Forms.Button]::new();$button.Text='Save private Developer connection';$button.SetBounds(20,370,560,35);$form.Controls.Add($button)
$button.Add_Click({try{
  $runnerPath=Join-Path $private 'runner.json'
  if(Test-Path -LiteralPath $runnerPath){$runner=Get-Content -LiteralPath $runnerPath -Raw | ConvertFrom-Json;if($runner.running -and (Get-Process -Id $runner.pid -ErrorAction SilentlyContinue)){throw 'Stop Retail Developer with npm run dev:stop before changing its connection.'}}
  if([string]::IsNullOrWhiteSpace($hostField.Text) -or [string]::IsNullOrWhiteSpace($userField.Text) -or $passwordField.Text.Length -eq 0){throw 'Enter host, username and password; no password is assumed.'}
  $port=0;if(![int]::TryParse($portField.Text,[ref]$port) -or $port -lt 1 -or $port -gt 65535){throw 'Enter a valid PostgreSQL port'}
  $hostName=$hostField.Text.Trim();if($hostName -notmatch '^[a-zA-Z0-9.\-:\[\]]+$'){throw 'Enter a hostname or IP address only'}
  if((Test-Path -LiteralPath $envPath) -and [Windows.Forms.MessageBox]::Show('Replace only the private Developer connection? No database changes will be made.','Developer connection','YesNo') -ne 'Yes'){return}
  $url='postgresql://{0}:{1}@{2}:{3}/sham_retail_dev' -f [Uri]::EscapeDataString($userField.Text.Trim()),[Uri]::EscapeDataString($passwordField.Text),$hostName,$port
  $content="DATABASE_URL=$url`nRETAIL_DEVELOPER_MODE=true`nNODE_ENV=development`nHOST=127.0.0.1`nPORT=37961`nWEB_ORIGIN=http://127.0.0.1:5196`nCOOKIE_SECURE=false`nSESSION_HOURS=8`n"
  [IO.File]::WriteAllText($envPath,$content,[Text.UTF8Encoding]::new($false))
  $passwordField.Clear();$form.Tag='saved';$form.Close()
}catch{$status.Text=$_.Exception.Message}})
[void]$form.ShowDialog()
if($form.Tag -ne 'saved'){exit 1}
