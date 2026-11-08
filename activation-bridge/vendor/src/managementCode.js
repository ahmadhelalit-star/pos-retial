const crypto = require("node:crypto");
const { FINGERPRINT_SOURCES } = require("./deviceIdentity");
const { OfflineActivationError } = require("./errors");
const { toPrivateKey, toPublicKey } = require("./keyManager");

const MANAGEMENT_CODE_VERSION = 1;
const MANAGEMENT_CODE_PREFIX = "POSMGT1-";
const MANAGEMENT_SIGNING_CONTEXT = "POSMGT1";
const MANAGEMENT_COMMANDS = Object.freeze(["RESET", "DEACTIVATE", "TRANSFER_RELEASE"]);
const DEFAULT_MANAGEMENT_CODE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MANAGEMENT_CODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^[a-f0-9]{64}$/i;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;
const PAYLOAD_FIELDS = Object.freeze([
  "version",
  "type",
  "commandId",
  "command",
  "licenseId",
  "fingerprintHash",
  "fingerprintSource",
  "issuedAt",
  "expiresAt",
  "reason",
  "nonce",
]);

function exactFields(payload) {
  const actual = Object.keys(payload).sort();
  const expected = [...PAYLOAD_FIELDS].sort();
  return actual.length === expected.length
    && actual.every((field, index) => field === expected[index]);
}

function validIsoTimestamp(value) {
  const milliseconds = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

function normalizeCommand(value) {
  const command = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!MANAGEMENT_COMMANDS.includes(command)) {
    throw new OfflineActivationError("INVALID_MANAGEMENT_COMMAND", "Unsupported management command");
  }
  return command;
}

function normalizeReason(value) {
  const reason = typeof value === "string" ? value.trim() : "";
  if (!reason || reason.length > 500) {
    throw new OfflineActivationError(
      "INVALID_MANAGEMENT_REASON",
      "Management command reason must contain between 1 and 500 characters",
    );
  }
  return reason;
}

function assertValidManagementPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !exactFields(payload)) {
    throw new OfflineActivationError("INVALID_MANAGEMENT_PAYLOAD", "Management payload fields are invalid");
  }
  if (payload.version !== MANAGEMENT_CODE_VERSION || payload.type !== "license_management") {
    throw new OfflineActivationError("INVALID_MANAGEMENT_PAYLOAD", "Management payload type or version is invalid");
  }
  if (!UUID_V4_PATTERN.test(payload.commandId) || !UUID_V4_PATTERN.test(payload.licenseId)) {
    throw new OfflineActivationError("INVALID_MANAGEMENT_PAYLOAD", "Management identifiers are invalid");
  }
  normalizeCommand(payload.command);
  if (!HASH_PATTERN.test(payload.fingerprintHash)
    || !Object.values(FINGERPRINT_SOURCES).includes(payload.fingerprintSource)) {
    throw new OfflineActivationError("INVALID_MANAGEMENT_PAYLOAD", "Management device binding is invalid");
  }
  if (!validIsoTimestamp(payload.issuedAt) || !validIsoTimestamp(payload.expiresAt)
    || Date.parse(payload.expiresAt) <= Date.parse(payload.issuedAt)) {
    throw new OfflineActivationError("INVALID_MANAGEMENT_PAYLOAD", "Management timestamps are invalid");
  }
  normalizeReason(payload.reason);
  if (!NONCE_PATTERN.test(payload.nonce)) {
    throw new OfflineActivationError("INVALID_MANAGEMENT_PAYLOAD", "Management nonce is invalid");
  }
  return payload;
}

function createManagementCode(input, privateKey, options = {}) {
  const issuedValue = (options.now || (() => new Date()))();
  const issuedAtMs = issuedValue instanceof Date ? issuedValue.getTime() : Date.parse(issuedValue);
  const ttlMs = options.ttlMs ?? DEFAULT_MANAGEMENT_CODE_TTL_MS;
  if (!Number.isFinite(issuedAtMs) || !Number.isInteger(ttlMs)
    || ttlMs < 60_000 || ttlMs > MAX_MANAGEMENT_CODE_TTL_MS) {
    throw new OfflineActivationError("INVALID_MANAGEMENT_EXPIRY", "Management code expiry is invalid");
  }
  const randomBytes = options.randomBytes || crypto.randomBytes;
  const nonceBytes = randomBytes(32);
  if (!Buffer.isBuffer(nonceBytes) || nonceBytes.length < 16) {
    throw new OfflineActivationError("INVALID_MANAGEMENT_NONCE", "Management nonce generation failed");
  }
  const payload = {
    version: MANAGEMENT_CODE_VERSION,
    type: "license_management",
    commandId: (options.randomUUID || crypto.randomUUID)(),
    command: normalizeCommand(input?.command),
    licenseId: input?.licenseId,
    fingerprintHash: input?.fingerprintHash,
    fingerprintSource: input?.fingerprintSource,
    issuedAt: new Date(issuedAtMs).toISOString(),
    expiresAt: new Date(issuedAtMs + ttlMs).toISOString(),
    reason: normalizeReason(input?.reason),
    nonce: nonceBytes.toString("base64url"),
  };
  assertValidManagementPayload(payload);
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto
    .sign(null, Buffer.from(`${MANAGEMENT_SIGNING_CONTEXT}.${encodedPayload}`, "utf8"), toPrivateKey(privateKey))
    .toString("base64url");
  return {
    managementCode: `${MANAGEMENT_CODE_PREFIX}${encodedPayload}.${signature}`,
    command: payload,
  };
}

function verifyManagementCode(code, publicKey) {
  if (typeof code !== "string" || !code.startsWith(MANAGEMENT_CODE_PREFIX)) {
    throw new OfflineActivationError("INVALID_MANAGEMENT_PREFIX", "Invalid management code prefix");
  }
  const parts = code.slice(MANAGEMENT_CODE_PREFIX.length).split(".");
  if (parts.length !== 2 || parts.some((part) => !part || !/^[A-Za-z0-9_-]+$/.test(part))) {
    throw new OfflineActivationError("INVALID_MANAGEMENT_CODE", "Malformed management code");
  }
  const [encodedPayload, encodedSignature] = parts;
  const payloadBytes = Buffer.from(encodedPayload, "base64url");
  const signature = Buffer.from(encodedSignature, "base64url");
  if (payloadBytes.toString("base64url") !== encodedPayload
    || signature.toString("base64url") !== encodedSignature
    || signature.length !== 64) {
    throw new OfflineActivationError("INVALID_MANAGEMENT_CODE", "Invalid management code encoding");
  }
  if (!crypto.verify(
    null,
    Buffer.from(`${MANAGEMENT_SIGNING_CONTEXT}.${encodedPayload}`, "utf8"),
    toPublicKey(publicKey),
    signature,
  )) {
    throw new OfflineActivationError("INVALID_MANAGEMENT_SIGNATURE", "Management signature is invalid");
  }
  try {
    return assertValidManagementPayload(JSON.parse(payloadBytes.toString("utf8")));
  } catch (error) {
    if (error instanceof OfflineActivationError) throw error;
    throw new OfflineActivationError("INVALID_MANAGEMENT_PAYLOAD", "Unable to decode management payload");
  }
}

module.exports = {
  MANAGEMENT_CODE_VERSION,
  MANAGEMENT_CODE_PREFIX,
  MANAGEMENT_SIGNING_CONTEXT,
  MANAGEMENT_COMMANDS,
  DEFAULT_MANAGEMENT_CODE_TTL_MS,
  MAX_MANAGEMENT_CODE_TTL_MS,
  assertValidManagementPayload,
  createManagementCode,
  verifyManagementCode,
};
