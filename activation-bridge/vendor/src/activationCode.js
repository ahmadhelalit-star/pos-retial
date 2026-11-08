const crypto = require("node:crypto");
const { FINGERPRINT_SOURCES } = require("./deviceIdentity");
const { assertValidPayload: assertValidRequestPayload } = require("./requestCode");
const { toPrivateKey, toPublicKey } = require("./keyManager");
const { OfflineActivationError } = require("./errors");

const LICENSE_VERSION = 1;
const ACTIVATION_CODE_PREFIX = "POSACT1-";
const SIGNING_CONTEXT = "POSACT1";
const DEFAULT_VALIDITY_DAYS = 365;
const MAX_VALIDITY_DAYS = 3650;
const DAY_MS = 24 * 60 * 60 * 1000;
const LICENSE_TYPES = Object.freeze({
  FIXED_TERM: "FIXED_TERM",
  PERPETUAL: "PERPETUAL",
});
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KNOWN_FEATURES = Object.freeze(["tables", "delivery", "kds", "inventory", "talabat", "callerId", "cloudOrders", "cloudCatalog", "vault"]);
const LEGACY_FEATURES = Object.freeze({ tables: true, delivery: true, kds: false });

function resolveMaxClients(payload) {
  const value = payload?.maxClients;
  if (value === undefined) return 0;
  if (!Number.isSafeInteger(value) || value < 0 || value > 1000) {
    throw new OfflineActivationError("INVALID_MAX_CLIENTS", "maxClients must be an integer between 0 and 1000");
  }
  return value;
}

function validateValidityDays(value, maximum = MAX_VALIDITY_DAYS) {
  if (!Number.isInteger(maximum) || maximum <= 0) {
    throw new OfflineActivationError("INVALID_VALIDITY_LIMIT", "Validity limit must be a positive integer");
  }
  const days = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (!Number.isInteger(days) || days <= 0 || days > maximum) {
    throw new OfflineActivationError(
      "INVALID_VALIDITY_DAYS",
      `Validity days must be an integer between 1 and ${maximum}`,
    );
  }
  return days;
}

function resolveLicenseType(payload) {
  const licenseType = payload?.licenseType === undefined
    ? LICENSE_TYPES.FIXED_TERM
    : payload.licenseType;
  if (!Object.values(LICENSE_TYPES).includes(licenseType)) {
    throw new OfflineActivationError("INVALID_LICENSE_TYPE", "Unsupported license type");
  }
  return licenseType;
}

function normalizeLicenseTerms(value, maximum = MAX_VALIDITY_DAYS) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const licenseType = resolveLicenseType(value);
    if (licenseType === LICENSE_TYPES.PERPETUAL) {
      if (value.validityDays !== undefined && value.validityDays !== null) {
        throw new OfflineActivationError(
          "INVALID_LICENSE_PAYLOAD",
          "Perpetual licenses cannot have validity days",
        );
      }
      return { licenseType, validityDays: null };
    }
    return {
      licenseType,
      validityDays: validateValidityDays(value.validityDays, maximum),
    };
  }
  return {
    licenseType: LICENSE_TYPES.FIXED_TERM,
    validityDays: validateValidityDays(value, maximum),
  };
}

function normalizeFeatures(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new OfflineActivationError("INVALID_LICENSE_FEATURES", "License features must be an object");
  }
  const keys = Object.keys(value);
  if (!Object.hasOwn(value, "tables") || !Object.hasOwn(value, "delivery")
    || keys.some((key) => !KNOWN_FEATURES.includes(key))) {
    throw new OfflineActivationError("INVALID_LICENSE_FEATURES", "License features are invalid");
  }
  for (const key of keys) {
    if (typeof value[key] !== "boolean") {
      throw new OfflineActivationError("INVALID_LICENSE_FEATURES", `License feature must be boolean: ${key}`);
    }
  }
  return { tables: value.tables, delivery: value.delivery, kds: value.kds ?? false,
    ...(value.inventory === undefined ? {} : { inventory: value.inventory }),
    ...(value.talabat === undefined ? {} : { talabat: value.talabat }),
    ...(value.vault === undefined ? {} : { vault: value.vault }),
    ...(value.cloudOrders === undefined ? {} : { cloudOrders: value.cloudOrders }),
    ...(value.cloudCatalog === undefined ? {} : { cloudCatalog: value.cloudCatalog }),
    ...(value.callerId === undefined ? {} : { callerId: value.callerId }) };
}

function resolveFeatures(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new OfflineActivationError("INVALID_LICENSE_FEATURES", "License payload must be an object");
  }
  if (payload.features === undefined) return { ...LEGACY_FEATURES };
  return { ...normalizeFeatures(payload.features) };
}

function assertValidLicensePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new OfflineActivationError("INVALID_LICENSE_PAYLOAD", "License payload must be an object");
  }
  const required = [
    "licenseVersion",
    "licenseId",
    "requestId",
    "customerName",
    "phone",
    "fingerprintHash",
    "fingerprintSource",
    "issuedAt",
    "expiresAt",
    "validityDays",
  ];
  for (const field of required) {
    if (!(field in payload)) {
      throw new OfflineActivationError("INVALID_LICENSE_PAYLOAD", `Missing license field: ${field}`);
    }
  }
  if (payload.licenseVersion !== LICENSE_VERSION) {
    throw new OfflineActivationError("UNSUPPORTED_LICENSE_VERSION", "Unsupported license version");
  }
  if (!UUID_V4_PATTERN.test(payload.licenseId) || !UUID_V4_PATTERN.test(payload.requestId)) {
    throw new OfflineActivationError("INVALID_LICENSE_PAYLOAD", "Invalid license or request ID");
  }
  if (typeof payload.customerName !== "string" || !payload.customerName.trim()) {
    throw new OfflineActivationError("INVALID_LICENSE_PAYLOAD", "Invalid customer name");
  }
  if (typeof payload.phone !== "string" || !payload.phone.trim()) {
    throw new OfflineActivationError("INVALID_LICENSE_PAYLOAD", "Invalid customer phone");
  }
  if (!/^[a-f0-9]{64}$/i.test(payload.fingerprintHash)) {
    throw new OfflineActivationError("INVALID_LICENSE_PAYLOAD", "Invalid fingerprint hash");
  }
  if (!Object.values(FINGERPRINT_SOURCES).includes(payload.fingerprintSource)) {
    throw new OfflineActivationError("INVALID_LICENSE_PAYLOAD", "Invalid fingerprint source");
  }
  const licenseType = resolveLicenseType(payload);
  if (payload.features !== undefined) normalizeFeatures(payload.features);
  resolveMaxClients(payload);
  const issuedAtMs = Date.parse(payload.issuedAt);
  if (!Number.isFinite(issuedAtMs)) {
    throw new OfflineActivationError("INVALID_LICENSE_PAYLOAD", "Invalid license issue timestamp");
  }
  if (licenseType === LICENSE_TYPES.PERPETUAL) {
    if (payload.expiresAt !== null || payload.validityDays !== null) {
      throw new OfflineActivationError(
        "INVALID_LICENSE_PAYLOAD",
        "Perpetual licenses require null expiry and validity days",
      );
    }
  } else {
    const expiresAtMs = Date.parse(payload.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= issuedAtMs) {
      throw new OfflineActivationError("INVALID_LICENSE_PAYLOAD", "Invalid license timestamps");
    }
    const validityDays = payload.validityDays;
    if (!Number.isInteger(validityDays) || validityDays <= 0) {
      throw new OfflineActivationError("INVALID_LICENSE_PAYLOAD", "Invalid license validity days");
    }
    if (expiresAtMs - issuedAtMs !== validityDays * DAY_MS) {
      throw new OfflineActivationError("INVALID_LICENSE_PAYLOAD", "License validity does not match its timestamps");
    }
  }
  return payload;
}

function resolveLicenseFeaturesInput(licenseTerms, options) {
  const fromTerms = licenseTerms && typeof licenseTerms === "object" && !Array.isArray(licenseTerms)
    ? licenseTerms.features
    : undefined;
  const fromOptions = options && typeof options === "object" && !Array.isArray(options)
    ? options.features
    : undefined;
  if (fromTerms !== undefined && fromOptions !== undefined) {
    throw new OfflineActivationError(
      "INVALID_LICENSE_FEATURES",
      "License features must be provided in only one place",
    );
  }
  return normalizeFeatures(fromTerms ?? fromOptions);
}

function createLicensePayload(requestPayload, licenseTerms, options = {}) {
  assertValidRequestPayload(requestPayload);
  const terms = normalizeLicenseTerms(
    licenseTerms,
    options.maximumValidityDays ?? MAX_VALIDITY_DAYS,
  );
  const features = resolveLicenseFeaturesInput(licenseTerms, options);
  const maxClients = licenseTerms && typeof licenseTerms === "object" && licenseTerms.maxClients !== undefined
    ? licenseTerms.maxClients : options.maxClients;
  if (maxClients !== undefined) resolveMaxClients({ maxClients });
  const issuedDate = (options.now || (() => new Date()))();
  const issuedAtMs = issuedDate instanceof Date ? issuedDate.getTime() : Date.parse(issuedDate);
  if (!Number.isFinite(issuedAtMs)) {
    throw new OfflineActivationError("INVALID_ISSUED_AT", "License issue time is invalid");
  }
  const payload = {
    licenseVersion: LICENSE_VERSION,
    licenseId: (options.randomUUID || crypto.randomUUID)(),
    requestId: requestPayload.requestId,
    customerName: requestPayload.customerName,
    phone: requestPayload.phone,
    fingerprintHash: requestPayload.fingerprintHash,
    fingerprintSource: requestPayload.fingerprintSource,
    licenseType: terms.licenseType,
    issuedAt: new Date(issuedAtMs).toISOString(),
    expiresAt: terms.licenseType === LICENSE_TYPES.PERPETUAL
      ? null
      : new Date(issuedAtMs + terms.validityDays * DAY_MS).toISOString(),
    validityDays: terms.validityDays,
    ...(features === undefined ? {} : { features }),
    ...(maxClients === undefined ? {} : { maxClients }),
  };
  assertValidLicensePayload(payload);
  return payload;
}

function createActivationCode(requestPayload, licenseTerms, privateKey, options = {}) {
  const privateKeyObject = toPrivateKey(privateKey);
  const payload = createLicensePayload(requestPayload, licenseTerms, options);
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signingInput = `${SIGNING_CONTEXT}.${encodedPayload}`;
  const signature = crypto
    .sign(null, Buffer.from(signingInput, "utf8"), privateKeyObject)
    .toString("base64url");
  return {
    activationCode: `${ACTIVATION_CODE_PREFIX}${encodedPayload}.${signature}`,
    license: payload,
  };
}

function parseActivationCode(code) {
  if (typeof code !== "string" || !code.startsWith(ACTIVATION_CODE_PREFIX)) {
    throw new OfflineActivationError("INVALID_ACTIVATION_PREFIX", "Invalid activation code prefix");
  }
  const parts = code.slice(ACTIVATION_CODE_PREFIX.length).split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new OfflineActivationError("INVALID_ACTIVATION_CODE", "Malformed activation code");
  }
  const [encodedPayload, encodedSignature] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(encodedPayload) || !/^[A-Za-z0-9_-]+$/.test(encodedSignature)) {
    throw new OfflineActivationError("INVALID_ACTIVATION_CODE", "Malformed activation code encoding");
  }
  const payloadBytes = Buffer.from(encodedPayload, "base64url");
  const signature = Buffer.from(encodedSignature, "base64url");
  if (
    payloadBytes.toString("base64url") !== encodedPayload
    || signature.toString("base64url") !== encodedSignature
  ) {
    throw new OfflineActivationError("INVALID_ACTIVATION_CODE", "Non-canonical activation code encoding");
  }
  if (signature.length !== 64) {
    throw new OfflineActivationError("INVALID_ACTIVATION_CODE", "Invalid Ed25519 signature length");
  }
  return { encodedPayload, signature };
}

function verifyActivationCode(code, publicKey) {
  const publicKeyObject = toPublicKey(publicKey);
  const { encodedPayload, signature } = parseActivationCode(code);
  const signingInput = `${SIGNING_CONTEXT}.${encodedPayload}`;
  if (!crypto.verify(null, Buffer.from(signingInput, "utf8"), publicKeyObject, signature)) {
    throw new OfflineActivationError("INVALID_ACTIVATION_SIGNATURE", "Activation signature is invalid");
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new OfflineActivationError("INVALID_LICENSE_PAYLOAD", "Unable to decode license payload");
  }
  assertValidLicensePayload(payload);
  return payload;
}

module.exports = {
  LICENSE_VERSION,
  ACTIVATION_CODE_PREFIX,
  SIGNING_CONTEXT,
  DEFAULT_VALIDITY_DAYS,
  MAX_VALIDITY_DAYS,
  DAY_MS,
  LICENSE_TYPES,
  KNOWN_FEATURES,
  LEGACY_FEATURES,
  validateValidityDays,
  resolveLicenseType,
  normalizeLicenseTerms,
  normalizeFeatures,
  resolveFeatures,
  resolveMaxClients,
  assertValidLicensePayload,
  createLicensePayload,
  createActivationCode,
  verifyActivationCode,
};
