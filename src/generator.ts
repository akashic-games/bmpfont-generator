import * as fs from "fs";
import * as Canvas from "canvas";
import type * as opentype from "opentype.js";
import * as util from "./util";

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
	strokeWidth: number;
	quality: number;
	margin: number;
}

export function generateBitmapFont(font: opentype.Font, outputPath: string, cliArgs: CLIArgs, callback: (err: any) => void): void {
	const lostChars: string[] = [];
	const glyphList: util.Glyph[] = [];
	Array.from(cliArgs.list).forEach((char: string) => {
		const glyph = font.stringToGlyphs(char);
		glyph.forEach((g) => {
			if (g.unicodes.length === 0) lostChars.push(char);
			const scale = 1 / (g.path.unitsPerEm ?? font.unitsPerEm) * cliArgs.height;
			glyphList.push({glyph: g, width: Math.ceil(g.advanceWidth * scale)});
		});
	});

	if (isNaN(cliArgs.baseline)) {
		cliArgs.baseline = util.getMaxBaseline(glyphList, cliArgs.height, font.unitsPerEm);
	}

	if (isNaN(cliArgs.margin)) cliArgs.margin = 1;

	// missingGlyphをglyphListに追加しつつ、ベースライン値を更新
	if (cliArgs.missingGlyph === undefined || typeof cliArgs.missingGlyph === "string") {
		let g = font.glyphs.get(0);
		if (cliArgs.missingGlyph)
			g = font.charToGlyph(cliArgs.missingGlyph);
		const scale = 1 / (g.path.unitsPerEm ?? font.unitsPerEm) * cliArgs.height;
		glyphList.push({glyph: g, width: Math.ceil(g.advanceWidth * scale)});
		if (cliArgs.baseline < g.yMax * scale)
			cliArgs.baseline = Math.ceil(g.yMax * scale);
	}

	const descend = util.getMinDescend(glyphList, cliArgs.height + cliArgs.margin, font.unitsPerEm);
	const adjustedHeight = util.getAdjustedHeight(descend, cliArgs.height + cliArgs.margin, cliArgs.baseline);

	// missingGlyphが画像の場合の処理
	if (typeof cliArgs.missingGlyph !== "string" && cliArgs.missingGlyph !== undefined) {
		const mgScale = cliArgs.missingGlyph.width / cliArgs.missingGlyph.height;
		const mgWidth = Math.ceil((cliArgs.baseline + descend) * mgScale);
		glyphList.push({glyph: undefined, width: mgWidth});
	}

	// 必要なcanvasのサイズを算出する
	let canvasSize: {width: number; height: number} = undefined;
	if (cliArgs.width === undefined) {
		canvasSize = util.calculateCanvasSizeProportional(
			cliArgs.list,
			glyphList,
			adjustedHeight,
			cliArgs.baseline + descend,
			cliArgs.margin
		);
	} else {
		canvasSize = util.calculateCanvasSize(cliArgs.list, cliArgs.width, adjustedHeight, cliArgs.margin);
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

	const canvas = Canvas.createCanvas(canvasSize.width, canvasSize.height);
	const ctx = canvas.getContext("2d");

	if (cliArgs.noAntiAlias)
		ctx.antialias = "none";

	// 描画
	const drawResult = draw(ctx, font, glyphList, descend, cliArgs);

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

export function draw(ctx: any, _font: opentype.Font, glyphList: util.Glyph[], descend: number, cliArgs: CLIArgs): {
	map: {[key: number]: {x: number; y: number}};
	missingGlyph: {x: number; y: number; width: number; height: number };
} {
	const dict: {[key: number]: {x: number; y: number; width?: number; height?: number}} = {};

	let drawX = cliArgs.margin;
	let drawY = cliArgs.margin;
	const drawHeight = cliArgs.baseline + descend;
	let mg: {x: number; y: number; width: number; height: number } = undefined;

	glyphList.forEach((g: util.Glyph, index: number) => {
		if (g.glyph === undefined) {
			if (cliArgs.width !== undefined)
				g.width = cliArgs.width;
			ctx.drawImage(cliArgs.missingGlyph, drawX, drawY, g.width, drawHeight);
			mg = {x: drawX, y: drawY, width: g.width, height: drawHeight};
		} else {
			let drawWidth = cliArgs.width;
			if (drawWidth === undefined) {
				drawWidth = g.width + cliArgs.margin;
			}
			if (drawX + drawWidth > ctx.canvas.width) {
				drawX = cliArgs.margin;
				drawY += drawHeight + cliArgs.margin;
			}
			const path = g.glyph.getPath(drawX + (drawWidth / 2) - (g.width / 2), drawY + cliArgs.baseline, cliArgs.height);
			path.fill = cliArgs.fill;
			path.stroke = cliArgs.stroke;
			path.strokeWidth = cliArgs.strokeWidth;
			path.draw(ctx);
			if (index === glyphList.length - 1) {
				mg = {x: drawX, y: drawY, width: drawWidth, height: drawHeight};
			} else {
				g.glyph.unicodes.forEach((unicode) => {
					dict[unicode] = {x: drawX, y: drawY, width: drawWidth, height: drawHeight};
				});
			}
			drawX += drawWidth + cliArgs.margin;
		}
	});

	return {map: dict, missingGlyph: mg};
}
