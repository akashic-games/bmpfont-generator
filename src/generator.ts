import util = require("./util");
import fs = require("fs");
import opentype = require("opentype.js");
import Canvas = require("canvas");

export interface CLIArgs {
	list: string;
	width: number;
	height: number;
	missingGlyph: any;
	baseline: number;
	noAntiAlias: boolean;
	json: string;
	fill: string;
	stroke: string;
	quality: number;
}

export function generateBitmapFont(font: opentype.Font, outputPath: string, cliArgs: CLIArgs, callback: (err: any) => void): void {
	var lostChars: string[] = [];
	var glyphList: util.Glyph[] = [];
	Array.from(cliArgs.list).forEach((char: string) => {
		var glyph = font.stringToGlyphs(char);
		glyph.forEach((g) => {
			if (g.unicodes.length === 0) lostChars.push(char);
			var scale = 1 / g.font.unitsPerEm * cliArgs.height;
			glyphList.push({glyph: g, width: Math.ceil(g.advanceWidth * scale)});
		});
	});

	if (isNaN(cliArgs.baseline)) {
		cliArgs.baseline = util.getMaxBaseline(glyphList, cliArgs.height);
	}

	// missingGlyphをglyphListに追加しつつ、ベースライン値を更新
	if (cliArgs.missingGlyph === undefined || typeof cliArgs.missingGlyph === "string") {
		var g = font.glyphs[0];
		if (cliArgs.missingGlyph)
			g = font.charToGlyph(cliArgs.missingGlyph);
		var scale = 1 / g.font.unitsPerEm * cliArgs.height;
		glyphList.push({glyph: g, width: Math.ceil(g.advanceWidth * scale)});
		if (cliArgs.baseline < g.yMax * scale)
			cliArgs.baseline = Math.ceil(g.yMax * scale);
	}

	var descend = util.getMinDescend(glyphList, cliArgs.height);
	var adjustedHeight = util.getAdjustedHeight(descend, cliArgs.height, cliArgs.baseline);

	// missingGlyphが画像の場合の処理
	if (typeof cliArgs.missingGlyph !== "string" && cliArgs.missingGlyph !== undefined) {
		var mgScale = cliArgs.missingGlyph.width / cliArgs.missingGlyph.height;
		var mgWidth = Math.ceil((cliArgs.baseline + descend) * mgScale);
		glyphList.push({glyph: undefined, width: mgWidth});
	}

	// 必要なcanvasのサイズを算出する
	var canvasSize: {width: number; height: number} = undefined;
	if (cliArgs.width === undefined) {
		canvasSize = util.calculateCanvasSizeProportional(cliArgs.list, glyphList, adjustedHeight, cliArgs.baseline + descend);
	} else {
		canvasSize = util.calculateCanvasSize(cliArgs.list, cliArgs.width, adjustedHeight);
	}

	// 作成されたcanvasのサイズが正当なものか確認
	if (canvasSize.width > 8192 || canvasSize.height > 8192) {
		callback("list is too long");
		return;
	}
	if (canvasSize.width === -1 || canvasSize.height === -1) {
		callback("char size is too small");
		return;
	}

	var canvas = new Canvas(canvasSize.width, canvasSize.height);
	var ctx = canvas.getContext("2d");

	if (cliArgs.noAntiAlias)
		ctx.antialias = "none";

	// 描画
	var drawResult = draw(ctx, font, glyphList, descend, cliArgs);

	// 各ファイルの出力
	if (cliArgs.json) {
		fs.writeFileSync(cliArgs.json, util.createJson(drawResult.map, drawResult.missingGlyph, cliArgs.width, adjustedHeight));
	}

	// 描画できなかった文字を通知
	if (lostChars.length > 0) {
		console.log(
			"WARN: Cannot find " + lostChars.join(",") + " from the given font. " +
			"Generated image does not include these characters. " +
			"Try Using other font or characters."
		);
	}

	util.outputBitmapFont(outputPath, canvas, cliArgs.quality, callback);
}

export function draw(ctx: any, font: opentype.Font, glyphList: util.Glyph[], descend: number, cliArgs: CLIArgs): {
	map: {[key: number]: {x: number; y: number}};
	missingGlyph: {x: number; y: number; width: number; height: number; }
} {
	var dict: {[key: number]: {x: number; y: number, width?: number, height?: number}} = {};

	var drawX = 0;
	var drawY = 0;
	var drawHeight = cliArgs.baseline + descend;
	var mg: {x: number; y: number; width: number; height: number; } = undefined;

	glyphList.forEach((g: util.Glyph, index: number) => {
		if (g.glyph === undefined) {
			if (cliArgs.width !== undefined)
				g.width = cliArgs.width;
			ctx.drawImage(cliArgs.missingGlyph, drawX, drawY, g.width, drawHeight);
			mg = {x: drawX, y: drawY, width: g.width, height: drawHeight};
		} else {
			var drawWidth = cliArgs.width;
			if (drawWidth === undefined) {
				drawWidth = g.width;
			}
			if (drawX + drawWidth > ctx.canvas.width) {
				drawX = 0;
				drawY += drawHeight;
			}
			var path = g.glyph.getPath(drawX + (drawWidth / 2) - (g.width / 2), drawY + cliArgs.baseline, cliArgs.height);
			path.fill = cliArgs.fill;
			path.stroke = cliArgs.stroke;
			path.draw(ctx);
			if (index === glyphList.length - 1) {
				mg = {x: drawX, y: drawY, width: drawWidth, height: drawHeight};
			} else {
				g.glyph.unicodes.forEach((unicode) => {
					dict[unicode] = {x: drawX, y: drawY, width: drawWidth, height: drawHeight};
				});
			}
			drawX += drawWidth;
		}
	});

	return {map: dict, missingGlyph: mg};
}
