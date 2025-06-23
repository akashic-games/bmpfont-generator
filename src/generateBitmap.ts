import * as canvas from "canvas";
import type {
	FontRenderingOptions,
	SizeOptions,
	ResolvedSizeOptions,
	Glyph,
	ImageGlyph,
	GlyphLocationMap,
	GlyphSourceTable,
	CharGlyph
} from "./type";

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

function charsToGlyphList(
	sourceTable: GlyphSourceTable<string | canvas.Image>,
	font: opentype.Font,
	sizeOptions: SizeOptions
): {
		charGlyphTable: GlyphSourceTable<CharGlyph>;
		lostChars: string[];
		imageSourceTable: GlyphSourceTable<canvas.Image>;
	} {
	
	const charGlyphTable: GlyphSourceTable<CharGlyph> = {};
	const lostChars: string[] = [];
	const imageSourceTable: GlyphSourceTable<canvas.Image> = {};
	Object.keys(sourceTable).forEach(key => {
		const char = sourceTable[key];
		if (typeof char !== "string") {
			imageSourceTable[key] = char;
			return;
		};

		const glyph = font.stringToGlyphs(char);
		glyph.forEach((g) => {
			if (g.unicodes.length === 0) lostChars.push(char);
			const scale = 1 / (g.path.unitsPerEm ?? font.unitsPerEm) * sizeOptions.height;
			charGlyphTable[key] = {glyph: g, width: Math.ceil((g.advanceWidth ?? 0) * scale)};
		});
	});
	return { charGlyphTable, lostChars, imageSourceTable };
}

function applyImageResourceTable(
	charGlyphTable: GlyphSourceTable<CharGlyph>,
	imageSourceTable:  GlyphSourceTable<canvas.Image>,
	resolvedSizeOptions: ResolvedSizeOptions
): GlyphSourceTable<Glyph> {
	const glyphSsourceTable: GlyphSourceTable<Glyph> = charGlyphTable;
	Object.keys(imageSourceTable).forEach(key => {
		const img = imageSourceTable[key];
		const mgScale = img.width / img.height;
		const mgWidth = Math.ceil((resolvedSizeOptions.baselineHeight + resolvedSizeOptions.descend) * mgScale);
		glyphSsourceTable[key] = { width: mgWidth, image: img } satisfies ImageGlyph;
	});
	return glyphSsourceTable;
}

function resolveSizeOptions(glyphList: CharGlyph[], sizeOptions: SizeOptions, font: opentype.Font): ResolvedSizeOptions {
	const metrics = calcMetrics(glyphList, sizeOptions.height, font.unitsPerEm);
	const baselineHeight = metrics.baseline;
	const descend = metrics.descend;
	const requiredHeight = baselineHeight + descend;
	const lineHeight = Math.max(requiredHeight, sizeOptions.height);
	return {
		...sizeOptions,
		baselineHeight,
		requiredHeight,
		lineHeight,
		descend
	} as ResolvedSizeOptions;
}

function calcMetrics(glyphList: CharGlyph[], height: number, defaultUnitsPerEm: number): {descend: number, baseline: number} {
	const metrics = glyphList.reduce<{descend: number, baseline: number}>((prev, g: CharGlyph, index, arr) => {
		const scale = 1 / (g.glyph.path.unitsPerEm ?? defaultUnitsPerEm) * height;
		const metrics = g.glyph.getMetrics();
		const descend = metrics.yMin * scale;
		const baseline = metrics.yMax * scale;

		prev.descend = !prev.descend ? descend : Math.min(prev.descend, descend);
		prev.baseline = !prev.baseline ? baseline : Math.max(prev.baseline, baseline);
		return prev;
	}, {descend: undefined, baseline: undefined} as any);
	return metrics;
}

function calculateCanvasSize(
	glyphList: Glyph[], charWidth: number | undefined, lineHeight: number, margin: number): {width: number; height: number} {
	const width = charWidth ?? glyphList.reduce((acc, g) => acc + g.width + margin, 0) / glyphList.length;

	if (width <= 0 || lineHeight <= 0) return {width: -1, height: -1};

	const glyphCount = glyphList.length + 1;
	const MULTIPLE_OF_CANVAS_HEIGHT = 4;

	let canvasSquareSideSize = 1;

	const advanceWidth = width + margin;
	const advanceHeight = lineHeight + margin;

	// 文字が入りきる正方形の辺の長さを求める
	for (; (canvasSquareSideSize / advanceWidth) * (canvasSquareSideSize / advanceHeight) < glyphCount; canvasSquareSideSize *= 2);
	const canvasWidth = canvasSquareSideSize;
	// 正方形じゃない場合があるのでcanvasSquareSideSizeは使えない
	const tmpCanvasHeight = Math.ceil(glyphCount / Math.floor(canvasWidth / advanceWidth)) * advanceHeight;
	const canvasHeight = Math.ceil(tmpCanvasHeight / MULTIPLE_OF_CANVAS_HEIGHT) * MULTIPLE_OF_CANVAS_HEIGHT;

	let height = canvasHeight;
	// widthAverageから導出した場合、サイズが不足する場合があるためGlyphを並べた際に必要なheightを導出する
	if (!charWidth) height = requiredCanvasHeight(glyphList, canvasWidth, lineHeight, margin);

	return {width: canvasWidth, height};
}

function requiredCanvasHeight(glyphList: Glyph[], canvasWidth: number, lineHeight: number, margin: number): number {
	let drawX = margin;
	let drawY = margin + lineHeight;

	glyphList.forEach((g: Glyph) => {
		if (drawX + g.width + margin >= canvasWidth) {
			drawX = margin;
			drawY += lineHeight + margin;
		}
		drawX += g.width + margin;
	});
	return drawY;
}
