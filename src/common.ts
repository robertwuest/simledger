import { ec as EC } from 'elliptic';

export default class SmlCommon {
    public static curve = new EC('secp256k1');
    public static generateTimestamp() {
        return (new Date()).getTime().toString();
    }

    public static generateKeyPair() {
        // Generate a new key pair and convert them to hex-strings
        const key = SmlCommon.curve.genKeyPair();
        const publicKey = key.getPublic('hex');
        const privateKey = key.getPrivate('hex');

        // Print the keys to the console
        console.log();
        console.log('Your public key:', publicKey);
        console.log();
        console.log('Your private key', privateKey);
        return {
            private: privateKey,
            public: publicKey,
        };
    }
}