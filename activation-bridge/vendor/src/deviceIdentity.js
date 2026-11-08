const crypto = require("node:crypto");
const { OfflineActivationError } = require("./errors");

const FINGERPRINT_SOURCES = Object.freeze({
  SMBIOS_UUID: "SMBIOS_UUID",
  MOTHERBOARD_SERIAL: "MOTHERBOARD_SERIAL",
  CPU_ID: "CPU_ID",
});

const GENERIC_VALUES = new Set([
  "DEFAULT STRING",
  "TO BE FILLED BY O.E.M.",
  "TO BE FILLED BY OEM",
  "TO BE FILLED BY O.E.M",
  "UNKNOWN",
  "NOT AVAILABLE",
  "NOT APPLICABLE",
  "NOT SPECIFIED",
  "NONE",
  "NULL",
  "N/A",
  "NA",
  "SYSTEM SERIAL NUMBER",
  "SERIAL NUMBER",
  "INVALID",
  "OEM",
]);

function normalizeHardwareId(value) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .normalize("NFKC")
    .trim()
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function isGenericHardwareId(value) {
  const normalized = normalizeHardwareId(value);
  if (!normalized || GENERIC_VALUES.has(normalized)) return true;

  const compact = normalized.replace(/[^A-Z0-9]/g, "");
  if (compact.length < 4) return true;
  if (/^(?:0+|F+|X+|-+)$/.test(compact)) return true;
  if (/^(?:0123456789|1234567890|123456789|00000000)$/.test(compact)) return true;
  if (/DEFAULT|UNKNOWN|NOTAVAILABLE|NOTSPECIFIED|TOBEFILLEDBY|SERIALNUMBER/.test(compact)) {
    return true;
  }

  return false;
}

function normalizeUuid(value) {
  const normalized = normalizeHardwareId(value).replace(/-/g, "");
  if (!/^[A-F0-9]{32}$/.test(normalized)) return "";
  return [
    normalized.slice(0, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 16),
    normalized.slice(16, 20),
    normalized.slice(20),
  ].join("-");
}

function validCandidate(source, value) {
  const normalized = source === FINGERPRINT_SOURCES.SMBIOS_UUID
    ? normalizeUuid(value)
    : normalizeHardwareId(value);
  if (!normalized || isGenericHardwareId(normalized)) return null;
  return { source, normalized };
}

function selectHardwareIdentifierBySource(deviceInfo = {}, source) {
  const fields = {
    [FINGERPRINT_SOURCES.SMBIOS_UUID]: "smbiosUuid",
    [FINGERPRINT_SOURCES.MOTHERBOARD_SERIAL]: "motherboardSerial",
    [FINGERPRINT_SOURCES.CPU_ID]: "cpuId",
  };
  const field = fields[source];
  if (!field) {
    throw new OfflineActivationError(
      "INVALID_FINGERPRINT_SOURCE",
      "The requested hardware fingerprint source is not supported",
    );
  }
  const selected = validCandidate(source, deviceInfo[field]);
  if (!selected) {
    throw new OfflineActivationError(
      "DEVICE_ID_SOURCE_UNAVAILABLE",
      `The required hardware identifier is unavailable: ${source}`,
    );
  }
  return selected;
}

function selectHardwareIdentifier(deviceInfo = {}) {
  const candidates = [
    validCandidate(FINGERPRINT_SOURCES.SMBIOS_UUID, deviceInfo.smbiosUuid),
    validCandidate(FINGERPRINT_SOURCES.MOTHERBOARD_SERIAL, deviceInfo.motherboardSerial),
    validCandidate(FINGERPRINT_SOURCES.CPU_ID, deviceInfo.cpuId),
  ];
  const selected = candidates.find(Boolean);

  if (!selected) {
    throw new OfflineActivationError(
      "DEVICE_ID_UNAVAILABLE",
      "No stable hardware identifier is available",
    );
  }

  return selected;
}

function createFingerprint(normalizedHardwareId) {
  const normalized = normalizeHardwareId(normalizedHardwareId);
  if (!normalized) {
    throw new OfflineActivationError(
      "DEVICE_ID_UNAVAILABLE",
      "A hardware identifier is required to create a fingerprint",
    );
  }
  return crypto
    .createHash("sha256")
    .update(`POS_DEVICE_FINGERPRINT_V1:${normalized}`, "utf8")
    .digest("hex");
}

module.exports = {
  FINGERPRINT_SOURCES,
  normalizeHardwareId,
  isGenericHardwareId,
  normalizeUuid,
  selectHardwareIdentifierBySource,
  selectHardwareIdentifier,
  createFingerprint,
};
