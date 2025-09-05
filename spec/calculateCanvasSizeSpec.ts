// TODO generateBitmapSpec.ts にこのテストを統合する

//@ts-ignore
import { calculateCanvasSize } from "../lib/generateBitmap";

describe("calculateCanvasSize", function() {
	const resolvedSizeOptions = {
		fixedWidth: undefined,
		height: 13,
		baselineHeight: 10.6,
		margin: 1,
		requiredHeight: 7.6,
		lineHeight: 13,
		descend: -3
	}

	const resolvedSizeOptionsFixed = JSON.parse(JSON.stringify(resolvedSizeOptions));
	resolvedSizeOptionsFixed.fixedWidth = 10;

	const abcdefghWdith = [
		{ width: 7 }, // a
		{ width: 8 }, // b
		{ width: 7 }, // c
		{ width: 8 }, // d
		{ width: 7 }, // e
		{ width: 7 }, // f
		{ width: 8 }, // g
		{ width: 8 }, // h
	];

	it("no fixed", function() {
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 1), resolvedSizeOptions)).toEqual({ width: 32, height: 16 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 2), resolvedSizeOptions)).toEqual({ width: 32, height: 16 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 3), resolvedSizeOptions)).toEqual({ width: 32, height: 16 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 4), resolvedSizeOptions)).toEqual({ width: 32, height: 32 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 5), resolvedSizeOptions)).toEqual({ width: 32, height: 32 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 6), resolvedSizeOptions)).toEqual({ width: 64, height: 16 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 7), resolvedSizeOptions)).toEqual({ width: 64, height: 16 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 8), resolvedSizeOptions)).toEqual({ width: 64, height: 32 });
	});

	it("fixed", function() {
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 1), resolvedSizeOptionsFixed)).toEqual({ width: 32, height: 16 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 2), resolvedSizeOptionsFixed)).toEqual({ width: 32, height: 16 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 3), resolvedSizeOptionsFixed)).toEqual({ width: 32, height: 32 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 4), resolvedSizeOptionsFixed)).toEqual({ width: 64, height: 16 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 5), resolvedSizeOptionsFixed)).toEqual({ width: 64, height: 16 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 6), resolvedSizeOptionsFixed)).toEqual({ width: 64, height: 32 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 7), resolvedSizeOptionsFixed)).toEqual({ width: 64, height: 32 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 8), resolvedSizeOptionsFixed)).toEqual({ width: 64, height: 32 });
	});
})
