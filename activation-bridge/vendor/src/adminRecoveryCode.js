const crypto = require("node:crypto");
const { FINGERPRINT_SOURCES } = require("./deviceIdentity");
const { OfflineActivationError } = require("./errors");
const { toPrivateKey, toPublicKey } = require("./keyManager");

const RECOVERY_REQUEST_VERSION = 1;
const RECOVERY_REQUEST_CODE_PREFIX = "POSREC-REQ-";
const RECOVERY_CODE_VERSION = 1;
const RECOVERY_CODE_PREFIX = "POSREC-";
const RECOVERY_SIGNING_CONTEXT = "POSREC1";
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^[a-f0-9]{64}$/i;
const REQUEST_FIELDS = Object.freeze([
  "version",
  "requestId",
  "licenseId",
  "fingerprintHash",
  "fingerprintSource",
  "createdAt",
]);

function assertExactFields(payload, expected, errorCode) {
  const fields = Object.keys(payload).sort();
  const required = [...expected].sort();
  if (fields.length !== required.length || fields.some((field, index) => field !== required[index])) {
    throw new OfflineActivationError(errorCode, "Recovery payload fields are invalid");
  }
}

function assertIsoTimestamp(value, errorCode) {
  const milliseconds = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    throw new OfflineActivationError(errorCode, "Recovery timestamp is invalid");
  }
}

function assertValidRecoveryRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new OfflineActivationError("INVALID_RECOVERY_REQUEST", "Recovery request must be an object");
  }
  assertExactFields(payload, REQUEST_FIELDS, "INVALID_RECOVERY_REQUEST");
  if (payload.version !== RECOVERY_REQUEST_VERSION) {
    throw new OfflineActivationError("UNSUPPORTED_RECOVERY_REQUEST_VERSION", "Unsupported recovery request version");
  }
  if (!UUID_V4_PATTERN.test(payload.requestId) || !UUID_V4_PATTERN.test(payload.licenseId)) {
    throw new OfflineActivationError("INVALID_RECOVERY_REQUEST", "Recovery request identifiers are invalid");
  }
  if (!HASH_PATTERN.test(payload.fingerprintHash)) {
    throw new OfflineActivationError("INVALID_RECOVERY_REQUEST", "Recovery device fingerprint is invalid");
  }
  if (!Object.values(FINGERPRINT_SOURCES).includes(payload.fingerprintSource)) {
    throw new OfflineActivationError("INVALID_RECOVERY_REQUEST", "Recovery fingerprint source is invalid");
  }
  assertIsoTimestamp(payload.createdAt, "INVALID_RECOVERY_REQUEST");
  return payload;
}

function decodeRecoveryRequestCode(code) {
  try {
    if (typeof code !== "string" || !code.startsWith(RECOVERY_REQUEST_CODE_PREFIX)) {
      throw new OfflineActivationError("INVALID_RECOVERY_REQUEST_PREFIX", "Invalid recovery request prefix");
    }
    const encodedPayload = code.slice(RECOVERY_REQUEST_CODE_PREFIX.length);
    if (!encodedPayload || !/^[A-Za-z0-9_-]+$/.test(encodedPayload)) {
      throw new OfflineActivationError("INVALID_RECOVERY_REQUEST", "Malformed recovery request encoding");
    }
    const payloadBytes = Buffer.from(encodedPayload, "base64url");
    if (payloadBytes.toString("base64url") !== encodedPayload) {
      throw new OfflineActivationError("INVALID_RECOVERY_REQUEST", "Non-canonical recovery request encoding");
    }
    const payload = JSON.parse(payloadBytes.toString("utf8"));
    assertValidRecoveryRequest(payload);
    return payload;
  } catch (error) {
    if (error instanceof OfflineActivationError) throw error;
    throw new OfflineActivationError("INVALID_RECOVERY_REQUEST", "Unable to decode recovery request");
  }
}

function assertValidRecoveryPayload(payload) {
  const fields = [
    "version", "type", "recoveryId", "requestId", "licenseId",
    "fingerprintHash", "fingerprintSource", "issuedAt",
  ];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new OfflineActivationError("INVALID_RECOVERY_PAYLOAD", "Recovery payload must be an object");
  }
  assertExactFields(payload, fields, "INVALID_RECOVERY_PAYLOAD");
  if (payload.version !== RECOVERY_CODE_VERSION || payload.type !== "admin_recovery") {
    throw new OfflineActivationError("INVALID_RECOVERY_PAYLOAD", "Recovery payload type or version is invalid");
  }
  if (!UUID_V4_PATTERN.test(payload.recoveryId)
    || !UUID_V4_PATTERN.test(payload.requestId)
    || !UUID_V4_PATTERN.test(payload.licenseId)) {
    throw new OfflineActivationError("INVALID_RECOVERY_PAYLOAD", "Recovery identifiers are invalid");
  }
  if (!HASH_PATTERN.test(payload.fingerprintHash)
    || !Object.values(FINGERPRINT_SOURCES).includes(payload.fingerprintSource)) {
    throw new OfflineActivationError("INVALID_RECOVERY_PAYLOAD", "Recovery device binding is invalid");
  }
  assertIsoTimestamp(payload.issuedAt, "INVALID_RECOVERY_PAYLOAD");
  return payload;
}

function createRecoveryCode(requestPayload, privateKey, options = {}) {
  assertValidRecoveryRequest(requestPayload);
  const issuedDate = (options.now || (() => new Date()))();
  const issuedAt = issuedDate instanceof Date ? issuedDate.toISOString() : new Date(issuedDate).toISOString();
  const payload = {
    version: RECOVERY_CODE_VERSION,
    type: "admin_recovery",
    recoveryId: (options.randomUUID || crypto.randomUUID)(),
    requestId: requestPayload.requestId,
    licenseId: requestPayload.licenseId,
    fingerprintHash: requestPayload.fingerprintHash,
    fingerprintSource: requestPayload.fingerprintSource,
    issuedAt,
  };
  assertValidRecoveryPayload(payload);
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto
    .sign(null, Buffer.from(`${RECOVERY_SIGNING_CONTEXT}.${encodedPayload}`, "utf8"), toPrivateKey(privateKey))
    .toString("base64url");
  return { recoveryCode: `${RECOVERY_CODE_PREFIX}${encodedPayload}.${signature}`, recovery: payload };
}

function verifyRecoveryCode(code, publicKey) {
  if (typeof code !== "string" || !code.startsWith(RECOVERY_CODE_PREFIX)) {
    throw new OfflineActivationError("INVALID_RECOVERY_PREFIX", "Invalid recovery code prefix");
  }
  const parts = code.slice(RECOVERY_CODE_PREFIX.length).split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]
    || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) {
    throw new OfflineActivationError("INVALID_RECOVERY_CODE", "Malformed recovery code");
  }
  const [encodedPayload, encodedSignature] = parts;
  const payloadBytes = Buffer.from(encodedPayload, "base64url");
  const signature = Buffer.from(encodedSignature, "base64url");
  if (payloadBytes.toString("base64url") !== encodedPayload
    || signature.toString("base64url") !== encodedSignature
    || signature.length !== 64) {
    throw new OfflineActivationError("INVALID_RECOVERY_CODE", "Invalid recovery code encoding");
  }
  if (!crypto.verify(
    null,
    Buffer.from(`${RECOVERY_SIGNING_CONTEXT}.${encodedPayload}`, "utf8"),
    toPublicKey(publicKey),
    signature,
  )) {
    throw new OfflineActivationError("INVALID_RECOVERY_SIGNATURE", "Recovery signature is invalid");
  }
  try {
    return assertValidRecoveryPayload(JSON.parse(payloadBytes.toString("utf8")));
  } catch (error) {
    if (error instanceof OfflineActivationError) throw error;
    throw new OfflineActivationError("INVALID_RECOVERY_PAYLOAD", "Unable to decode recovery payload");
  }
}

module.exports = {
  RECOVERY_REQUEST_VERSION,
  RECOVERY_REQUEST_CODE_PREFIX,
  RECOVERY_CODE_VERSION,
  RECOVERY_CODE_PREFIX,
  RECOVERY_SIGNING_CONTEXT,
  assertValidRecoveryRequest,
  decodeRecoveryRequestCode,
  assertValidRecoveryPayload,
  createRecoveryCode,
  verifyRecoveryCode,
};
