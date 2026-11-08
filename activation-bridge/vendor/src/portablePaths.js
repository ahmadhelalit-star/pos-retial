const path = require("node:path");

const PACKAGE_ROOT = path.resolve(__dirname, "..");

function optionalResolvedPath(value) {
  return typeof value === "string" && value.trim() ? path.resolve(value.trim()) : null;
}

function resolvePortableRoot(options = {}) {
  const configured = options.portableRoot ?? process.env.POS_ACTIVATION_PORTABLE_ROOT;
  if (configured) return path.resolve(configured);
  if (options.portableMode) {
    return path.dirname(path.resolve(options.executablePath || process.execPath));
  }
  return null;
}

function resolveActivationToolPaths(options = {}) {
  const portableRoot = resolvePortableRoot(options);
  const dataDirectory = portableRoot
    ? path.join(portableRoot, "data")
    : path.join(PACKAGE_ROOT, "data");
  const backupDirectory = optionalResolvedPath(
    options.backupDirectory ?? process.env.OFFLINE_ACTIVATION_BACKUP_DIR,
  ) || (portableRoot ? path.join(portableRoot, "backups") : path.join(PACKAGE_ROOT, "backups"));
  const recordsDatabasePath = optionalResolvedPath(
    options.recordsDatabasePath ?? process.env.OFFLINE_ACTIVATION_RECORDS_DB_PATH,
  ) || path.join(dataDirectory, "activation-records.sqlite");
  const explicitPrivateKeyPath = optionalResolvedPath(
    options.privateKeyPath ?? process.env.OFFLINE_ACTIVATION_PRIVATE_KEY_PATH,
  );

  return Object.freeze({
    portable: Boolean(portableRoot),
    portableRoot,
    applicationRoot: portableRoot || PACKAGE_ROOT,
    dataDirectory,
    recordsDatabasePath,
    backupDirectory,
    privateKeyPath: explicitPrivateKeyPath
      || (portableRoot ? path.join(portableRoot, "secrets", "private-key.encrypted.pem") : null),
    logDirectory: portableRoot ? path.join(portableRoot, "logs") : path.join(PACKAGE_ROOT, "logs"),
    instanceFilePath: portableRoot ? path.join(dataDirectory, "tool-instance.json") : null,
  });
}

module.exports = {
  PACKAGE_ROOT,
  resolvePortableRoot,
  resolveActivationToolPaths,
};
