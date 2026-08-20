import crypto from 'crypto';

/**
 * Hash a plain text password with salt using PBKDF2
 */
export function hashPassword(password) {
  if (!password) return null;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify if plain text password matches stored salt:hash
 */
export function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHash] = parts;
  const hashToTest = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return originalHash === hashToTest;
}
