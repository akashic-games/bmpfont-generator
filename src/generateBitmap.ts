import * as canvas from "canvas";
import type {
	FontRenderingOptions,
	SizeOptions,
	ResolvedSizeOptions,
	Glyph,
	ImageGlyph,
	GlyphLocation,
	GlyphLocationMap,
	GlyphSourceTable,
	CharGlyph
} from "./type";
import {
	calculateCanvasSize,
	resolveSizeOptions,
	charsToGlyphList,
	applyImageResourceTable
} from "./util";

export function generateBitmap(
	sourceTable: GlyphSourceTable<string | canvas.Image>,
	fontOptions: FontRenderingOptions,
	sizeOptions: SizeOptions
): Promise<{
		canvas: canvas.Canvas;
		map: GlyphLocationMap;
		lostChars: string[];
		resolvedSizeOptions: ResolvedSizeOptions;
	}> {
	const { charGlyphTable, lostChars, imageSourceTable } = charsToGlyphList(sourceTable, fontOptions.font, sizeOptions);
	const charGlyphList: CharGlyph[] = Object.values(charGlyphTable);
	const resolvedSizeOptions: ResolvedSizeOptions = resolveSizeOptions(charGlyphList, sizeOptions, fontOptions.font);

	let glyphSourceTable: GlyphSourceTable<Glyph>;
	if (Object.keys(imageSourceTable).length > 0) {
		glyphSourceTable = applyImageResourceTable(charGlyphTable, imageSourceTable, resolvedSizeOptions);
	} else {
		glyphSourceTable = charGlyphTable;
	}
	const glyphList: Glyph[] = Object.values(glyphSourceTable);
	const canvasSize = calculateCanvasSize(
		glyphList,
		resolvedSizeOptions.fixedWidth,
		resolvedSizeOptions.lineHeight,
		resolvedSizeOptions.margin
	);
	const cvs = canvas.createCanvas(canvasSize.width, canvasSize.height);
	const ctx = cvs.getContext("2d");
	if (!fontOptions.antialias) ctx.antialias = "none";

	const map = draw(ctx, glyphSourceTable, resolvedSizeOptions, fontOptions);
	return Promise.resolve({
		lostChars,
		resolvedSizeOptions,
		canvas: cvs,
		map
	});
}

function draw(
	ctx: canvas.CanvasRenderingContext2D,
	glyphSourceTable: GlyphSourceTable<Glyph>,
	resolvedSizeOption: ResolvedSizeOptions,
	fontOptions: FontRenderingOptions
): GlyphLocationMap {
	let drawX = resolvedSizeOption.margin;
	let drawY = resolvedSizeOption.margin;
	const map: GlyphLocationMap = {};

	Object.keys(glyphSourceTable).forEach(key => {
		const glyph = glyphSourceTable[key];
		const width = resolvedSizeOption.fixedWidth ?? glyph.width + resolvedSizeOption.margin;
		if (drawX + width > ctx.canvas.width) {
			drawX = resolvedSizeOption.margin;
			drawY += resolvedSizeOption.lineHeight + resolvedSizeOption.margin;
		}

		if (isImageGlyph(glyph)) {
			ctx.drawImage(glyph.image, drawX, drawY, glyph.width, resolvedSizeOption.lineHeight);
		} else {
			const path = glyph.glyph.getPath(
				drawX + (width / 2) - (glyph.width / 2), drawY + resolvedSizeOption.baselineHeight, resolvedSizeOption.height);
			path.fill = fontOptions.fillColor;
			path.stroke = fontOptions.strokeColor || null;
			path.strokeWidth = fontOptions.strokeWidth;
			path.draw(ctx as unknown as CanvasRenderingContext2D); // NOTE: oepntype.jsとcanvasのCanvasRenderingContext2Dが一致しないためunknownを経由する

			glyph.glyph.unicodes.forEach(unicode => {
				map[unicode] = {x: drawX, y: drawY, width, height: resolvedSizeOption.lineHeight};
			});
		}
		map[key as any] = {x: drawX, y: drawY, width, height: resolvedSizeOption.lineHeight};
		drawX += width + resolvedSizeOption.margin;
	});

	return map;
}

function isImageGlyph(glyph: Glyph): glyph is ImageGlyph {
	return !!(glyph as any).image;
}
