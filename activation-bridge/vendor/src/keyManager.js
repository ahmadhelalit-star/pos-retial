const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { OfflineActivationError } = require("./errors");

function toPrivateKey(key, options = {}) {
  try {
    const parsed = key?.type === "private"
      ? key
      : crypto.createPrivateKey(options.passphrase === undefined
        ? key
        : { key, format: "pem", passphrase: options.passphrase });
    if (parsed.asymmetricKeyType !== "ed25519") {
      throw new OfflineActivationError(
        "INVALID_PRIVATE_KEY_TYPE",
        "Activation private key must be Ed25519",
      );
    }
    return parsed;
  } catch (error) {
    if (error instanceof OfflineActivationError) throw error;
    throw new OfflineActivationError("INVALID_PRIVATE_KEY", "Unable to read activation private key");
  }
}

function toPublicKey(key) {
  try {
    const parsed = key?.type === "public" ? key : crypto.createPublicKey(key);
    if (parsed.asymmetricKeyType !== "ed25519") {
      throw new OfflineActivationError(
        "INVALID_PUBLIC_KEY_TYPE",
        "Activation public key must be Ed25519",
      );
    }
    return parsed;
  } catch (error) {
    if (error instanceof OfflineActivationError) throw error;
    throw new OfflineActivationError("INVALID_PUBLIC_KEY", "Unable to read activation public key");
  }
}

function validateKeyPair(privateKey, publicKey) {
  const privateKeyObject = toPrivateKey(privateKey);
  const publicKeyObject = toPublicKey(publicKey);
  const probe = crypto.randomBytes(32);
  const signature = crypto.sign(null, probe, privateKeyObject);
  if (!crypto.verify(null, probe, publicKeyObject, signature)) {
    throw new OfflineActivationError(
      "KEY_PAIR_MISMATCH",
      "Activation private and public keys do not match",
    );
  }
  return { privateKey: privateKeyObject, publicKey: publicKeyObject };
}

function requireConfiguredPath(value, code, message) {
  if (typeof value !== "string" || !value.trim()) {
    throw new OfflineActivationError(code, message);
  }
  return path.resolve(value.trim());
}

function isEncryptedPrivateKeyPem(value) {
  return typeof value === "string" && /-----BEGIN ENCRYPTED PRIVATE KEY-----/.test(value);
}

function loadPrivateKey(
  privateKeyPath = process.env.OFFLINE_ACTIVATION_PRIVATE_KEY_PATH,
  options = {},
) {
  const resolvedPath = requireConfiguredPath(
    privateKeyPath,
    "PRIVATE_KEY_PATH_REQUIRED",
    "OFFLINE_ACTIVATION_PRIVATE_KEY_PATH is not configured",
  );
  try {
    const pem = fs.readFileSync(resolvedPath, "utf8");
    if (isEncryptedPrivateKeyPem(pem) && !options.passphrase) {
      throw new OfflineActivationError(
        "PRIVATE_KEY_PASSWORD_REQUIRED",
        "The encrypted activation private key requires a password",
      );
    }
    try {
      return toPrivateKey(pem, { passphrase: options.passphrase });
    } catch (error) {
      if (isEncryptedPrivateKeyPem(pem) && error.code === "INVALID_PRIVATE_KEY") {
        throw new OfflineActivationError(
          "INVALID_PRIVATE_KEY_PASSWORD",
          "The activation private-key password is incorrect",
        );
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof OfflineActivationError) throw error;
    if (error.code === "ENOENT") {
      throw new OfflineActivationError("PRIVATE_KEY_NOT_FOUND", "Activation private key file was not found");
    }
    throw new OfflineActivationError("PRIVATE_KEY_READ_FAILED", "Unable to read activation private key file");
  }
}

function encryptPrivateKeyFile({ inputPath, outputPath, passphrase, force = false } = {}) {
  const resolvedInputPath = requireConfiguredPath(
    inputPath,
    "PRIVATE_KEY_INPUT_REQUIRED",
    "An input private-key path is required",
  );
  const resolvedOutputPath = requireConfiguredPath(
    outputPath,
    "ENCRYPTED_KEY_OUTPUT_REQUIRED",
    "An encrypted private-key output path is required",
  );
  if (typeof passphrase !== "string" || passphrase.length < 8) {
    throw new OfflineActivationError(
      "PRIVATE_KEY_PASSWORD_TOO_SHORT",
      "The private-key password must contain at least 8 characters",
    );
  }
  if (resolvedInputPath === resolvedOutputPath) {
    throw new OfflineActivationError(
      "PRIVATE_KEY_OUTPUT_CONFLICT",
      "The encrypted output must not overwrite the source private key",
    );
  }
  if (!force && fs.existsSync(resolvedOutputPath)) {
    throw new OfflineActivationError(
      "ENCRYPTED_KEY_ALREADY_EXISTS",
      "The encrypted private-key file already exists",
    );
  }

  const privateKey = loadPrivateKey(resolvedInputPath);
  const encryptedPem = privateKey.export({
    type: "pkcs8",
    format: "pem",
    cipher: "aes-256-cbc",
    passphrase,
  });
  fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
  fs.writeFileSync(resolvedOutputPath, encryptedPem, { encoding: "utf8", mode: 0o600 });
  loadPrivateKey(resolvedOutputPath, { passphrase });
  return { inputPath: resolvedInputPath, outputPath: resolvedOutputPath };
}

function loadPublicKey(publicKeyPath = process.env.OFFLINE_ACTIVATION_PUBLIC_KEY_PATH) {
  const resolvedPath = requireConfiguredPath(
    publicKeyPath,
    "PUBLIC_KEY_PATH_REQUIRED",
    "OFFLINE_ACTIVATION_PUBLIC_KEY_PATH is not configured",
  );
  try {
    return toPublicKey(fs.readFileSync(resolvedPath, "utf8"));
  } catch (error) {
    if (error instanceof OfflineActivationError) throw error;
    if (error.code === "ENOENT") {
      throw new OfflineActivationError("PUBLIC_KEY_NOT_FOUND", "Activation public key file was not found");
    }
    throw new OfflineActivationError("PUBLIC_KEY_READ_FAILED", "Unable to read activation public key file");
  }
}

function generateKeyPairFiles({ outputDirectory, force = false } = {}) {
  const directory = requireConfiguredPath(
    outputDirectory,
    "KEY_OUTPUT_DIRECTORY_REQUIRED",
    "An explicit key output directory is required",
  );
  const privateKeyPath = path.join(directory, "private-key.pem");
  const publicKeyPath = path.join(directory, "public-key.pem");

  fs.mkdirSync(directory, { recursive: true });
  if (!force && (fs.existsSync(privateKeyPath) || fs.existsSync(publicKeyPath))) {
    throw new OfflineActivationError(
      "KEY_FILES_ALREADY_EXIST",
      "Key files already exist; pass --force only for an intentional replacement",
    );
  }

  const generated = crypto.generateKeyPairSync("ed25519");
  validateKeyPair(generated.privateKey, generated.publicKey);
  const privatePem = generated.privateKey.export({ type: "pkcs8", format: "pem" });
  const publicPem = generated.publicKey.export({ type: "spki", format: "pem" });

  fs.writeFileSync(privateKeyPath, privatePem, { encoding: "utf8", mode: 0o600 });
  fs.writeFileSync(publicKeyPath, publicPem, { encoding: "utf8", mode: 0o644 });
  validateKeyPair(fs.readFileSync(privateKeyPath), fs.readFileSync(publicKeyPath));

  return { privateKeyPath, publicKeyPath };
}

module.exports = {
  toPrivateKey,
  toPublicKey,
  validateKeyPair,
  loadPrivateKey,
  isEncryptedPrivateKeyPem,
  encryptPrivateKeyFile,
  loadPublicKey,
  generateKeyPairFiles,
};
