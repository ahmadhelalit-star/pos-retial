const crypto = require("node:crypto");
const { collectWindowsDeviceInfo, compactDeviceInfo } = require("./windowsDeviceInfo");
const {
  selectHardwareIdentifier,
  selectHardwareIdentifierBySource,
  createFingerprint,
} = require("./deviceIdentity");
const { createRequestCode, REQUEST_VERSION } = require("./requestCode");
const { OfflineActivationError } = require("./errors");

function normalizeRegisterData(input = {}) {
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  const phone = typeof input.phone === "string" ? input.phone.trim().replace(/\s+/g, " ") : "";

  if (name.length < 2 || name.length > 100 || /[\u0000-\u001F\u007F]/.test(name)) {
    throw new OfflineActivationError("INVALID_NAME", "A valid customer name is required");
  }
  const digits = phone.replace(/\D/g, "");
  if (
    phone.length < 5
    || phone.length > 30
    || digits.length < 5
    || !/^[0-9+().\-\s]+$/.test(phone)
  ) {
    throw new OfflineActivationError("INVALID_PHONE", "A valid phone number is required");
  }
  return { name, phone };
}

async function createActivationRequest(input, options = {}) {
  const { name, phone } = normalizeRegisterData(input);
  const collectDeviceInfo = options.collectDeviceInfo || collectWindowsDeviceInfo;
  let collectedInfo = {};
  try {
    collectedInfo = compactDeviceInfo(await collectDeviceInfo());
  } catch {
    collectedInfo = {};
  }

  const selected = options.fingerprintSource
    ? selectHardwareIdentifierBySource(collectedInfo, options.fingerprintSource)
    : selectHardwareIdentifier(collectedInfo);
  const payload = {
    requestVersion: REQUEST_VERSION,
    requestId: (options.randomUUID || crypto.randomUUID)(),
    customerName: name,
    phone,
    fingerprintHash: createFingerprint(selected.normalized),
    fingerprintSource: selected.source,
    createdAt: (options.now || (() => new Date()))().toISOString(),
    deviceInfo: collectedInfo,
  };

  return {
    requestCode: createRequestCode(payload),
    request: payload,
  };
}

module.exports = { normalizeRegisterData, createActivationRequest };
