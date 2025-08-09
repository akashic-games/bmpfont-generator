import { PNG } from "pngjs";
import * as pixelmatch from "pixelmatch";
import * as mock from "mock-fs";
import * as path from "path";
import * as fs from "fs";
import { app } from "../src/cli";
import type { BmpfontGeneratorCliConfig } from "../src/type";



function compareImage(ImagePath1: string, ImagePath2: string): boolean {
    const img1 = PNG.sync.read(fs.readFileSync(ImagePath1));
    const img2 = PNG.sync.read(fs.readFileSync(ImagePath2));
    const numDiffPixels = pixelmatch(img1.data, img2.data, null, img1.width, img1.height);
    return numDiffPixels === 0;
}

describe("generator.draw", function() {
    it("normal scenario", async function() {
		var answerJson = require(path.resolve(__dirname, "fixtures/mplus_glyphs.json"));
		var answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus.png"));
        mock({
            "answer.png": answer,
            "font.ttf": fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf")),
        });
        const args: BmpfontGeneratorCliConfig = {
            chars: "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~",
            fill: "#000000",
            height: 40,
            json: "out_glyphs.json",
            margin: 1,
            output: "result.png",
            source: "font.ttf",
            strokeWidth: 1
        };
        await app(args);
        const resultJson = JSON.parse(
            fs.readFileSync(path.resolve(__dirname, "../", "out_glyphs.json"), "utf8")
        );
        expect(resultJson).toEqual(answerJson);
        expect(compareImage("result.png", "answer.png")).toBe(true);
        mock.restore();
    });
    it("normal scenario with no AntiAlias", async function() {
		var answerJson = require(path.resolve(__dirname, "fixtures/mplus_glyphs.json"));
		var answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus.png"));
        mock({
            "answer.png": answer,
            "font.ttf": fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf")),
        });
        const args: BmpfontGeneratorCliConfig = {
            chars: "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~",
            fill: "#000000",
            height: 40,
            json: "out_glyphs.json",
            margin: 1,
            output: "result.png",
            source: "font.ttf",
            strokeWidth: 1,
            noAntiAlias: true
        };
        await app(args);
        const resultJson = JSON.parse(
            fs.readFileSync(path.resolve(__dirname, "../", "out_glyphs.json"), "utf8")
        );
        expect(resultJson).toEqual(answerJson);
        expect(compareImage("result.png", "answer.png")).toBe(true);
        mock.restore();
    });
});