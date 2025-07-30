import * as opentype from "opentype.js";
import * as canvas from "@napi-rs/canvas";
import * as path from "path";
import * as fs from "fs";
//@ts-ignore
import { calculateCanvasSize, collectGlyphRenderables, resolveSizeOptions } from "../lib/generateBitmap";
import type { BitmapFontEntryTable, GlyphRenderable, GlyphRenderableTable, RenderableTable, ResolvedSizeOptions, SizeOptions } from "../src/type";

let font: opentype.Font;

async function generateTestParts(sizeOptions: SizeOptions, chars: string) {
	font = await opentype.load(path.join(__dirname, "./fixtures/mplus-1c-light.ttf"));
	const entryTable = Array.from(chars).reduce((table, ch) => {
		table[ch.charCodeAt(0)] = ch;
		return table;
	}, { missingGlyph: "" } as BitmapFontEntryTable);

	const { glyphRenderableTable } = collectGlyphRenderables(entryTable, font, sizeOptions);
	return { glyphRenderableTable, font , entryTable};
}

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

	it("no fixed", function() {
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 1), resolvedSizeOptions)).toEqual({ width: 16, height: 15 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 2), resolvedSizeOptions)).toEqual({ width: 32, height: 15 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 3), resolvedSizeOptions)).toEqual({ width: 32, height: 15 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 4), resolvedSizeOptions)).toEqual({ width: 32, height: 29 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 5), resolvedSizeOptions)).toEqual({ width: 32, height: 29 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 6), resolvedSizeOptions)).toEqual({ width: 32, height: 29 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 7), resolvedSizeOptions)).toEqual({ width: 32, height: 43 });
		expect(calculateCanvasSize(abcdefghWdith.slice(0, 8), resolvedSizeOptions)).toEqual({ width: 64, height: 29 });
	});

	it("no fixed", function() {
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

describe("collectGlyphRenderables", function () {
	it("", async function() {
		const entries = "abc俱𠀋㐂";
		const sizeOptions = { height: 13, margin: 1, fixedWidth: undefined, baselineHeight: undefined };
		const { entryTable } = await generateTestParts(sizeOptions, entries);
		const missingGlyph = new canvas.Image;
		missingGlyph.src = fs.readFileSync(path.join(__dirname, "./fixtures/dummy1x1.png"))
		entryTable["missingGlyph"] = missingGlyph;
		const { glyphRenderableTable, imageEntryTable, lostChars } = collectGlyphRenderables(entryTable, font, sizeOptions);
		expect(Object.keys(glyphRenderableTable).sort()).toEqual(Array.from(entries).map(e => String(e.charCodeAt(0))).sort());
		expect(lostChars).toEqual(["㐂", "俱", "𠀋"]);
		expect(imageEntryTable).toEqual({ missingGlyph });
	})
});

describe("resolveSizeOptions", function () {
	it("no fixed", async function() {
		const sizeOptions = { height: 13, margin: 1, fixedWidth: undefined, baselineHeight: undefined };
		const { glyphRenderableTable, font } = await generateTestParts(sizeOptions, "abcdefgh");
		const resizedSizeOptions = resolveSizeOptions(glyphRenderableTable, sizeOptions, font);
		expect(resizedSizeOptions).toEqual({
			fixedWidth: undefined,
			height: 13,
			baselineHeight: 9.75,
			margin: 1,
			requiredHeight: 6.76,
			lineHeight: 13,
			descend: -2.99
		});
	})
	it("fixed", async function() {
		const sizeOptions = { height: 13, margin: 1, fixedWidth: 5, baselineHeight: undefined };
		const { glyphRenderableTable, font } = await generateTestParts(sizeOptions, "abcdefgh");
		const resizedSizeOptions = resolveSizeOptions(glyphRenderableTable, sizeOptions, font);
		expect(resizedSizeOptions).toEqual({
			fixedWidth: 5,
			height: 13,
			baselineHeight: 9.75,
			margin: 1,
			requiredHeight: 6.76,
			lineHeight: 13,
			descend: -2.99
		});
	})
	it("baseline height", async function() {
		const sizeOptions = { height: 13, margin: 1, fixedWidth: undefined, baselineHeight: 16 };
		const { glyphRenderableTable, font } = await generateTestParts(sizeOptions, "abcdefgh");
		const resizedSizeOptions = resolveSizeOptions(glyphRenderableTable, sizeOptions, font);
		expect(resizedSizeOptions).toEqual({
			fixedWidth: undefined,
			height: 13,
			baselineHeight: 9.75,
			margin: 1,
			requiredHeight: 6.76,
			lineHeight: 13,
			descend: -2.99
		});
	})

	it("margin", async function() {
		const sizeOptions = { height: 13, margin: 3, fixedWidth: undefined, baselineHeight: undefined };
		const { glyphRenderableTable, font } = await generateTestParts(sizeOptions, "abcdefgh");
		const resizedSizeOptions = resolveSizeOptions(glyphRenderableTable, sizeOptions, font);
		expect(resizedSizeOptions).toEqual({
			fixedWidth: undefined,
			height: 13,
			baselineHeight: 9.75,
			margin: 3,
			requiredHeight: 6.76,
			lineHeight: 13,
			descend: -2.99
		});
	})
});
