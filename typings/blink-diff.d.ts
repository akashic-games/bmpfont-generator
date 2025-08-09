interface Options {
    imageAPath: string;
    imageBPath: string;
    thresholdType: string;
    threshold: number;
}

interface Result {
    code: number;
}

declare module "blink-diff" {
	export default class blinkDiff {
		constructor(options: Options);
		run(callback: (error: any, result: Result) => void): void;
        hasPassed(result: number): boolean;
    }
}
