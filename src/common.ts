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
    const bytes = Buffer.from(key, 'hex');
    return base58.encode(bytes);
  }

  /**
   * Convert a Base58 hash string back to hex
   * @param key
   * @constructor
   */
  public static Base58ToHex(key: any) {
    const bytes = base58.decode(key);
    return bytes.toString('hex');
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
