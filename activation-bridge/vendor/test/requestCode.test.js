const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  REQUEST_CODE_PREFIX,
  createRequestCode,
  decodeRequestCode,
} = require("../src");

function validPayload(overrides = {}) {
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

function encodeUnchecked(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const codeChecksum = crypto
    .createHash("sha256")
    .update(`${REQUEST_CODE_PREFIX}${encodedPayload}`, "utf8")
    .digest("base64url");
  return `${REQUEST_CODE_PREFIX}${encodedPayload}.${codeChecksum}`;
}

test("request code encode/decode round-trip preserves the payload", () => {
  const payload = validPayload();
  const code = createRequestCode(payload);
  assert.ok(code.startsWith(REQUEST_CODE_PREFIX));
  assert.deepEqual(decodeRequestCode(code), payload);
});

test("corrupted request code is rejected by its checksum", () => {
  const code = createRequestCode(validPayload());
  const index = REQUEST_CODE_PREFIX.length + 10;
  const replacement = code[index] === "A" ? "B" : "A";
  const corrupted = `${code.slice(0, index)}${replacement}${code.slice(index + 1)}`;
  assert.throws(
    () => decodeRequestCode(corrupted),
    (error) => error.code === "CORRUPTED_REQUEST_CODE",
  );
});

test("wrong prefix is rejected", () => {
  const code = createRequestCode(validPayload()).replace(/^POSREQ1-/, "WRONG-");
  assert.throws(
    () => decodeRequestCode(code),
    (error) => error.code === "INVALID_REQUEST_PREFIX",
  );
});

test("unsupported payload version is rejected during decode", () => {
  assert.throws(
    () => decodeRequestCode(encodeUnchecked(validPayload({ requestVersion: 2 }))),
    (error) => error.code === "UNSUPPORTED_REQUEST_VERSION",
  );
});

test("a structurally incomplete payload is rejected during decode", () => {
  const payload = validPayload();
  delete payload.phone;
  assert.throws(
    () => decodeRequestCode(encodeUnchecked(payload)),
    (error) => error.code === "INVALID_REQUEST_CODE",
  );
});
