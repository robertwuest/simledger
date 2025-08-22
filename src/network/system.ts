import { BehaviorSubject } from 'rxjs';
import type { Tick } from './tick';

export class System {
  public static CycleTime = 2000;

  public tick: BehaviorSubject<Tick>;
  public stopFlag = false;

  private increment = 0;
  private elapsedTime = 0;

  constructor() {
    this.tick = new BehaviorSubject({ increment: this.increment, elapsedTime: this.elapsedTime });
  }

  start() {
    this.stopFlag = false;
    this.run(0);
  }

  stop() {
    this.stopFlag = true;
  }

  /**
   * Main cycle event
   */
  run(deltaTime: number) {
    this.increment++;
    this.elapsedTime += deltaTime;
    this.tick.next({ increment: this.increment, elapsedTime: this.elapsedTime });
    if (!this.stopFlag) {
      setTimeout(() => {
        this.run(System.CycleTime);
      }, System.CycleTime);
    }
  }
}
