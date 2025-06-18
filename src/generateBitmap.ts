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
	CharGlyph,
	BitmapResourceTable
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
	const { charResourceTable, lostChars, imageSourceTable } = charsToGlyphList(sourceTable, fontOptions.font, sizeOptions);
	const charGlyphList: CharGlyph[] = Object.values(charResourceTable);
	const resolvedSizeOptions: ResolvedSizeOptions = resolveSizeOptions(charGlyphList, sizeOptions, fontOptions.font);

	let bitmapResourceTable: BitmapResourceTable<Glyph>;

	if (Object.keys(imageSourceTable).length > 0) {
		// glyphList = updateGlyphListWithImage(charGlyphList, chars, fontOptions.font.unitsPerEm, resolvedSizeOptions);
		bitmapResourceTable = applyImageResourceTable(charResourceTable, imageSourceTable, resolvedSizeOptions);
	} else {
		// glyphList = charGlyphList;
		bitmapResourceTable = charResourceTable;
	}
	let glyphList: Glyph[] = Object.values(bitmapResourceTable);

	const canvasSize = calculateCanvasSize(
		glyphList,
		resolvedSizeOptions.fixedWidth,
		resolvedSizeOptions.lineHeight,
		resolvedSizeOptions.margin
	);
	const cvs = canvas.createCanvas(canvasSize.width, canvasSize.height);
	const ctx = cvs.getContext("2d");
	if (!fontOptions.antialias) ctx.antialias = "none";

	const map = draw(ctx, bitmapResourceTable, resolvedSizeOptions, fontOptions);

	return Promise.resolve({
		lostChars,
		resolvedSizeOptions,
		canvas: cvs,
		map
	});
}

function draw(
	ctx: canvas.CanvasRenderingContext2D,
	// glyphList: Glyph[],
	bitmapResourceTable: BitmapResourceTable<Glyph>,
	resolvedSizeOption: ResolvedSizeOptions,
	fontOptions: FontRenderingOptions
): GlyphLocationMap {
	let drawX = resolvedSizeOption.margin;
	let drawY = resolvedSizeOption.margin;
	const map: GlyphLocationMap = {};

	Object.keys(bitmapResourceTable).forEach(key => {
		const glyph = bitmapResourceTable[key];
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

			map[key as any] = {x: drawX, y: drawY, width, height: resolvedSizeOption.lineHeight};
			glyph.glyph.unicodes.forEach(unicode => {
				map[unicode] = {x: drawX, y: drawY, width, height: resolvedSizeOption.lineHeight};
			});
		}
		drawX += width + resolvedSizeOption.margin;
	});

	// NOTE: missingGlyphが末尾でない仕様が許されるか？
	return map;
}

function isImageGlyph(glyph: Glyph): glyph is ImageGlyph {
	return !!(glyph as any).image;
}
