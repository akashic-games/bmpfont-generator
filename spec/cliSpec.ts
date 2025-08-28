import { PNG } from "pngjs";
import * as pixelmatch from "pixelmatch";
import * as mock from "mock-fs";
import * as path from "path";
import * as fs from "fs";
import { app } from "../src/cli";
import type { BmpfontGeneratorCliConfig } from "../src/type";

const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~";

function compareImage(ImagePath1: string, ImagePath2: string): boolean {
    const img1 = PNG.sync.read(fs.readFileSync(ImagePath1));
    const img2 = PNG.sync.read(fs.readFileSync(ImagePath2));
    const numDiffPixels = pixelmatch(img1.data, img2.data, null, img1.width, img1.height);
    return numDiffPixels === 0;
}

async function testExpectElements(answerJson: any, args: BmpfontGeneratorCliConfig) {
    await app(args);
    const resultJson = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "../", "out_glyphs.json"), "utf8")
    );
    expect(resultJson).toEqual(answerJson);
    expect(compareImage("result.png", "answer.png")).toBe(true);
}

describe("generator.draw", function() {
    it("normal scenario", async function() {
		const answerJson = require(path.resolve(__dirname, "fixtures/mplus_glyphs.json"));
		const answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus.png"));
        mock({
            "answer.png": answer,
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
            strokeWidth: 1
        };
        await testExpectElements(answerJson, args);
        mock.restore();
    });

    // TODO: アンチエイリアス機能のマージ後にテストケースのファイルを再生成し参照するよう修正する
    xit("normal scenario with no AntiAlias", async function() {
		const answerJson = require(path.resolve(__dirname, "fixtures/mplus_glyphs.json"));
		const answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus.png"));
        mock({
            "answer.png": answer,
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
        await testExpectElements(answerJson, args);
        mock.restore();
    });

	it("normal scenario with color", async function() {
		const answerJson = require(path.resolve(__dirname, "fixtures/mplus-color_glyphs.json"));
		const answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-color.png"));
        mock({
            "answer.png": answer,
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
        await testExpectElements(answerJson, args);
        mock.restore();
    });

	it("normal scenario with stroke", async function() {
		const answerJson = require(path.resolve(__dirname, "fixtures/mplus-stroke_glyphs.json"));
		const answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-stroke.png"));
        mock({
            "answer.png": answer,
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
        await testExpectElements(answerJson, args);
        mock.restore();
    });

	it("normal scenario with stroke and strokeWidth", async function() {
		const answerJson = require(path.resolve(__dirname, "fixtures/mplus-stroke-width_glyphs.json"));
		const answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-stroke-width.png"));
        mock({
            "answer.png": answer,
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
        await testExpectElements(answerJson, args);
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
            "answer.png": answer,
            "font.ttf": fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"))
        });
        const args: BmpfontGeneratorCliConfig = {
            quality: null!,
            chars: "0123456789",
            missingGlyph: undefined,
            fill: "#000000",
            stroke: undefined,
            baseine: NaN,
            height: 20,
            fixedWidth: undefined,
            json: "out_glyphs.json",
            noAntiAlias: false,
            margin: 1,
            output: "result.png",
            source: "font.ttf",
            strokeWidth: 2
        };
        await testExpectElements(answerJson, args);
        mock.restore();
    });
});
