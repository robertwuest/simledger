import { BehaviorSubject } from 'rxjs';
import type { Tick } from './tick';

/**
 * Main simulation engine for the blockchain network
 * 
 * Manages the tick-based simulation cycle that drives all blockchain node updates.
 * Operates on a fixed time interval (CycleTime) and publishes events to all observers.
 * 
 * All network nodes subscribe to the tick events and update their state accordingly.
 * This ensures synchronized, deterministic simulation across all nodes.
 * 
 * @class System
 * @property {BehaviorSubject<Tick>} tick - Observable tick events (increment and elapsed time)
 * @property {boolean} stopFlag - Flag to stop the simulation loop
 */
export class System {
  /**
   * Default cycle time in milliseconds
   * Determines how frequently nodes process events and transactions
   * @static
   * @default 2000
   */
  public static CycleTime = 2000;

  public tick: BehaviorSubject<Tick>;
  public stopFlag = false;

  private increment = 0;
  private elapsedTime = 0;

  /**
   * Creates a new System instance with initial tick values
   */
  constructor() {
    this.tick = new BehaviorSubject({ increment: this.increment, elapsedTime: this.elapsedTime });
  }

  /**
   * Starts the simulation loop
   * 
   * Begins emitting tick events at regular intervals (System.CycleTime).
   * Each tick triggers updates across all subscribed nodes.
   */
  start() {
    this.stopFlag = false;
    this.run(0);
  }

  /**
   * Stops the simulation loop
   * 
   * Sets the stop flag to prevent further tick emissions.
   */
  stop() {
    this.stopFlag = true;
  }

  /**
   * Main cycle event - recursively called to drive the simulation
   * 
   * Each call:
   * - Increments the cycle counter
   * - Accumulates elapsed time
   * - Emits a new tick event to all subscribers
   * - Schedules the next cycle (if not stopped)
   * 
   * @private
   * @param {number} deltaTime - Time delta from the previous cycle (in milliseconds)
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
