const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FINGERPRINT_SOURCES,
  normalizeHardwareId,
  isGenericHardwareId,
  selectHardwareIdentifier,
  createFingerprint,
  selectHardwareIdentifierBySource,
} = require("../src");

test("an existing license resolves only its signed fingerprint source without fallback", () => {
  const deviceInfo = {
    smbiosUuid: "03000200-0400-0500-0006-000700080009",
    motherboardSerial: "BOARD-NEW",
    cpuId: "CPU-NEW",
  };
  assert.deepEqual(
    selectHardwareIdentifierBySource(deviceInfo, "MOTHERBOARD_SERIAL"),
    { source: "MOTHERBOARD_SERIAL", normalized: "BOARD-NEW" },
  );

  assert.throws(
    () => selectHardwareIdentifierBySource({ cpuId: "CPU-AVAILABLE" }, "SMBIOS_UUID"),
    (error) => error.code === "DEVICE_ID_SOURCE_UNAVAILABLE",
  );
});

test("a valid SMBIOS UUID has the highest priority", () => {
  const selected = selectHardwareIdentifier({
    smbiosUuid: "4c4c4544-0038-5910-8058-cac04f4b5632",
    motherboardSerial: "BOARD-1234",
    cpuId: "BFEBFBFF000A0671",
  });
  assert.deepEqual(selected, {
    source: FINGERPRINT_SOURCES.SMBIOS_UUID,
    normalized: "4C4C4544-0038-5910-8058-CAC04F4B5632",
  });
});

test("an invalid SMBIOS UUID falls back to motherboard serial", () => {
  const selected = selectHardwareIdentifier({
    smbiosUuid: "To be filled by O.E.M.",
    motherboardSerial: " mb-98765 ",
    cpuId: "BFEBFBFF000A0671",
  });
  assert.deepEqual(selected, {
    source: FINGERPRINT_SOURCES.MOTHERBOARD_SERIAL,
    normalized: "MB-98765",
  });
});

test("invalid SMBIOS and motherboard values fall back to CPU ID", () => {
  const selected = selectHardwareIdentifier({
    smbiosUuid: "00000000-0000-0000-0000-000000000000",
    motherboardSerial: "Default string",
    cpuId: " bfebfbff000a0671 ",
  });
  assert.deepEqual(selected, {
    source: FINGERPRINT_SOURCES.CPU_ID,
    normalized: "BFEBFBFF000A0671",
  });
});

test("missing identifiers report DEVICE_ID_UNAVAILABLE without a random fallback", () => {
  assert.throws(
    () => selectHardwareIdentifier({ smbiosUuid: "Unknown", motherboardSerial: "N/A" }),
    (error) => error.code === "DEVICE_ID_UNAVAILABLE",
  );
});

test("generic and placeholder hardware identifiers are rejected", () => {
  for (const value of [
    "Default string",
    "To be filled by O.E.M.",
    "Unknown",
    "Not Available",
    "00000000",
    "FFFFFFFFFFFFFFFF",
    "System Serial Number",
    "",
  ]) {
    assert.equal(isGenericHardwareId(value), true, value);
  }
});

test("normalization and fingerprinting are deterministic", () => {
  assert.equal(normalizeHardwareId("  abcd-1234  "), "ABCD-1234");
  assert.equal(
    createFingerprint("  abcd-1234  "),
    createFingerprint("ABCD-1234"),
  );
  assert.notEqual(
    createFingerprint("ABCD-1234"),
    createFingerprint("ABCD-1235"),
  );
});
