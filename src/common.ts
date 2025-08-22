import { ec as EC } from 'elliptic';
import base58 from 'bs58';

export default class SmlCommon {
  public static curve = new EC('secp256k1');

  /**
   * Generate the current timestamp
   */
  public static generateTimestamp() {
    return (new Date()).getTime().toString();
  }

  /**
   * Generate a new key pair and convert them to hex-strings
   * @param privateKey
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
   * Convert hex hash to shorter Base58 string
   * @param key
   * @constructor
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
   * Convert a Base58 hash string back to hex
   * @param key
   * @constructor
   */
  public static Base58ToHex(key: any) {
    const bytes = base58.decode(key);
    return SmlCommon.Uint8ArrayToHex(bytes);
  }

  public static Uint8ArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generate random number given a seed
   * @param min
   * @param max
   * @param seed
   * @constructor
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
   * Generate a random nonce
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
