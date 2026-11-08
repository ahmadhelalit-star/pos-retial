const crypto = require("node:crypto");
const { FINGERPRINT_SOURCES } = require("./deviceIdentity");
const { OfflineActivationError } = require("./errors");

const REQUEST_VERSION = 1;
const REQUEST_CODE_PREFIX = "POSREQ1-";
const REQUIRED_PAYLOAD_FIELDS = [
  "requestVersion",
  "requestId",
  "customerName",
  "phone",
  "fingerprintHash",
  "fingerprintSource",
  "createdAt",
  "deviceInfo",
];

function checksum(encodedPayload) {
  return crypto
    .createHash("sha256")
    .update(`${REQUEST_CODE_PREFIX}${encodedPayload}`, "utf8")
    .digest("base64url");
}

function assertValidPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new OfflineActivationError("INVALID_REQUEST_CODE", "Request payload must be an object");
  }
  for (const field of REQUIRED_PAYLOAD_FIELDS) {
    if (!(field in payload)) {
      throw new OfflineActivationError("INVALID_REQUEST_CODE", `Missing request field: ${field}`);
    }
  }
  if (payload.requestVersion !== REQUEST_VERSION) {
    throw new OfflineActivationError("UNSUPPORTED_REQUEST_VERSION", "Unsupported request version");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.requestId)) {
    throw new OfflineActivationError("INVALID_REQUEST_CODE", "Invalid request ID");
  }
  if (typeof payload.customerName !== "string" || !payload.customerName.trim()) {
    throw new OfflineActivationError("INVALID_REQUEST_CODE", "Invalid customer name");
  }
  if (typeof payload.phone !== "string" || !payload.phone.trim()) {
    throw new OfflineActivationError("INVALID_REQUEST_CODE", "Invalid phone");
  }
  if (!/^[a-f0-9]{64}$/i.test(payload.fingerprintHash)) {
    throw new OfflineActivationError("INVALID_REQUEST_CODE", "Invalid fingerprint hash");
  }
  if (!Object.values(FINGERPRINT_SOURCES).includes(payload.fingerprintSource)) {
    throw new OfflineActivationError("INVALID_REQUEST_CODE", "Invalid fingerprint source");
  }
  if (Number.isNaN(Date.parse(payload.createdAt))) {
    throw new OfflineActivationError("INVALID_REQUEST_CODE", "Invalid request creation date");
  }
  if (!payload.deviceInfo || typeof payload.deviceInfo !== "object" || Array.isArray(payload.deviceInfo)) {
    throw new OfflineActivationError("INVALID_REQUEST_CODE", "Invalid device information");
  }
}

function createRequestCode(payload) {
  assertValidPayload(payload);
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${REQUEST_CODE_PREFIX}${encodedPayload}.${checksum(encodedPayload)}`;
}

function decodeRequestCode(code) {
  try {
    if (typeof code !== "string" || !code.startsWith(REQUEST_CODE_PREFIX)) {
      throw new OfflineActivationError("INVALID_REQUEST_PREFIX", "Invalid request code prefix");
    }
    const content = code.slice(REQUEST_CODE_PREFIX.length);
    const parts = content.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new OfflineActivationError("INVALID_REQUEST_CODE", "Malformed request code");
    }
    const [encodedPayload, suppliedChecksum] = parts;
    if (!/^[A-Za-z0-9_-]+$/.test(encodedPayload) || !/^[A-Za-z0-9_-]{43}$/.test(suppliedChecksum)) {
      throw new OfflineActivationError("INVALID_REQUEST_CODE", "Malformed request code encoding");
    }
    const expectedChecksum = checksum(encodedPayload);
    if (!crypto.timingSafeEqual(Buffer.from(suppliedChecksum), Buffer.from(expectedChecksum))) {
      throw new OfflineActivationError("CORRUPTED_REQUEST_CODE", "Request code checksum mismatch");
    }
    const payloadText = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(payloadText);
    assertValidPayload(payload);
    return payload;
  } catch (error) {
    if (error instanceof OfflineActivationError) throw error;
    throw new OfflineActivationError("INVALID_REQUEST_CODE", "Unable to decode request code");
  }
}

module.exports = {
  REQUEST_VERSION,
  REQUEST_CODE_PREFIX,
  createRequestCode,
  decodeRequestCode,
  assertValidPayload,
};
