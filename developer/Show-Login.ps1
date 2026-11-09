$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$path=Join-Path $PSScriptRoot '..\.developer\login.json'
if(!(Test-Path -LiteralPath $path)){throw 'No generated Developer credentials exist. Existing accounts are not reset automatically.'}
$login=Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
if($login.pendingInitialSetup){[void][Windows.Forms.MessageBox]::Show('Developer preset credentials were retired. Activate Retail and create your own first admin account in the application. Use that account for later sign-in.','Retail Developer');exit}
$form=[Windows.Forms.Form]::new();$form.Text='Retail Developer - Local login';$form.Size=[Drawing.Size]::new(540,250);$form.StartPosition='CenterScreen'
$name=[Windows.Forms.TextBox]::new();$name.ReadOnly=$true;$name.Text=$login.username;$name.SetBounds(20,20,480,28);$form.Controls.Add($name)
$password=[Windows.Forms.TextBox]::new();$password.ReadOnly=$true;$password.UseSystemPasswordChar=$true;$password.Text=$login.password;$password.SetBounds(20,65,480,28);$form.Controls.Add($password)
$show=[Windows.Forms.CheckBox]::new();$show.Text='Show password locally';$show.SetBounds(20,110,220,25);$show.Add_CheckedChanged({$password.UseSystemPasswordChar=!$show.Checked});$form.Controls.Add($show)
$copy=[Windows.Forms.Button]::new();$copy.Text='Copy password';$copy.SetBounds(260,110,240,30);$copy.Add_Click({[Windows.Forms.Clipboard]::SetText($login.password)});$form.Controls.Add($copy)
[void]$form.ShowDialog()
