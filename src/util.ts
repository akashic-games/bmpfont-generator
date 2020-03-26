import opentype = require("opentype.js");
import fs = require("fs");
import PngQuant = require("pngquant");

// canvas.heightを値の倍数にする
const MULTIPLE_OF_CANVAS_HEIGHT = 4;

export interface Glyph {
	glyph: opentype.Glyph;
	width: number;
}

export function calculateCanvasSize(text: string, charWidth: number, charHeight: number, margin: number): {width: number; height: number} {
	if (charWidth <= 0 || charHeight <= 0) {
		return {width: -1, height: -1};
	}
	// +1しているのはmissing glyph用
	var textSize = text.split("").length + 1;
	var canvasSquareSideSize = 1;

	const advanceWidth = charWidth + margin;
	const advanceHeight = charHeight + margin;
	// 文字が入りきる正方形の辺の長さを求める
	for (; (canvasSquareSideSize / advanceWidth) * (canvasSquareSideSize / advanceHeight) < textSize; canvasSquareSideSize *= 2);
	var canvasWidth = canvasSquareSideSize;
	// 正方形じゃない場合があるのでcanvasSquareSideSizeは使えない
	var tmpCanvasHeight = Math.ceil(textSize / Math.floor(canvasWidth / advanceWidth)) * advanceHeight;
	const canvasHeight = Math.ceil(tmpCanvasHeight / MULTIPLE_OF_CANVAS_HEIGHT) * MULTIPLE_OF_CANVAS_HEIGHT;
	return {width: canvasWidth, height: canvasHeight};
}

export function canGoIn(canvasSize: {width: number; height: number},
                        glyphList: Glyph[],
                        charHeight: number,
                        margin: number): boolean {
	var drawX = margin;
	var drawY = margin;

	glyphList.forEach((g: Glyph) => {
		if (drawX + g.width > canvasSize.width) {
			drawX = margin;
			drawY += charHeight + margin;
		}
		drawX += g.width + margin;
	});
	return drawY + charHeight < canvasSize.height;
}

export function calculateCanvasSizeProportional(text: string,
                                                glyphList: Glyph[],
                                                height: number,
                                                charHeight: number,
                                                margin: number ): {width: number; height: number} {
	var widthAverage = 0;
	var widthMax = 0;
	glyphList.forEach((g: Glyph) => {
		if (g.width > widthMax)
			widthMax = g.width + margin;
		widthAverage += g.width  + margin;
	});
	widthAverage /= glyphList.length;

	if (height <= 0) {
		return {width: -1, height: -1};
	}
	// 平均値を利用して目安となるサイズを計算
	var canvasSize = calculateCanvasSize(text, widthAverage, height, margin);
	// 文字が入りきるまで縦幅を増やす
	while (!canGoIn(canvasSize, glyphList, charHeight, margin)) {
		canvasSize.height += MULTIPLE_OF_CANVAS_HEIGHT;
	}
	return canvasSize;
}

export function outputBitmapFont(outputPath: string, canvas: any, quality: number, callback?: (err?: any) => void): void {
	if (quality === null) {
		canvas.toBuffer((err: any, buf: any) => {
			fs.writeFileSync(outputPath, buf);
			if (callback) {
				callback(err);
			}
		});
	} else {
		var pngQuanter = new PngQuant(["--quality=" + quality, 256]);
		var chunks: Buffer[] = [];
		pngQuanter
			.on("data", (chunk: Buffer) => {
				chunks.push(chunk);
			})
			.on("end", () => {
				fs.writeFileSync(outputPath, Buffer.concat(chunks));
				if (callback)
					callback();
			})
			.on("error", () => {
				if (callback)
					callback("error at pngquant");
			});
		canvas.pngStream().pipe(pngQuanter);
	}
}

export function createJson(map: any, missingGlyph: {x: number; y: number}, width: number, height: number): string {
	return JSON.stringify({map: map, missingGlyph: missingGlyph, width: width, height: height});
}

export function getMaxBaseline(glyphList: Glyph[], height: number): number {
	return Math.ceil(Math.max.apply(Math, glyphList.map((g: Glyph) => {
		var scale = 1 / g.glyph.font.unitsPerEm * height;
		return g.glyph.yMax * scale;
	})));
}

export function getMinDescend(glyphList: Glyph[], height: number): number {
	var descend = Math.min.apply(Math, glyphList.map((g: Glyph) => {
		var scale = 1 / g.glyph.font.unitsPerEm * height;
		return g.glyph.yMin * scale;
	}));
	return Math.ceil(Math.abs(descend));
}

export function getAdjustedHeight(descend: number, height: number, baseline: number): number {
	var extraDescend = Math.ceil(descend - (height - baseline));
	var adjustedHeight = height;
	if (extraDescend > 0) {
		adjustedHeight += extraDescend;
	}
	return adjustedHeight;
}
