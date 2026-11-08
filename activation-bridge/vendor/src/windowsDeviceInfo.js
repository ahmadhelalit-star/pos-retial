const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const DEVICE_INFO_SCRIPT = String.raw`
$ErrorActionPreference = 'SilentlyContinue'

function Get-FirstCimInstance([string] $ClassName) {
  try {
    return Get-CimInstance -ClassName $ClassName -ErrorAction Stop | Select-Object -First 1
  } catch {
    return $null
  }
}

$product = Get-FirstCimInstance 'Win32_ComputerSystemProduct'
$baseBoard = Get-FirstCimInstance 'Win32_BaseBoard'
$processor = Get-FirstCimInstance 'Win32_Processor'
$computer = Get-FirstCimInstance 'Win32_ComputerSystem'
$windows = Get-FirstCimInstance 'Win32_OperatingSystem'

[ordered]@{
  smbiosUuid = if ($product) { [string]$product.UUID } else { $null }
  motherboardSerial = if ($baseBoard) { [string]$baseBoard.SerialNumber } else { $null }
  cpuId = if ($processor) { [string]$processor.ProcessorId } else { $null }
  manufacturer = if ($computer) { [string]$computer.Manufacturer } else { $null }
  model = if ($computer) { [string]$computer.Model } else { $null }
  computerName = [string]$env:COMPUTERNAME
  cpuModel = if ($processor) { [string]$processor.Name } else { $null }
  ramBytes = if ($computer -and $computer.TotalPhysicalMemory) { [UInt64]$computer.TotalPhysicalMemory } else { $null }
  windowsCaption = if ($windows) { [string]$windows.Caption } else { $null }
  windowsVersion = if ($windows) { [string]$windows.Version } else { $null }
  windowsBuildNumber = if ($windows) { [string]$windows.BuildNumber } else { $null }
} | ConvertTo-Json -Compress -Depth 3
`;

function compactDeviceInfo(raw = {}) {
  return Object.fromEntries(
    Object.entries(raw).filter(([, value]) => (
      value !== null
      && value !== undefined
      && (typeof value !== "string" || value.trim() !== "")
    )),
  );
}

async function runPowerShell(script = DEVICE_INFO_SCRIPT) {
  const encodedCommand = Buffer.from(script, "utf16le").toString("base64");
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encodedCommand],
    {
      encoding: "utf8",
      windowsHide: true,
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    },
  );
  return stdout;
}

async function collectWindowsDeviceInfo(options = {}) {
  const platform = options.platform || process.platform;
  if (platform !== "win32") return {};

  const execute = options.runPowerShell || runPowerShell;
  try {
    const output = await execute(DEVICE_INFO_SCRIPT);
    const parsed = typeof output === "string" ? JSON.parse(output.trim()) : output;
    return compactDeviceInfo(parsed && typeof parsed === "object" ? parsed : {});
  } catch {
    return {};
  }
}

module.exports = {
  DEVICE_INFO_SCRIPT,
  compactDeviceInfo,
  runPowerShell,
  collectWindowsDeviceInfo,
};
