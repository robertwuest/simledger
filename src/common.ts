import { ec as EC } from 'elliptic';
import base58 from 'bs58';

export default class SmlCommon {
  public static curve = new EC('secp256k1');

  public static generateTimestamp() {
    return (new Date()).getTime().toString();
  }

  public static generateKeyPair() {
    // Generate a new key pair and convert them to hex-strings
    const key = SmlCommon.curve.genKeyPair();
    return key;
  }

  public static HexToBase58(key: any) {
    const bytes = Buffer.from(key, 'hex');
    return base58.encode(bytes);
  }

  public static Base58ToHex(key: any) {
    const bytes = base58.decode(key);
    return bytes.toString('hex');
  }
}
