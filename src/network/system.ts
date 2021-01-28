import {BehaviorSubject} from "rxjs";
import {Tick} from "@/network/tick";

export class System {
	public static CycleTime =  200;
	public tick: BehaviorSubject<Tick>;
	public stopFlag = false;
	private _increment = 0;
	private _elapsedTime = 0;

	constructor() {
		this.tick = new BehaviorSubject({ increment: this._increment, elapsedTime: this._elapsedTime});
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
		this._increment++;
		this._elapsedTime += deltaTime;
		this.tick.next({ increment: this._increment, elapsedTime: this._elapsedTime});
		if (!this.stopFlag) {
			setTimeout(() => {
				this.run(System.CycleTime);
			}, System.CycleTime);
		}
	}
}
