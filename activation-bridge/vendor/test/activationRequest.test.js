const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createActivationRequest,
  decodeRequestCode,
  normalizeRegisterData,
} = require("../src");

const fixedOptions = {
  randomUUID: () => "8d781e9d-64f3-4b08-86fd-fb4ba48c4e28",
  now: () => new Date("2026-08-27T10:00:00.000Z"),
};

test("missing name is rejected", () => {
  assert.throws(
    () => normalizeRegisterData({ name: "", phone: "01012345678" }),
    (error) => error.code === "INVALID_NAME",
  );
});

test("missing phone is rejected", () => {
  assert.throws(
    () => normalizeRegisterData({ name: "Ahmed", phone: "" }),
    (error) => error.code === "INVALID_PHONE",
  );
});

test("descriptive information failures do not prevent a request code", async () => {
  for (const unavailableField of ["ramBytes", "cpuModel", "manufacturer", "model"]) {
    const deviceInfo = {
      smbiosUuid: "4C4C4544-0038-5910-8058-CAC04F4B5632",
      motherboardSerial: "BOARD-1234",
      cpuId: "BFEBFBFF000A0671",
      manufacturer: "Example",
      model: "POS Device",
      cpuModel: "Example CPU",
      ramBytes: 8589934592,
    };
    delete deviceInfo[unavailableField];
    const result = await createActivationRequest(
      { name: "Ahmed", phone: "01012345678" },
      { ...fixedOptions, collectDeviceInfo: async () => deviceInfo },
    );
    const decoded = decodeRequestCode(result.requestCode);
    assert.equal(decoded.customerName, "Ahmed");
    assert.equal(unavailableField in decoded.deviceInfo, false);
  }
});

test("the same selected hardware ID keeps the fingerprint stable", async () => {
  const collectDeviceInfo = async () => ({
    smbiosUuid: "4C4C4544-0038-5910-8058-CAC04F4B5632",
    computerName: "POS-01",
  });
  const first = await createActivationRequest(
    { name: "Ahmed", phone: "01012345678" },
    { ...fixedOptions, collectDeviceInfo },
  );
  const second = await createActivationRequest(
    { name: "Ahmed", phone: "01012345678" },
    {
      ...fixedOptions,
      randomUUID: () => "8d781e9d-64f3-4b08-86fd-fb4ba48c4e29",
      collectDeviceInfo,
    },
  );
  assert.equal(first.request.fingerprintHash, second.request.fingerprintHash);
  assert.notEqual(first.request.requestId, second.request.requestId);
});

test("renewal requests can preserve the active license fingerprint source", async () => {
  const result = await createActivationRequest(
    { name: "Ahmed", phone: "01012345678" },
    {
      ...fixedOptions,
      fingerprintSource: "MOTHERBOARD_SERIAL",
      collectDeviceInfo: async () => ({
        smbiosUuid: "4C4C4544-0038-5910-8058-CAC04F4B5632",
        motherboardSerial: "BOARD-1234",
      }),
    },
  );

  const decoded = decodeRequestCode(result.requestCode);
  assert.equal(decoded.fingerprintSource, "MOTHERBOARD_SERIAL");
  assert.equal(decoded.fingerprintHash, result.request.fingerprintHash);
});

test("all unavailable identifiers return DEVICE_ID_UNAVAILABLE", async () => {
  await assert.rejects(
    createActivationRequest(
      { name: "Ahmed", phone: "01012345678" },
      { ...fixedOptions, collectDeviceInfo: async () => ({ manufacturer: "Example" }) },
    ),
    (error) => error.code === "DEVICE_ID_UNAVAILABLE",
  );
});
