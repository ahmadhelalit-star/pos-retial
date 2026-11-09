$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
. (Join-Path $PSScriptRoot 'TestKeyClipboard.ps1')
$taskAccessPath=Join-Path $PSScriptRoot '..\.developer\activation\test-key-access.json'
$taskAccess=Get-Content -LiteralPath $taskAccessPath -Raw | ConvertFrom-Json
if($taskAccess.testOnly -ne $true){throw 'Only the Developer test key may be displayed here.'}
$form=[Windows.Forms.Form]::new();$form.Text='Retail Developer - Verified TEST key password';$form.Size=[Drawing.Size]::new(600,280);$form.StartPosition='CenterScreen'
$label=[Windows.Forms.Label]::new();$label.Text='Retail TEST signing-key password. Use Copy below, then paste in Signing Key Password.';$label.SetBounds(20,15,540,45);$form.Controls.Add($label)
$password=[Windows.Forms.TextBox]::new();$password.ReadOnly=$true;$password.UseSystemPasswordChar=$true;$password.Text=$taskAccess.passphrase;$password.SetBounds(20,65,540,28);$form.Controls.Add($password)
$show=[Windows.Forms.CheckBox]::new();$show.Text='Show locally';$show.SetBounds(20,110,180,25);$show.Add_CheckedChanged({$password.UseSystemPasswordChar=!$show.Checked});$form.Controls.Add($show)
$status=[Windows.Forms.Label]::new();$status.SetBounds(20,160,540,55);$status.Text='Copy verifies the actual clipboard contents. Ctrl+C in the field uses the same verified copy.';$form.Controls.Add($status)
function Copy-DisplayedTestPassword {
  try {
    [void](Copy-RetailTestKeyPassword -AccessPath $taskAccessPath)
    $password.Text=(Get-Content -LiteralPath $taskAccessPath -Raw|ConvertFrom-Json).passphrase
    $status.ForeColor=[Drawing.Color]::DarkGreen
    $status.Text='Copied and verified. Paste in Signing Key Password in the tool.'
  } catch {
    $status.ForeColor=[Drawing.Color]::DarkRed
    $status.Text='Could not verify clipboard copy. Press Copy again.'
  }
}
$copy=[Windows.Forms.Button]::new();$copy.Text='Copy password (verified)';$copy.SetBounds(230,105,330,34);$copy.Add_Click({Copy-DisplayedTestPassword});$form.Controls.Add($copy)
$password.Add_KeyDown({param($sender,$taskKeyEvent) if($taskKeyEvent.Control -and $taskKeyEvent.KeyCode -eq [Windows.Forms.Keys]::C){$taskKeyEvent.SuppressKeyPress=$true;Copy-DisplayedTestPassword}})
[void]$form.ShowDialog()
