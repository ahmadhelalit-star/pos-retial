#ifndef SourceDir
  #error SourceDir required
#endif
#ifndef OutputDirectory
  #error OutputDirectory required
#endif
#ifndef AppVersion
  #define AppVersion "0.4.0-rc.1"
#endif
#ifndef ServerReleaseHash
  #error ServerReleaseHash required
#endif
#ifndef CashierReleaseHash
  #error CashierReleaseHash required
#endif
[Setup]
AppId={{DE872716-FE19-4DE8-B52A-483F22A8C0AE}
AppName=Sham Touch Retail Candidate
AppVersion={#AppVersion}
DefaultDirName={autopf}\Sham Touch\Retail
DefaultGroupName=Sham Touch Retail
OutputDir={#OutputDirectory}
OutputBaseFilename=Sham-Touch-Retail-{#AppVersion}-Candidate-Setup
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
Compression=lzma2/normal
SolidCompression=yes
CloseApplications=no
RestartApplications=no
UninstallDisplayName=Sham Touch Retail Candidate (data preserved)
[Types]
Name: full; Description: "Server and Cashier / السيرفر والكاشير"
Name: server; Description: "Server only / السيرفر فقط"
Name: cashier; Description: "Cashier only / الكاشير فقط"
[Components]
Name: server; Description: "Retail HTTPS server and Windows service"; Types: full server
Name: cashier; Description: "Retail cashier and Local Print Agent"; Types: full cashier
[Tasks]
Name: firewall; Description: "Allow Retail HTTPS on Private/Domain local network only / السماح لاتصال Retail في الشبكة المحلية"; Components: server; Flags: unchecked
[Files]
Source: "{#SourceDir}\server\*"; DestDir: "{app}\versions\{#AppVersion}"; Components: server; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceDir}\cashier\*"; DestDir: "{app}\versions\{#AppVersion}"; Components: cashier and not server; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceDir}\service\*"; DestDir: "{app}\service"; Components: server; Flags: ignoreversion
Source: "{#SourceDir}\RetailCashier.exe"; DestDir: "{app}"; Components: cashier; Flags: ignoreversion
[Icons]
Name: "{autoprograms}\Sham Touch Retail\Cashier"; Filename: "{app}\RetailCashier.exe"; Components: cashier
Name: "{autodesktop}\Sham Touch Retail"; Filename: "{app}\RetailCashier.exe"; Components: cashier
[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""{app}\service\Manage-RetailService.ps1"" -Action Remove -InstallDir ""{app}"""; Components: server; Flags: runhidden; RunOnceId: RemoveRetailService
Filename: "powershell.exe"; Parameters: "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""{app}\service\Configure-Firewall.ps1"" -Action Remove"; Components: server; Flags: runhidden; RunOnceId: RemoveRetailFirewall
; No PostgreSQL database, ProgramData, backups, user profile, certificate or activation is deleted.
[Code]
var
  ServerPage, PgPage, BusinessPage, ClientPage: TInputQueryWizardPage;
  BackupPage: TInputDirWizardPage;
  Prepared, Activated, HadServer: Boolean;
function J(S: String): String;
begin
  StringChangeEx(S, '\', '\\', True); StringChangeEx(S, '"', '\"', True);
  StringChangeEx(S, #13, '\r', True); StringChangeEx(S, #10, '\n', True);
  Result := '"' + S + '"';
end;
procedure InitializeWizard;
begin
  ServerPage := CreateInputQueryPage(wpSelectComponents, 'Retail server / السيرفر', 'HTTPS address and port', 'Use the Windows server name or its fixed LAN address. PostgreSQL remains local to this computer.');
  ServerPage.Add('HTTPS address / عنوان السيرفر', False); ServerPage.Values[0] := 'https://localhost:37951';
  ServerPage.Add('HTTPS port / المنفذ', False); ServerPage.Values[1] := '37951';
  PgPage := CreateInputQueryPage(ServerPage.ID, 'Local PostgreSQL 17', 'Existing local PostgreSQL connection', 'This creates a separate Retail database and roles. Restaurant databases and services are not changed.');
  PgPage.Add('PostgreSQL port', False); PgPage.Values[0] := '5432';
  PgPage.Add('PostgreSQL administrator', False); PgPage.Values[1] := 'postgres';
  PgPage.Add('PostgreSQL password', True);
  PgPage.Add('New Retail database', False); PgPage.Values[3] := 'sham_touch_retail_main';
  BusinessPage := CreateInputQueryPage(PgPage.ID, 'Retail administrator / مدير النشاط', 'Create the first administrator', 'These credentials are only used for a new installation. Existing accounts are preserved.');
  BusinessPage.Add('Business name / اسم النشاط', False);
  BusinessPage.Add('Retail username / اسم المستخدم', False);
  BusinessPage.Add('Retail password (12+ characters) / كلمة المرور', True);
  BackupPage := CreateInputDirPage(BusinessPage.ID, 'Retail backups / النسخ', 'Every six hours; retain two days', 'Choose a backup folder accessible to the Retail Windows service. Existing backups are preserved.', False, '');
  BackupPage.Add('Backup folder'); BackupPage.Values[0] := ExpandConstant('{commonappdata}\Sham Touch\Retail Server\backups');
  ClientPage := CreateInputQueryPage(BackupPage.ID, 'Cashier connection / اتصال الكاشير', 'Trusted Retail server', 'TLS is verified at first launch before the connection is saved. Combined installation can use the local server certificate automatically.');
  ClientPage.Add('HTTPS server address', False); ClientPage.Values[0] := 'https://localhost:37951';
  ClientPage.Add('Server certificate PEM file (blank for combined local installation)', False);
end;
function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  if (PageID = ServerPage.ID) or (PageID = BackupPage.ID) then Result := not WizardIsComponentSelected('server');
  if (PageID = PgPage.ID) or (PageID = BusinessPage.ID) then Result := (not WizardIsComponentSelected('server')) or FileExists(ExpandConstant('{commonappdata}\Sham Touch\Retail Server\server-private.json'));
  if PageID = ClientPage.ID then Result := not WizardIsComponentSelected('cashier');
end;
function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = BusinessPage.ID then
    if (Length(BusinessPage.Values[2]) < 12) or (Length(BusinessPage.Values[1]) < 3) or (Length(BusinessPage.Values[0]) < 1) then begin MsgBox('Enter the business name, username and a password of at least 12 characters.', mbError, MB_OK); Result := False; end;
end;
function RunPS(Script, Params: String): Boolean;
var Code: Integer;
begin Result := Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + Script + '" ' + Params, '', SW_HIDE, ewWaitUntilTerminated, Code) and (Code = 0); end;
function PrepareToInstall(var NeedsRestart: Boolean): String;
var Existing, Expected: String;
begin
  Result := ''; Existing := ExpandConstant('{app}\versions\{#AppVersion}\release.json');
  if WizardIsComponentSelected('server') then Expected := '{#ServerReleaseHash}' else Expected := '{#CashierReleaseHash}';
  if FileExists(Existing) and (CompareText(GetSHA256OfFile(Existing), Expected) <> 0) then begin Result := 'A different package already uses this version. Use a new signed version; existing files were preserved.'; exit; end;
  HadServer := FileExists(ExpandConstant('{app}\service\ShamTouchRetailServer.exe'));
  if HadServer then begin
    if not WizardIsComponentSelected('server') then begin Result := 'Include the server component to update this server installation safely.'; exit; end;
    if not RunPS(ExpandConstant('{app}\service\Manage-RetailService.ps1'), '-Action Stop -InstallDir "' + ExpandConstant('{app}') + '"') then begin Result := 'Unable to stop the existing Retail service safely.'; exit; end;
  end;
  Prepared := True;
end;
procedure CurStepChanged(CurStep: TSetupStep);
var VersionRoot, Input, Mode, Config, Certificate: String; Code: Integer;
begin
  if CurStep <> ssPostInstall then exit;
  VersionRoot := ExpandConstant('{app}\versions\{#AppVersion}'); Mode := 'cashier';
  if WizardIsComponentSelected('server') then begin
    Mode := 'server'; Config := ExpandConstant('{commonappdata}\Sham Touch\Retail Server\server-private.json');
    if not FileExists(Config) then begin
      Input := '{"origin":'+J(ServerPage.Values[0])+',"port":'+ServerPage.Values[1]+',"pgPort":'+J(PgPage.Values[0])+',"pgUser":'+J(PgPage.Values[1])+',"pgPassword":'+J(PgPage.Values[2])+',"database":'+J(PgPage.Values[3])+',"company":'+J(BusinessPage.Values[0])+',"username":'+J(BusinessPage.Values[1])+',"password":'+J(BusinessPage.Values[2])+',"backupDirectory":'+J(BackupPage.Values[0])+'}';
      SaveStringToFile(ExpandConstant('{tmp}\retail-setup.json'),UTF8Encode(Input),False);
      if not RunPS(VersionRoot+'\desktop\windows\Configure-Server.ps1','-InstallDir "'+VersionRoot+'" -InputPath "'+ExpandConstant('{tmp}\retail-setup.json')+'"') then RaiseException('Retail server configuration failed. Existing databases were preserved. Review installation prerequisites.');
    end;
  end;
  if not Exec(VersionRoot+'\runtime\node.exe','"'+VersionRoot+'\desktop\activate.mjs" "'+ExpandConstant('{app}')+'" "'+VersionRoot+'" '+Mode,'',SW_HIDE,ewWaitUntilTerminated,Code) or (Code <> 0) then RaiseException('Retail activation/update failed. Previous code and database were preserved; review the update journal.');
  Activated := True;
  if WizardIsComponentSelected('cashier') then begin
    Certificate := ClientPage.Values[1]; if Certificate = '' then Certificate := ExpandConstant('{commonappdata}\Sham Touch\Retail Public\server-ca.pem');
    if FileExists(Certificate) then begin if not FileCopy(Certificate,ExpandConstant('{app}\cashier-ca.pem'),False) then RaiseException('Cannot copy the public server certificate'); Certificate := ExpandConstant('{app}\cashier-ca.pem'); end;
    SaveStringToFile(ExpandConstant('{app}\cashier-defaults.json'),UTF8Encode('{"server":'+J(ClientPage.Values[0])+',"caFile":'+J(Certificate)+'}'),False);
  end;
  if WizardIsTaskSelected('firewall') then
    if not RunPS(VersionRoot+'\desktop\windows\Configure-Firewall.ps1','-Action Add -Port '+ServerPage.Values[1]+' -Program "'+VersionRoot+'\runtime\node.exe" -UserApproved') then RaiseException('Retail installed, but the approved firewall rule could not be applied.');
end;
procedure DeinitializeSetup;
begin
  if Prepared and HadServer and not Activated then RunPS(ExpandConstant('{app}\service\Manage-RetailService.ps1'),'-Action Start -InstallDir "'+ExpandConstant('{app}')+'"');
end;
