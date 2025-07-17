import * as opentype from "opentype.js";
import * as path from "path";
//@ts-ignore
import { calculateCanvasSize } from "../lib/generateBitmap";
import type { GlyphRenderable, RenderableTable, ResolvedSizeOptions } from "../src/type";

let font: opentype.Font;

const resolvedSizeOptions = {
    fixedWidth: undefined,
    height: 13,
    baselineHeight: 10.6,
    margin: 1,
    requiredHeight: 7.6,
    lineHeight: 13,
    descend: -3
}

const esolvedSizeOptionsFixed = JSON.parse(JSON.stringify(resolvedSizeOptions));
esolvedSizeOptionsFixed.fixedWidth = 10;

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

describe("calculateCanvasSize", function () {
	it("no fixed", function () {
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 1), resolvedSizeOptions)).toEqual({ width: 16, height: 15 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 2), resolvedSizeOptions)).toEqual({ width: 32, height: 15 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 3), resolvedSizeOptions)).toEqual({ width: 32, height: 15 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 4), resolvedSizeOptions)).toEqual({ width: 32, height: 29 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 5), resolvedSizeOptions)).toEqual({ width: 32, height: 29 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 6), resolvedSizeOptions)).toEqual({ width: 32, height: 29 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 7), resolvedSizeOptions)).toEqual({ width: 32, height: 43 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 8), resolvedSizeOptions)).toEqual({ width: 64, height: 29 });
	});

	it("no fixed", function () {
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 1), esolvedSizeOptionsFixed)).toEqual({ width: 16, height: 16 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 2), esolvedSizeOptionsFixed)).toEqual({ width: 32, height: 16 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 3), esolvedSizeOptionsFixed)).toEqual({ width: 32, height: 28 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 4), esolvedSizeOptionsFixed)).toEqual({ width: 32, height: 28 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 5), esolvedSizeOptionsFixed)).toEqual({ width: 32, height: 44 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 6), esolvedSizeOptionsFixed)).toEqual({ width: 32, height: 44 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 7), esolvedSizeOptionsFixed)).toEqual({ width: 64, height: 28 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 8), esolvedSizeOptionsFixed)).toEqual({ width: 64, height: 28 });
	});
})

describe("resolveSizeOptions", function () {
	
});