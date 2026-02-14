/**
 * Generate a random ID for blocks or other entities
 */
export const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Generate a cryptographically random nonce for CSP
 */
export function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
