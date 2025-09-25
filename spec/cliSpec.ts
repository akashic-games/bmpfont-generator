import * as fs from "fs";
import * as path from "path";
import * as mock from "mock-fs";
import * as pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { app } from "../src/cli";
import type { BmpfontGeneratorCliConfig } from "../src/type";

const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~";

function compareImage(image1Buffer: Buffer, image2Buffer: Buffer): boolean {
	const img1 = PNG.sync.read(image1Buffer);
	const img2 = PNG.sync.read(image2Buffer);
	if ((img1.width !== img2.width) || (img1.height !== img2.height)) return false;
	const numDiffPixels = pixelmatch(img1.data, img2.data, null, img1.width, img1.height);
	return numDiffPixels === 0;
}

async function testExpectElements(answerJson: any, answerPng: Buffer, args: BmpfontGeneratorCliConfig): Promise<void> {
	await app(args);
	const resultJson = JSON.parse(
		fs.readFileSync(path.resolve(__dirname, "../", "out_glyphs.json"), "utf8")
	);
	expect(resultJson).toEqual(answerJson);
	expect(compareImage(fs.readFileSync(args.output), answerPng)).toBe(true);
}

describe("generator.draw", function() {
	afterEach(() => {
		mock.restore();
	});

	it("normal scenario", async function() {
		const answerJson = require(path.resolve(__dirname, "fixtures/mplus_glyphs.json"));
		const answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus.png"));
		mock({
			"font.ttf": fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"))
		});
		const args: BmpfontGeneratorCliConfig = {
			chars,
			fill: "#000000",
			height: 41,
			json: "out_glyphs.json",
			margin: 1,
			output: "result.png",
			source: "font.ttf",
			strokeWidth: 1
		};
		await testExpectElements(answerJson, answer, args);
		mock.restore();
	});

	it("normal scenario with no AntiAlias", async function() {
		const answerJson = require(path.resolve(__dirname, "fixtures/mplus-antialias_glyphs.json"));
		const answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-antialias.png"));
		mock({
			"font.ttf": fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"))
		});
		const args: BmpfontGeneratorCliConfig = {
			chars,
			fill: "#000000",
			height: 40,
			json: "out_glyphs.json",
			margin: 1,
			output: "result.png",
			source: "font.ttf",
			strokeWidth: 1,
			noAntiAlias: true
		};
		await testExpectElements(answerJson, answer, args);
		mock.restore();
	});

	it("normal scenario with color", async function() {
		const answerJson = require(path.resolve(__dirname, "fixtures/mplus-color_glyphs.json"));
		const answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-color.png"));
		mock({
			"font.ttf": fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf")),
		});
		const args: BmpfontGeneratorCliConfig = {
			chars,
			fill: "#0000ff",
			height: 20,
			json: "out_glyphs.json",
			margin: 1,
			output: "result.png",
			source: "font.ttf",
			strokeWidth: 1
		};
		await testExpectElements(answerJson, answer, args);
		mock.restore();
	});

	it("normal scenario with stroke", async function() {
		const answerJson = require(path.resolve(__dirname, "fixtures/mplus-stroke_glyphs.json"));
		const answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-stroke.png"));
		mock({
			"font.ttf": fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"))
		});
		const args: BmpfontGeneratorCliConfig = {
			chars: "0123456789",
			missingGlyph: "?",
			fill: "#000000",
			stroke: "#0000ff",
			height: 80,
			fixedWidth: 80,
			json: "out_glyphs.json",
			margin: 1,
			output: "result.png",
			source: "font.ttf",
			strokeWidth: 1
		};
		await testExpectElements(answerJson, answer, args);
		mock.restore();
	});

	it("normal scenario with stroke and strokeWidth", async function() {
		const answerJson = require(path.resolve(__dirname, "fixtures/mplus-stroke-width_glyphs.json"));
		const answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-stroke-width.png"));
		mock({
			"font.ttf": fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"))
		});
		const args: BmpfontGeneratorCliConfig = {
			chars: "0123456789",
			missingGlyph: "?",
			fill: "#000000",
			stroke: "#0000ff",
			height: 80,
			fixedWidth: 80,
			json: "out_glyphs.json",
			margin: 1,
			output: "result.png",
			source: "font.ttf",
			strokeWidth: 2
		};
		await testExpectElements(answerJson, answer, args);
		mock.restore();
	});

	it("too big error scenario", async function() {
		mock({
			"font.ttf": fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"))
		});
		const args: BmpfontGeneratorCliConfig = {
			chars,
			missingGlyph: "?",
			fill: "#000000",
			height: 2000,
			json: "out_glyphs.json",
			margin: 1,
			output: "result.png",
			source: "font.ttf",
			strokeWidth: 1
		};
		await expect(app(args)).rejects.toThrow("list is too long");
		mock.restore();
	});

	it("too small error scenario", async function() {
		mock({
			"font.ttf": fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"))
		});
		const args: BmpfontGeneratorCliConfig = {
			chars,
			missingGlyph: "?",
			fill: "#000000",
			height: 0,
			fixedWidth: 0,
			json: "out_glyphs.json",
			margin: 0,
			output: "result.png",
			source: "font.ttf",
			strokeWidth: 0
		};
		await expect(app(args)).rejects.toThrow("requested size is too small");
		mock.restore();
	});

	it("generateBitmapFont defaultMissingGlyph", async function() {
		const answerJson = require(path.resolve(__dirname, "fixtures/mplus-defaultMG_glyphs.json"));
		const answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-defaultMG.png"));
		mock({
			"font.ttf": fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"))
		});
		const args: BmpfontGeneratorCliConfig = {
			quality: null!,
			chars: "0123456789",
			missingGlyph: undefined,
			fill: "#000000",
			stroke: undefined,
			height: 20,
			json: "out_glyphs.json",
			noAntiAlias: false,
			margin: 1,
			output: "result.png",
			source: "font.ttf",
			strokeWidth: 2
		};
		await testExpectElements(answerJson, answer, args);
		mock.restore();
	});
});
