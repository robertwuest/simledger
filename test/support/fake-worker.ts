/**
 * Minimal Web Worker stand-in for tests.
 *
 * Runs the real `public/<script>` (e.g. the proof-of-work miner `js/mining.js`)
 * inside a Node VM context and relays messages asynchronously, so the blockchain
 * mining code path can be exercised without a browser.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

type Listener = (event: { data: unknown }) => void;

const publicDir = resolve(process.cwd(), 'public');

export class FakeWorker {
  static created: FakeWorker[] = [];

  private readonly outbound: Listener[] = [];
  private readonly inbound: Listener[] = [];
  terminated = false;

  constructor(public readonly script: string) {
    FakeWorker.created.push(this);
    const context: Record<string, unknown> = {};
    context.self = context;
    context.addEventListener = (type: string, listener: Listener) => {
      if (type === 'message') this.inbound.push(listener);
    };
    context.postMessage = (data: unknown) => {
      Promise.resolve().then(() => {
        if (!this.terminated) this.outbound.forEach(listener => listener({ data }));
      });
    };
    vm.createContext(context);
    vm.runInContext(readFileSync(resolve(publicDir, script), 'utf-8'), context);
  }

  addEventListener(type: string, listener: Listener) {
    if (type === 'message') this.outbound.push(listener);
  }

  postMessage(data: unknown) {
    const copy = structuredClone(data);
    Promise.resolve().then(() => this.inbound.forEach(listener => listener({ data: copy })));
  }

  terminate() {
    this.terminated = true;
  }
}
