/**
 * Shared test fixtures
 */
import SmlCommon from '~~/src/common';
import { defaultScene } from '~/config/scenes';

/** Key pair of the genesis wallet that holds the initial 100 coins */
export function genesisKeyPair() {
  return SmlCommon.generateKeyPair(defaultScene.genesis!.privateKey);
}

/** Base58 address of a key pair */
export function addressOf(keyPair: ReturnType<typeof SmlCommon.generateKeyPair>) {
  return SmlCommon.HexToBase58(keyPair.getPublic(true, 'hex'));
}
