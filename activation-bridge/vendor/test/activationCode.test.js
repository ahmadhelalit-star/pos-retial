const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  ACTIVATION_CODE_PREFIX,
  SIGNING_CONTEXT,
  DAY_MS,
  LICENSE_TYPES,
  KNOWN_FEATURES,
  LEGACY_FEATURES,
  createActivationCode,
  createLicensePayload,
  normalizeFeatures,
  resolveFeatures,
  resolveMaxClients,
  resolveLicenseType,
  verifyActivationCode,
  validateValidityDays,
} = require("../src");

const FIXED_NOW = "2026-08-27T12:34:56.000Z";

test("signed client limit survives verification and legacy codes default to zero", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  const request = validRequest();
  for (const maxClients of [0, 2, 5]) {
    const result = createActivationCode(request, { validityDays: 365, maxClients }, pair.privateKey);
    assert.equal(verifyActivationCode(result.activationCode, pair.publicKey).maxClients, maxClients);
    assert.equal(resolveMaxClients(result.license), maxClients);
    assert.throws(() => verifyActivationCode(mutatePayload(result.activationCode, (payload) => { payload.maxClients += 1; }), pair.publicKey));
  }
  const legacy = createActivationCode(request, 365, pair.privateKey);
  assert.equal(resolveMaxClients(verifyActivationCode(legacy.activationCode, pair.publicKey)), 0);
  for (const maxClients of [-1, 1.5, 1001, "2"]) {
    assert.throws(() => createActivationCode(request, { validityDays: 365, maxClients }, pair.privateKey), (error) => error.code === "INVALID_MAX_CLIENTS");
  }
});

function validRequest(overrides = {}) {
  return {
    requestVersion: 1,
    requestId: "8d781e9d-64f3-4b08-86fd-fb4ba48c4e28",
    customerName: "أحمد علي",
    phone: "+20 100 123 4567",
    fingerprintHash: "a".repeat(64),
    fingerprintSource: "SMBIOS_UUID",
    createdAt: "2026-08-27T10:00:00.000Z",
    deviceInfo: { manufacturer: "Example", ramBytes: 8589934592 },
    ...overrides,
  };
}

function mutatePayload(code, mutate) {
  const [encodedPayload, signature] = code.slice(ACTIVATION_CODE_PREFIX.length).split(".");
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  mutate(payload);
  const changed = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${ACTIVATION_CODE_PREFIX}${changed}.${signature}`;
}

function signUnchecked(payload, privateKey) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto
    .sign(null, Buffer.from(`${SIGNING_CONTEXT}.${encoded}`, "utf8"), privateKey)
    .toString("base64url");
  return `${ACTIVATION_CODE_PREFIX}${encoded}.${signature}`;
}

test("creates exact 365, 730, and custom-day license windows", () => {
  for (const days of [365, 730, 45]) {
    const payload = createLicensePayload(validRequest(), days, {
      now: () => new Date(FIXED_NOW),
      randomUUID: () => "af317902-cb57-442c-9d7f-d800e3c42e60",
    });
    assert.equal(payload.licenseType, LICENSE_TYPES.FIXED_TERM);
    assert.equal(payload.validityDays, days);
    assert.equal(Date.parse(payload.expiresAt) - Date.parse(payload.issuedAt), days * DAY_MS);
    assert.equal(payload.requestId, validRequest().requestId);
    assert.equal(payload.customerName, validRequest().customerName);
    assert.equal(payload.phone, validRequest().phone);
    assert.equal(payload.fingerprintHash, validRequest().fingerprintHash);
  }
});

test("rejects invalid or excessive validity periods", () => {
  for (const value of [0, -1, 1.5, Number.NaN, "", "abc", 3651]) {
    assert.throws(
      () => validateValidityDays(value),
      (error) => error.code === "INVALID_VALIDITY_DAYS",
    );
  }
  assert.equal(validateValidityDays("730"), 730);
});

test("signs POSACT1 licenses and verifies them with the matching public key", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  const result = createActivationCode(validRequest(), 365, pair.privateKey, {
    now: () => new Date(FIXED_NOW),
    randomUUID: () => "af317902-cb57-442c-9d7f-d800e3c42e60",
  });

  assert.ok(result.activationCode.startsWith(ACTIVATION_CODE_PREFIX));
  assert.deepEqual(verifyActivationCode(result.activationCode, pair.publicKey), result.license);
});

test("rejects payload tampering in expiry, fingerprint, customer name, or arbitrary data", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  const code = createActivationCode(validRequest(), 365, pair.privateKey).activationCode;
  const mutations = [
    (payload) => { payload.expiresAt = "2099-01-01T00:00:00.000Z"; },
    (payload) => { payload.fingerprintHash = "b".repeat(64); },
    (payload) => { payload.customerName = "اسم معدل"; },
    (payload) => { payload.licenseType = LICENSE_TYPES.PERPETUAL; },
    (payload) => { payload.extra = "modified"; },
  ];

  for (const mutate of mutations) {
    assert.throws(
      () => verifyActivationCode(mutatePayload(code, mutate), pair.publicKey),
      (error) => error.code === "INVALID_ACTIVATION_SIGNATURE",
    );
  }
});

test("creates and verifies an explicit perpetual Ed25519 license", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  const result = createActivationCode(
    validRequest(),
    { licenseType: LICENSE_TYPES.PERPETUAL },
    pair.privateKey,
    {
      now: () => new Date(FIXED_NOW),
      randomUUID: () => "af317902-cb57-442c-9d7f-d800e3c42e60",
    },
  );

  assert.equal(result.license.licenseType, LICENSE_TYPES.PERPETUAL);
  assert.equal(result.license.expiresAt, null);
  assert.equal(result.license.validityDays, null);
  assert.deepEqual(verifyActivationCode(result.activationCode, pair.publicKey), result.license);
});

test("enforces expiry fields by license type and accepts legacy fixed-term licenses", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  const perpetual = createLicensePayload(validRequest(), { licenseType: LICENSE_TYPES.PERPETUAL });
  const perpetualWithExpiry = {
    ...perpetual,
    expiresAt: "2027-08-27T12:34:56.000Z",
    validityDays: 365,
  };
  assert.throws(
    () => verifyActivationCode(signUnchecked(perpetualWithExpiry, pair.privateKey), pair.publicKey),
    (error) => error.code === "INVALID_LICENSE_PAYLOAD",
  );

  const fixedTermWithoutExpiry = createLicensePayload(validRequest(), 365);
  fixedTermWithoutExpiry.expiresAt = null;
  assert.throws(
    () => verifyActivationCode(signUnchecked(fixedTermWithoutExpiry, pair.privateKey), pair.publicKey),
    (error) => error.code === "INVALID_LICENSE_PAYLOAD",
  );

  const legacy = createLicensePayload(validRequest(), 365, {
    now: () => new Date(FIXED_NOW),
    randomUUID: () => "af317902-cb57-442c-9d7f-d800e3c42e60",
  });
  delete legacy.licenseType;
  const verifiedLegacy = verifyActivationCode(signUnchecked(legacy, pair.privateKey), pair.publicKey);
  assert.equal(verifiedLegacy.licenseType, undefined);
  assert.equal(resolveLicenseType(verifiedLegacy), LICENSE_TYPES.FIXED_TERM);
});

test("rejects a changed signature and a different public key", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  const otherPair = crypto.generateKeyPairSync("ed25519");
  const code = createActivationCode(validRequest(), 365, pair.privateKey).activationCode;
  const [encodedPayload, encodedSignature] = code.slice(ACTIVATION_CODE_PREFIX.length).split(".");
  const signature = Buffer.from(encodedSignature, "base64url");
  signature[0] ^= 0x01;
  const changedSignature = `${ACTIVATION_CODE_PREFIX}${encodedPayload}.${signature.toString("base64url")}`;

  assert.throws(
    () => verifyActivationCode(changedSignature, pair.publicKey),
    (error) => error.code === "INVALID_ACTIVATION_SIGNATURE",
  );
  assert.throws(
    () => verifyActivationCode(code, otherPair.publicKey),
    (error) => error.code === "INVALID_ACTIVATION_SIGNATURE",
  );
});

test("rejects malformed codes and a correctly signed unsupported version", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  assert.throws(
    () => verifyActivationCode("WRONG-code", pair.publicKey),
    (error) => error.code === "INVALID_ACTIVATION_PREFIX",
  );
  assert.throws(
    () => verifyActivationCode("POSACT1-bad", pair.publicKey),
    (error) => error.code === "INVALID_ACTIVATION_CODE",
  );

  const unsupported = createLicensePayload(validRequest(), 365, {
    now: () => new Date(FIXED_NOW),
    randomUUID: () => "af317902-cb57-442c-9d7f-d800e3c42e60",
  });
  unsupported.licenseVersion = 2;
  assert.throws(
    () => verifyActivationCode(signUnchecked(unsupported, pair.privateKey), pair.publicKey),
    (error) => error.code === "UNSUPPORTED_LICENSE_VERSION",
  );
});

test("rejects a non-canonical Base64URL representation even if it decodes to the same signature", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  let code;
  do {
    code = createActivationCode(validRequest(), 365, pair.privateKey).activationCode;
  } while (!code.endsWith("A"));
  const nonCanonical = `${code.slice(0, -1)}B`;

  assert.deepEqual(
    Buffer.from(code.split(".").at(-1), "base64url"),
    Buffer.from(nonCanonical.split(".").at(-1), "base64url"),
  );
  assert.throws(
    () => verifyActivationCode(nonCanonical, pair.publicKey),
    (error) => error.code === "INVALID_ACTIVATION_CODE",
  );
});

function licenseWithFeatures(features, featureSource = "options") {
  const licenseTerms = 365;
  const options = {
    now: () => new Date(FIXED_NOW),
    randomUUID: () => "af317902-cb57-442c-9d7f-d800e3c42e60",
  };
  if (featureSource === "options") options.features = features;
  else options.licenseTermsFeatures = features;
  const pair = crypto.generateKeyPairSync("ed25519");
  const result = featureSource === "terms"
    ? createActivationCode(validRequest(), { validityDays: 365, features }, pair.privateKey, {
      now: options.now,
      randomUUID: options.randomUUID,
    })
    : createActivationCode(validRequest(), licenseTerms, pair.privateKey, options);
  return { ...result, pair };
}

test("feature flags round-trip with KDS enabled and disabled", () => {
  for (const features of [
    { tables: true, delivery: true, kds: true },
    { tables: true, delivery: false, kds: false },
    { tables: false, delivery: true, kds: true },
    { tables: false, delivery: false, kds: false },
  ]) {
    const { activationCode, license, pair } = licenseWithFeatures(features);
    assert.deepEqual(license.features, features);
    assert.deepEqual(verifyActivationCode(activationCode, pair.publicKey).features, features);
    assert.deepEqual(resolveFeatures(license), features);
  }
});

test("feature flags can be supplied through license terms", () => {
  const { activationCode, pair } = licenseWithFeatures(
    { tables: false, delivery: true, kds: true }, "terms",
  );
  assert.deepEqual(
    verifyActivationCode(activationCode, pair.publicKey).features,
    { tables: false, delivery: true, kds: true },
  );
});

test("legacy license without features verifies and resolves to full access", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  const result = createActivationCode(validRequest(), 365, pair.privateKey, {
    now: () => new Date(FIXED_NOW),
    randomUUID: () => "af317902-cb57-442c-9d7f-d800e3c42e60",
  });
  assert.equal("features" in result.license, false);
  const verified = verifyActivationCode(result.activationCode, pair.publicKey);
  assert.equal("features" in verified, false);
  assert.deepEqual(resolveFeatures(verified), { tables: true, delivery: true, kds: false });
  assert.deepEqual(resolveFeatures({}), { tables: true, delivery: true, kds: false });
  assert.deepEqual(LEGACY_FEATURES, { tables: true, delivery: true, kds: false });
  assert.deepEqual([...KNOWN_FEATURES].sort(), ["callerId", "cloudCatalog", "cloudOrders", "delivery", "inventory", "kds", "tables", "talabat", "vault"]);
});

test("inventory is an independent signed feature and defaults off for older licenses", () => {
  assert.deepEqual(normalizeFeatures({ tables: true, delivery: true, inventory: true }),
    { tables: true, delivery: true, kds: false, inventory: true });
  assert.equal(resolveFeatures({ features: { tables: true, delivery: true } }).inventory, undefined);
});

test("Talabat is independently signed and absent from older licenses", () => {
  const features = { tables: false, delivery: false, kds: false, talabat: true };
  const { activationCode, pair } = licenseWithFeatures(features);
  assert.deepEqual(verifyActivationCode(activationCode, pair.publicKey).features, features);
  assert.equal(resolveFeatures({ features: { tables: true, delivery: true } }).talabat, undefined);
});

test("Caller ID is independently signed and absent from older licenses", () => {
  const features = { tables: true, delivery: true, kds: false, callerId: true };
  const { activationCode, pair } = licenseWithFeatures(features);
  assert.deepEqual(verifyActivationCode(activationCode, pair.publicKey).features, features);
  assert.equal(resolveFeatures({ features: { tables: true, delivery: true } }).callerId, undefined);
});

test("signed licenses from before KDS remain valid and resolve KDS as disabled", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  const oldPayload = {
    ...createLicensePayload(validRequest(), 365, {
      now: () => new Date(FIXED_NOW),
      randomUUID: () => "af317902-cb57-442c-9d7f-d800e3c42e60",
    }),
    features: { tables: true, delivery: false },
  };
  const activationCode = signUnchecked(oldPayload, pair.privateKey);
  const verified = verifyActivationCode(activationCode, pair.publicKey);
  assert.deepEqual(verified.features, { tables: true, delivery: false });
  assert.deepEqual(resolveFeatures(verified), { tables: true, delivery: false, kds: false });
});

test("non-boolean or unknown feature flags are rejected without silent coercion", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  assert.throws(
    () => normalizeFeatures({ tables: "true", delivery: true }),
    (error) => error.code === "INVALID_LICENSE_FEATURES",
  );
  assert.throws(
    () => normalizeFeatures({ tables: true, delivery: 1 }),
    (error) => error.code === "INVALID_LICENSE_FEATURES",
  );
  assert.throws(
    () => normalizeFeatures({ tables: true, delivery: true, kds: "true" }),
    (error) => error.code === "INVALID_LICENSE_FEATURES",
  );
  assert.throws(
    () => normalizeFeatures({ tables: true, delivery: true, kitchen: true }),
    (error) => error.code === "INVALID_LICENSE_FEATURES",
  );
  assert.throws(
    () => normalizeFeatures({ tables: true }),
    (error) => error.code === "INVALID_LICENSE_FEATURES",
  );
  assert.throws(
    () => createActivationCode(validRequest(), 365, pair.privateKey, { features: { tables: 1, delivery: true } }),
    (error) => error.code === "INVALID_LICENSE_FEATURES",
  );
  const signedMissing = signUnchecked(
    { ...createLicensePayload(validRequest(), 365), features: { tables: true } },
    pair.privateKey,
  );
  assert.throws(
    () => verifyActivationCode(signedMissing, pair.publicKey),
    (error) => error.code === "INVALID_LICENSE_FEATURES",
  );
});

test("tampering with signed feature flags invalidates the Ed25519 signature", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  const { activationCode } = licenseWithFeatures({ tables: false, delivery: true, kds: false });
  assert.throws(
    () => verifyActivationCode(
      mutatePayload(activationCode, (payload) => { payload.features.tables = true; }),
      pair.publicKey,
    ),
    (error) => error.code === "INVALID_ACTIVATION_SIGNATURE",
  );
  assert.throws(
    () => verifyActivationCode(
      mutatePayload(activationCode, (payload) => { delete payload.features; }),
      pair.publicKey,
    ),
    (error) => error.code === "INVALID_ACTIVATION_SIGNATURE",
  );
  assert.throws(
    () => verifyActivationCode(
      mutatePayload(activationCode, (payload) => { payload.features.kds = true; }),
      pair.publicKey,
    ),
    (error) => error.code === "INVALID_ACTIVATION_SIGNATURE",
  );
});

test('Cloud Orders is an explicit signed entitlement and cannot be added by tampering',()=>{
 const pair=crypto.generateKeyPairSync('ed25519');
 for(const cloudOrders of [true,false]){
  const result=createActivationCode(validRequest(),{validityDays:365,features:{tables:true,delivery:true,cloudOrders}},pair.privateKey);
  assert.equal(resolveFeatures(verifyActivationCode(result.activationCode,pair.publicKey)).cloudOrders,cloudOrders);
  assert.throws(()=>verifyActivationCode(mutatePayload(result.activationCode,p=>{p.features.cloudOrders=!cloudOrders;}),pair.publicKey));
 }
 assert.notEqual(resolveFeatures({}).cloudOrders,true);
 assert.throws(()=>normalizeFeatures({tables:true,delivery:true,cloudOrders:'true'}));
});

test('Vault entitlement is signed and disabled for previous licenses',()=>{
 const pair=crypto.generateKeyPairSync('ed25519');
 for(const vault of [true,false]){
  const result=createActivationCode(validRequest(),{validityDays:365,features:{tables:false,delivery:false,vault}},pair.privateKey);
  assert.equal(resolveFeatures(verifyActivationCode(result.activationCode,pair.publicKey)).vault,vault);
  assert.throws(()=>verifyActivationCode(mutatePayload(result.activationCode,p=>{p.features.vault=!vault;}),pair.publicKey));
 }
 assert.notEqual(resolveFeatures({}).vault,true);
});

test('Catalog is an optional independently signed feature; legacy payloads stay unchanged',()=>{
 const pair=crypto.generateKeyPairSync('ed25519');
 for(const cloudCatalog of [true,false]){
  const result=createActivationCode(validRequest(),{validityDays:365,features:{tables:true,delivery:true,cloudCatalog,cloudOrders:false}},pair.privateKey);
  const verified=verifyActivationCode(result.activationCode,pair.publicKey);assert.equal(resolveFeatures(verified).cloudCatalog,cloudCatalog);assert.equal(verified.features.cloudOrders,false);
  assert.throws(()=>verifyActivationCode(mutatePayload(result.activationCode,p=>{p.features.cloudCatalog=!cloudCatalog;}),pair.publicKey));
 }
 assert.equal(Object.hasOwn(resolveFeatures({features:{tables:true,delivery:true,cloudOrders:true}}),'cloudCatalog'),false);
 assert.throws(()=>normalizeFeatures({tables:true,delivery:true,cloudCatalog:'true'}));
});
