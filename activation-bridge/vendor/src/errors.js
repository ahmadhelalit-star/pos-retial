class OfflineActivationError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "OfflineActivationError";
    this.code = code;
    this.details = details;
  }
}

module.exports = { OfflineActivationError };
