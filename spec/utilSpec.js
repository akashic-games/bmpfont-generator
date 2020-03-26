var util = require("../lib/util");
var path = require("path");
var fs = require("fs");
var mockfs = require("mock-fs");
var opentype = require("opentype.js");
var pngparse = require("pngparse");
var Canvas = require("canvas");
var Image = Canvas.Image;

describe("util.calculateCanvasSize", function () {
	it("normal scenario", function () {
		expect(util.calculateCanvasSize("", 16, 13, 0, 1)).toEqual({width:16, height:16});
		expect(util.calculateCanvasSize("a", 16, 13, 0, 1)).toEqual({width:32, height:16});
		expect(util.calculateCanvasSize("ab", 16, 13, 0, 1)).toEqual({width:32, height:28});
		expect(util.calculateCanvasSize("abc", 16, 13, 0, 1)).toEqual({width:32, height:28});
		expect(util.calculateCanvasSize("abcd", 16, 13, 0, 1)).toEqual({width:64, height:28});
		expect(util.calculateCanvasSize("abcde", 16, 13, 0, 1)).toEqual({width:64, height:28});
		expect(util.calculateCanvasSize("abcdef", 16, 13, 0, 1)).toEqual({width:64, height:28});
		expect(util.calculateCanvasSize("abcdefg", 16, 13, 0, 1)).toEqual({width:64, height:28});
		expect(util.calculateCanvasSize("abcdefgh", 16, 13, 0, 1)).toEqual({width:64, height:40});
	});

	it("exception scenario", function () {
		expect(util.calculateCanvasSize("", 0, 0, 0, 1)).toEqual({width:-1, height:-1});
		expect(util.calculateCanvasSize("", -10, -10, 0, 1)).toEqual({width:-1, height:-1});
	});
});

describe("util.calculateCanvasSizeWithoutWidth", function () {
	it("normal scenario", function (done) {
		var height = 20;
		opentype.load(path.resolve(__dirname, "fixtures/mplus-1c-light.ttf"), function(err, font) {
			expect(err).toBeNull();
			var textList = ["a", "ab", "abc", "abcd", "abcde", "abcdef", "abcdefg", "abcdefgh", "abcdefghi"];
			// var answerList = [{width:32,height:24},{width:32,height:44},{width:32,height:44},{width:64,height:24},{width:64,height:44},{width:64,height:44},{width:64,height:48},{width:64,height:48},{width:64,height:48}]
			var answerList = [{width:32,height:24},{width:32,height:44},{width:64,height:24},{width:64,height:44},{width:64,height:44},{width:64,height:44},{width:64,height:44},{width:64,height:64},{width:64,height:44}]
			textList.forEach(function(text, index) {
				var glyphList = font.stringToGlyphs(text).map(function(g) {
					var scale = 1 / g.font.unitsPerEm * height;
					return {glyph: g, width: Math.ceil(g.advanceWidth * scale)};
				});

				var baseline = Math.ceil(Math.max.apply(Math, glyphList.map(function(g) {
					var scale = 1 / g.glyph.font.unitsPerEm * height;
					return g.glyph.yMax * scale;
				})));

				var descend = Math.min.apply(Math, glyphList.map(function(g) {
					var scale = 1 / g.glyph.font.unitsPerEm * height;
					return g.glyph.yMin * scale;
				}));
				descend = Math.ceil(Math.abs(descend));
				var extraDescend = Math.ceil(descend - (height - baseline));
				var adjustedHeight = height;
				if (extraDescend > 0) {
					adjustedHeight += extraDescend;
				}
				expect(util.calculateCanvasSizeProportional(text, glyphList, adjustedHeight, baseline + descend, 1)).toEqual(answerList[index]);
			});
			done();
		});
	});
});

describe("util.outputBitmapFont", function() {
	it("normal scenario", function(done) {
		var canvas = Canvas.createCanvas(1, 1);
		var ctx = canvas.getContext("2d");

		var DUMMY_1x1_PNG_DATA = fs.readFileSync(path.resolve(__dirname, "fixtures/dummy1x1.png"));
		var img = new Image;
		img.src = DUMMY_1x1_PNG_DATA;
		ctx.drawImage(img, 0, 0);

		mockfs({});
		util.outputBitmapFont("dummy.png", canvas, null, function() {
			pngparse.parseFile("dummy.png", function(err, data) {
				expect(err).toBeUndefined();
				expect(data.width).toBe(1);
				expect(data.height).toBe(1);
				expect(data.data[0]).toBe(0);
				expect(data.data[1]).toBe(0);
				expect(data.data[2]).toBe(0);
				mockfs.restore();
				done();
			});
		});
	});
});

describe("util.createJson", function() {
	it("normal scenario", function() {
		var dummyMap = {"foo": "bar"};
		var dummyMissingGlyph = {x: 10, y: 20};
		var dummyWidth = 100;
		var dummyHeight = 200;
		var result = util.createJson(dummyMap, dummyMissingGlyph, dummyWidth, dummyHeight);
		var answer = JSON.stringify({map: dummyMap, missingGlyph: dummyMissingGlyph, width: dummyWidth, height: dummyHeight});
		expect(result).toEqual(answer);
	});
});

describe("util.getMaxBaseline", function() {
	it("normal scenario", function() {
		var glyphList = [
			{glyph: {font: {unitsPerEm: 10}, yMax: 10}},
			{glyph: {font: {unitsPerEm: 20}, yMax: 10}}
		];
		expect(util.getMaxBaseline(glyphList, 10)).toBe(10);

		glyphList = [
			{glyph: {font: {unitsPerEm: 10}, yMax: 10}},
			{glyph: {font: {unitsPerEm: 5}, yMax: 10}}
		];
		expect(util.getMaxBaseline(glyphList, 10)).toBe(20);
	});
});

describe("util.getMinDescend", function() {
	it("normal scenario", function() {
		var glyphList = [
			{glyph: {font: {unitsPerEm: 10}, yMin: 10}},
			{glyph: {font: {unitsPerEm: 20}, yMin: 10}}
		];
		expect(util.getMinDescend(glyphList, 10)).toBe(5);

		glyphList = [
			{glyph: {font: {unitsPerEm: 10}, yMin: 10}},
			{glyph: {font: {unitsPerEm: 5}, yMin: 10}}
		];
		expect(util.getMinDescend(glyphList, 10)).toBe(10);
	});
});

describe("util.getAdjustedHeight", function() {
	it("normal scenario", function() {
		expect(util.getAdjustedHeight(30, 20, 10)).toBe(40);
		expect(util.getAdjustedHeight(20, 20, 10)).toBe(30);
	});
});

