/**
 * Tick event interface for simulation cycles
 * 
 * Emitted by the System class on each simulation cycle.
 * All network nodes subscribe to tick events and update their state accordingly.
 * 
 * @interface Tick
 * @property {number} increment - Sequential cycle counter (increments by 1 each tick)
 * @property {number} elapsedTime - Cumulative elapsed time in milliseconds since system start
 */
export interface Tick {
	/**
	 * Sequential cycle number, starting from 1 on the first cycle
	 */
	increment: number;
	
	/**
	 * Total elapsed time in milliseconds since the simulation started
	 */
	elapsedTime: number;
}
