export function unsupportedExactRustFunction(name, reason) {
  return function unsupported() {
    throw new Error(`${name} exact Rust-compatible implementation is pending: ${reason}`);
  };
}
