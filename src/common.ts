import elliptic from 'elliptic';
const { ec: EC } = elliptic;
import base58 from 'bs58';

/**
 * Common Utilities for Blockchain and Cryptography
 * 
 * Provides utilities for:
 * - Cryptographic key generation (ECDSA secp256k1)
 * - Hash encoding/decoding (Hex ↔ Base58)
 * - Random number generation with seeding
 * - Timestamp and nonce generation
 * 
 * @class SmlCommon
 */
export default class SmlCommon {
  /** secp256k1 elliptic curve instance for key generation and signing */
  public static curve = new EC('secp256k1');

  /**
   * Generate the current Unix timestamp in milliseconds
   * 
   * @static
   * @returns {string} Current timestamp as string
   */
  public static generateTimestamp() {
    return (new Date()).getTime().toString();
  }

  /**
   * Generates or imports an ECDSA secp256k1 key pair
   * 
   * Uses the standard Bitcoin/Ethereum elliptic curve for cryptographic signing.
   * 
   * @static
   * @param {string} [privateKey] - Optional Base58 encoded private key to import
   * @returns {KeyPair} The generated or imported key pair
   * 
   * @example
   * // Generate new key pair
   * const keyPair = SmlCommon.generateKeyPair();
   * 
   * // Import from private key
   * const importedKeyPair = SmlCommon.generateKeyPair('QmPrivateKeyBase58');
   */
  public static generateKeyPair(privateKey?: string) {
    let key;
    if (privateKey) {
      key = SmlCommon.curve.keyFromPrivate(SmlCommon.Base58ToHex(privateKey));
    } else {
      key = SmlCommon.curve.genKeyPair();
    }
    return key;
  }

  /**
   * Converts a hex string to Base58 encoding
   * 
   * Base58 is human-readable and commonly used in blockchain (Bitcoin addresses, etc.)
   * Avoids confusing characters (0, O, I, l)
   * 
   * @static
   * @param {any} key - The hex string to convert
   * @returns {string} Base58 encoded result
   */
  public static HexToBase58(key: any) {
    const bytes = SmlCommon.BufferFromHex(key);
    return base58.encode(bytes);
  }


  public static BufferFromHex(hexString: string) {
      if (typeof hexString !== 'string') {
        throw new TypeError('Expected input to be a hex string');
      }
      if (hexString.length % 2 !== 0) {
        throw new RangeError('Hex string must have an even length');
      }

      const length = hexString.length / 2;
      const result = new Uint8Array(length);

      for (let i = 0; i < length; i++) {
        const byte = hexString.substr(i * 2, 2);
        result[i] = parseInt(byte, 16);
      }

      return result;
  }


  /**
   * Converts a Base58 string back to hex encoding
   * 
   * Reverses the HexToBase58 conversion.
   * Used when importing addresses and keys from user input.
   * 
   * @static
   * @param {any} key - The Base58 encoded string
   * @returns {string} Hex encoded result
   */
  public static Base58ToHex(key: any) {
    const bytes = base58.decode(key);
    return SmlCommon.Uint8ArrayToHex(bytes);
  }

  /**
   * Converts Uint8Array byte values to hex string representation
   * 
   * Each byte (0-255) is converted to 2 hex digits.
   * Used for displaying hash values and transaction IDs in human-readable form.
   * 
   * @static
   * @param {Uint8Array} bytes - Array of byte values to convert
   * @returns {string} Hex string (lowercase, no 0x prefix)
   * 
   * @example
   * // Hash bytes to hex string
   * const hashHex = SmlCommon.Uint8ArrayToHex(new Uint8Array([255, 16, 0]));
   * // Result: "ff1000"
   */
  public static Uint8ArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generates seeded random number for deterministic simulation
   * 
   * When a seed is provided, produces reproducible random values using a linear congruential generator.
   * Critical for multi-node simulations to ensure identical behavior across runs for testing.
   * Falls back to Math.random() if seed is not a number.
   * 
   * @static
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @param {number} seed - Seed value for RNG (omit or pass non-number for true random)
   * @returns {number} Random integer between min and max
   * 
   * @example
   * // Deterministic random numbers for testing
   * const val1 = SmlCommon.RandomSeed(1, 100, 42);  // Always same result for seed=42
   * const val2 = SmlCommon.RandomSeed(1, 100, 42);  // Same as val1
   * 
   * // Non-deterministic random
   * const val3 = SmlCommon.RandomSeed(1, 100);      // Different each time
   */
  public static RandomSeed(min: number, max: number, seed: number) {
    min = min || 0;
    max = max || 1;
    let rand;
    if (typeof seed === 'number') {
      const newSeed = (seed * 9301 + 49297) % 233280;
      let rnd = newSeed / 233280;
      const disp = Math.abs(Math.sin(newSeed));
      rnd = (rnd + disp) - Math.floor((rnd + disp));
      rand = Math.floor(min + rnd * (max - min + 1));
    } else {
      rand = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return rand;
  }

  /**
   * Generates unique nonce string to prevent transaction replay attacks
   * 
   * Produces a 4-character random string from alphanumeric characters.
   * Each transaction includes a unique nonce; same nonce + same sender = invalid duplicate.
   * Prevents attackers from replaying valid historical transactions.
   * 
   * @static
   * @returns {string} 4-character random alphanumeric nonce
   * 
   * @example
   * // Create unique transaction
   * const nonce = SmlCommon.generateNonce();
   * // Result: e.g., "aB3x", "Pq7z", etc.
   */
  public static generateNonce() {
    const length = 4;
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
