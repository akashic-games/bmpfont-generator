var generator = require("../lib/generator");
var util = require("../lib/util");
var fs = require("fs");
var mockfs = require("mock-fs");
var path = require("path");
var opentype = require("opentype.js");
var blinkDiff = require("blink-diff");

var Canvas = require("canvas");
var Image = Canvas.Image;

function diff(answer, result, callback) {
	var diff = new blinkDiff({
		imageAPath: answer,
		imageBPath: result,
		thresholdType: blinkDiff.THRESHOLD_PERCENT,
		// cairoのバージョン間差異を吸収するために0.1%までの描画差異を許容します
		// 0.1%という数値に裏付けはありません
		threshold: 0.001,
	});
	diff.run(function (error, result) {
		if (error) {
			callback(error);
		} else {
			callback(diff.hasPassed(result.code) ? 'Passed' : 'Failed');
		}
	});
}

describe("generator.draw", function() {
	it("normal scenario", function(done) {
		var answerJson = require(path.resolve(__dirname, "fixtures/mplus-without-width-and-height.json"));
		var answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus.png"));
		var canvas = Canvas.createCanvas(256, 256);
		var ctx = canvas.getContext("2d");
		opentype.load(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"), function(err, font) {
			expect(err).toBeNull();
			mockfs({"answer.png": answer});
			var glyphList = font.stringToGlyphs("0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~").map(function(g) {
				var scale = 1 / g.font.unitsPerEm * 20;
				return {glyph: g, width: Math.ceil(g.advanceWidth * scale)};
			});
			var baseline = Math.ceil(Math.max.apply(Math, glyphList.map(function(g) {
				var scale = 1 / g.glyph.font.unitsPerEm * 20;
				return g.glyph.yMax * scale;
			})));
			var descend = Math.min.apply(Math, glyphList.map(function(g) {
				var scale = 1 / g.glyph.font.unitsPerEm * 20;
				return g.glyph.yMin * scale;
			}));
			descend = Math.ceil(Math.abs(descend));
			var g = font.charToGlyph("?");
			var scale = 1 / g.font.unitsPerEm * 20;
			glyphList.push({glyph: g, width: Math.ceil(g.advanceWidth * scale)});
			if (baseline < g.yMax * scale)
				baseline = Math.ceil(g.yMax * scale);
			var args = {quality: null, height: 20, width: 25, missingGlyph: "?", fill: "#000000", stroke: undefined, baseline: baseline, margin: 1};
			var resultJson = generator.draw(ctx, font, glyphList, descend, args);
			expect(resultJson).toEqual(answerJson);
			util.outputBitmapFont("result.png", canvas, args.quality, function() {
				diff("answer.png", "result.png", function(result) {
					expect(result).toBe("Passed");
					mockfs.restore();
					done();
				});
			});
		});
	});
});

describe("generator.draw without width", function() {
	it("normal scenario", function(done) {
		var answerJson = require(path.resolve(__dirname, "fixtures/mplus_ww.json"));
		var answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus_ww.png"));
		var canvas = Canvas.createCanvas(256, 128);
		var ctx = canvas.getContext("2d");
		opentype.load(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"), function(err, font) {
			expect(err).toBeNull();
			mockfs({"answer.png": answer});
			var glyphList = font.stringToGlyphs("0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~").map(function(g) {
				var scale = 1 / g.font.unitsPerEm * 20;
				return {glyph: g, width: Math.ceil(g.advanceWidth * scale)};
			});
			var baseline = Math.ceil(Math.max.apply(Math, glyphList.map(function(g) {
				var scale = 1 / g.glyph.font.unitsPerEm * 20;
				return g.glyph.yMax * scale;
			})));
			var descend = Math.min.apply(Math, glyphList.map(function(g) {
				var scale = 1 / g.glyph.font.unitsPerEm * 20;
				return g.glyph.yMin * scale;
			}));
			descend = Math.ceil(Math.abs(descend));

			var g = font.charToGlyph("?");
			var scale = 1 / g.font.unitsPerEm * 20;
			glyphList.push({glyph: g, width: Math.ceil(g.advanceWidth * scale)});
			if (baseline < g.yMax * scale)
				baseline = Math.ceil(g.yMax * scale);

			var args = {quality: null, height: 20, width: undefined, missingGlyph: "?", fill: "#000000", stroke: undefined, baseline: baseline, margin: 1};
			var resultJson = generator.draw(ctx, font, glyphList, descend, args);
			expect(resultJson).toEqual(answerJson);
			util.outputBitmapFont("result.png", canvas, args.quality, function() {
				diff("answer.png", "result.png", function(result) {
					expect(result).toBe("Passed");
					mockfs.restore();
					done();
				});
			});
		});
	});
});

describe("generator.generateBitmapFont", function() {
	it("normal scenario", function(done) {
		var answerJson = require(path.resolve(__dirname, "fixtures/mplus.json")) ;
		var answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus.png"));
		opentype.load(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"), function(err, font) {
			expect(err).toBeNull();
			mockfs({"answer.png": answer});
			var args = {quality: null, height: 20, width: 25, list: "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~", missingGlyph: "?", fill: "#000000", stroke: undefined, baseline: NaN, json: "result.json", noAntiAlias: true, margin: 1};
			generator.generateBitmapFont(font, "result.png", args, function(err) {
				expect(err).toBeNull();
				var resultJsonStr = fs.readFileSync("result.json", "utf8");
				var resultJson = JSON.parse(resultJsonStr);
				expect(resultJson).toEqual(answerJson);
				diff("answer.png", "result.png", function(result) {
					expect(result).toBe("Passed");
					mockfs.restore();
					done();
				});
			});
		});
	});

	it("normal scenario with no AntiAlias", function(done) {
		var answerJson = require(path.resolve(__dirname, "fixtures/mplus.json")) ;
		var answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus_no_aa.png"));
		opentype.load(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"), function(err, font) {
			expect(err).toBeNull();
			mockfs({"answer.png": answer});
			var args = {quality: null, height: 20, width: 25, list: "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~", missingGlyph: "?", fill: "#000000", stroke: undefined, baseline: NaN, json: "result.json", noAntiAlias: false, margin: 1};
			generator.generateBitmapFont(font, "result.png", args, function(err) {
				expect(err).toBeNull();
				var resultJsonStr = fs.readFileSync("result.json", "utf8");
				var resultJson = JSON.parse(resultJsonStr);
				expect(resultJson).toEqual(answerJson);
				diff("answer.png", "result.png", function(result) {
					expect(result).toBe("Passed");
					mockfs.restore();
					done();
				});
			});
		});
	});

	it("normal scenario with color", function(done) {
		var answerJson = require(path.resolve(__dirname, "fixtures/mplus.json")) ;
		var answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus_blue.png"));
		opentype.load(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"), function(err, font) {
			expect(err).toBeNull();
			mockfs({"answer.png": answer});
			var args = {quality: null, height: 20, width: 25, list: "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~", missingGlyph: "?", fill: "#0000ff", stroke: undefined, baseline: NaN, json: "result.json", noAntiAlias: true, margin: 1};
			generator.generateBitmapFont(font, "result.png", args, function(err) {
				expect(err).toBeNull();
				var resultJsonStr = fs.readFileSync("result.json", "utf8");
				var resultJson = JSON.parse(resultJsonStr);
				expect(resultJson).toEqual(answerJson);
				diff("answer.png", "result.png", function(result) {
					expect(result).toBe("Passed");
					mockfs.restore();
					done();
				});
			});
		});
	});

	it("normal scenario with stroke", function(done) {
		var answerJson = require(path.resolve(__dirname, "fixtures/mplus-stroke-blue.json")) ;
		var answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus-stroke-blue.png"));
		opentype.load(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"), function(err, font) {
			expect(err).toBeNull();
			mockfs({"answer.png": answer});
			var args = {quality: null, height: 80, width: 80, list: "0123456789", missingGlyph: "?", fill: "#000000", stroke: "#0000ff", baseline: NaN, json: "result.json", noAntiAlias: true, margin: 1};
			generator.generateBitmapFont(font, "result.png", args, function(err) {
				expect(err).toBeNull();
				var resultJsonStr = fs.readFileSync("result.json", "utf8");
				var resultJson = JSON.parse(resultJsonStr);
				expect(resultJson).toEqual(answerJson);
				diff("answer.png", "result.png", function(result) {
					expect(result).toBe("Passed");
					mockfs.restore();
					done();
				});
			});
		});
	});

	it("too big error scenario", function(done) {
		opentype.load(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"), function(err, font) {
			expect(err).toBeNull();
			mockfs({});
			var args = {quality: null, height: 1000, width: 1000, list: "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~", missingGlyph: "?", fill: "#000000", stroke: undefined, baseline: NaN, json: "result.json", noAntiAlias: true, margin: 1};
			generator.generateBitmapFont(font, "result.png", args, function(err) {
				expect(err).toBe("list is too long");
				mockfs.restore();
				done();
			});
		});
	});

	it("too small error scenario", function(done) {
		opentype.load(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"), function(err, font) {
			expect(err).toBeNull();
			mockfs({});
			var args = {quality: null, height: 0, width: 0, list: "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~", missingGlyph: "?", fill: "#000000", stroke: undefined, baseline: NaN, json: "result.json", noAntiAlias: true, margin: 1};
			generator.generateBitmapFont(font, "result.png", args, function(err) {
				expect(err).toBe("char size is too small");
				mockfs.restore();
				done();
			});
		});
	});
});

describe("generator.generateBitmapFont without width", function() {
	it("normal scenario", function(done) {
		var answerJson = require(path.resolve(__dirname, "fixtures/mplus_ww.json")) ;
		var answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus_ww.png"));
		opentype.load(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"), function(err, font) {
			expect(err).toBeNull();
			mockfs({"answer.png": answer});
			var args = {quality: null, height: 20, width: undefined, list: "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~", missingGlyph: "?", fill: "#000000", stroke: undefined, baseline: NaN, json: "result.json", noAntiAlias: true, margin: 1};
			generator.generateBitmapFont(font, "result.png", args, function(err) {
				expect(err).toBeNull();
				var resultJsonStr = fs.readFileSync("result.json", "utf8");
				var resultJson = JSON.parse(resultJsonStr);
				delete resultJson.width;
				delete resultJson.height;
				expect(resultJson).toEqual(answerJson);
				diff("answer.png", "result.png", function(result) {
					expect(result).toBe("Passed");
					mockfs.restore();
					done();
				});
			});
		});
	});
});

describe("generator.generateBitmapFont defaultMissingGlyph", function() {
	it("normal scenario", function(done) {
		var answerJson = require(path.resolve(__dirname, "fixtures/mplus_defaultMG.json")) ;
		var answer = fs.readFileSync(path.resolve(__dirname, "fixtures/mplus_defaultMG.png"));
		opentype.load(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"), function(err, font) {
			expect(err).toBeNull();
			mockfs({"answer.png": answer});
			var args = {quality: null, height: 20, width: undefined, list: "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~", missingGlyph: undefined, fill: "#000000", stroke: undefined, baseline: NaN, json: "result.json", noAntiAlias: true, margin: 1};
			generator.generateBitmapFont(font, "result.png", args, function(err) {
				expect(err).toBeNull();
				var resultJsonStr = fs.readFileSync("result.json", "utf8");
				var resultJson = JSON.parse(resultJsonStr);
				// delete resultJson.width;
				// delete resultJson.height;
				expect(resultJson).toEqual(answerJson);
				diff("answer.png", "result.png", function(result) {
					expect(result).toBe("Passed");
					mockfs.restore();
					done();
				});
			});
		});
	});
});

