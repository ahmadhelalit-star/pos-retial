const fs = require("node:fs");
const {
  isEncryptedPrivateKeyPem,
  loadPrivateKey,
} = require("./keyManager");

function inspectKeyFile(privateKeyPath) {
  if (!privateKeyPath || !fs.existsSync(privateKeyPath)) {
    return { configured: false, encrypted: false };
  }
  try {
    const pem = fs.readFileSync(privateKeyPath, "utf8");
    return { configured: true, encrypted: isEncryptedPrivateKeyPem(pem) };
  } catch {
    return { configured: true, encrypted: false };
  }
}

function createSigningKeyProvider(options = {}) {
  const privateKeyPath = options.privateKeyPath || null;
  let cachedPrivateKey = null;

  return {
    get privateKeyPath() {
      return privateKeyPath;
    },
    describe() {
      return {
        ...inspectKeyFile(privateKeyPath),
        unlocked: Boolean(cachedPrivateKey),
      };
    },
    load(passphrase) {
      if (cachedPrivateKey) return cachedPrivateKey;
      cachedPrivateKey = loadPrivateKey(privateKeyPath, { passphrase });
      return cachedPrivateKey;
    },
    clear() {
      cachedPrivateKey = null;
    },
  };
}

module.exports = {
  createSigningKeyProvider,
  inspectKeyFile,
};
