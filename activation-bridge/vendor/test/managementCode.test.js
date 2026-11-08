const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  createManagementCode,
  verifyManagementCode,
  MANAGEMENT_COMMANDS,
} = require("../src");

const BASE = {
  licenseId: "10000000-0000-4000-8000-000000000001",
  fingerprintHash: "a".repeat(64),
  fingerprintSource: "SMBIOS_UUID",
  reason: "Customer requested license release",
};

function issue(pair, command = "RESET") {
  return createManagementCode({ ...BASE, command }, pair.privateKey, {
    now: () => new Date("2026-09-28T10:00:00.000Z"),
    ttlMs: 60 * 60 * 1000,
    randomUUID: () => "20000000-0000-4000-8000-000000000002",
    randomBytes: () => Buffer.alloc(32, 7),
  });
}

test("signs and verifies every independent POSMGT1 management command", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  for (const command of MANAGEMENT_COMMANDS) {
    const result = issue(pair, command);
    assert.match(result.managementCode, /^POSMGT1-/);
    assert.deepEqual(verifyManagementCode(result.managementCode, pair.publicKey), result.command);
    assert.equal(result.command.command, command);
    assert.equal(result.command.licenseId, BASE.licenseId);
    assert.equal(result.command.expiresAt, "2026-09-28T11:00:00.000Z");
    assert.equal(result.command.nonce, Buffer.alloc(32, 7).toString("base64url"));
  }
});

test("rejects signature, payload, command, reason, and expiry tampering", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  const otherPair = crypto.generateKeyPairSync("ed25519");
  const result = issue(pair);
  assert.throws(() => verifyManagementCode(result.managementCode, otherPair.publicKey),
    (error) => error.code === "INVALID_MANAGEMENT_SIGNATURE");
  const separator = result.managementCode.lastIndexOf(".");
  const encoded = result.managementCode.slice("POSMGT1-".length, separator);
  const signature = result.managementCode.slice(separator + 1);
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  payload.licenseId = "30000000-0000-4000-8000-000000000003";
  const tampered = `POSMGT1-${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;
  assert.throws(() => verifyManagementCode(tampered, pair.publicKey),
    (error) => error.code === "INVALID_MANAGEMENT_SIGNATURE");
  assert.throws(() => issue(pair, "UNKNOWN"), (error) => error.code === "INVALID_MANAGEMENT_COMMAND");
  assert.throws(() => createManagementCode({ ...BASE, command: "RESET", reason: "" }, pair.privateKey),
    (error) => error.code === "INVALID_MANAGEMENT_REASON");
  assert.throws(() => createManagementCode({ ...BASE, command: "RESET" }, pair.privateKey, { ttlMs: 1 }),
    (error) => error.code === "INVALID_MANAGEMENT_EXPIRY");
});

test("rejects malformed and non-canonical management codes", () => {
  const pair = crypto.generateKeyPairSync("ed25519");
  for (const code of ["POSACT1-invalid", "POSMGT1-invalid", "POSMGT1-a.b.c", "POSMGT1-+.x"]) {
    assert.throws(() => verifyManagementCode(code, pair.publicKey));
  }
});
