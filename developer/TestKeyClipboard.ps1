function Copy-RetailTestKeyPassword {
  param([Parameter(Mandatory=$true)][string]$AccessPath)
  $taskCopyAccess=Get-Content -LiteralPath $AccessPath -Raw | ConvertFrom-Json
  if($taskCopyAccess.testOnly -ne $true -or [string]::IsNullOrEmpty($taskCopyAccess.passphrase)) {
    throw 'Developer test key password is unavailable.'
  }
  for($taskCopyAttempt=0;$taskCopyAttempt -lt 5;$taskCopyAttempt++) {
    try {
      [Windows.Forms.Clipboard]::SetText([string]$taskCopyAccess.passphrase)
      if([string]::Equals([Windows.Forms.Clipboard]::GetText(),[string]$taskCopyAccess.passphrase,[StringComparison]::Ordinal)) {
        return $true
      }
    } catch { }
    Start-Sleep -Milliseconds 80
  }
  throw 'Clipboard verification failed. Please retry Copy.'
}
