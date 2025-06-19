import type * as canvas from "canvas";
import type * as opentype from "opentype.js";
import type { SizeOptions, Glyph, ResolvedSizeOptions, CharGlyph, ImageGlyph, GlyphSourceTable, BitmapResourceTable } from "./type";

export function charsToGlyphList(
	sourceTable: GlyphSourceTable<string | canvas.Image>,
	font: opentype.Font,
	sizeOptions: SizeOptions
): {
		// charGlyphList: CharGlyph[];
		charResourceTable: BitmapResourceTable<CharGlyph>;
		lostChars: string[];
		imageSourceTable: GlyphSourceTable<canvas.Image>;
	} {
	
	// const charGlyphList: CharGlyph[] = [];
	const charResourceTable: BitmapResourceTable<CharGlyph> = {};
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
			charResourceTable[key] = {glyph: g, width: Math.ceil((g.advanceWidth ?? 0) * scale)};
			// charGlyphList.push({glyph: g, width: Math.ceil((g.advanceWidth ?? 0) * scale)});
		});
	});
	return { charResourceTable, lostChars, imageSourceTable };
}

function updateGlyphListWithImage(
	charGlyphList: CharGlyph[],
	chars: (string | canvas.Image)[],
	unitsPerEm: number,
	resolvedSizeOptions: ResolvedSizeOptions
): Glyph[] {
	const glyphList: Glyph[] = charGlyphList;

	chars.forEach(charOrImage => {
		if (typeof charOrImage !== "string") {
			const mgScale = charOrImage.width / charOrImage.height;
			const mgWidth = Math.ceil((resolvedSizeOptions.baselineHeight + resolvedSizeOptions.descend) * mgScale);
			glyphList.push({ width: mgWidth, image: charOrImage } satisfies ImageGlyph);
		}
	});
	return glyphList;
}

export function applyImageResourceTable(
	charResourceTable: BitmapResourceTable<CharGlyph>,
	imageSourceTable:  GlyphSourceTable<canvas.Image>,
	resolvedSizeOptions: ResolvedSizeOptions
): BitmapResourceTable<Glyph> {
	const bitmapResourceTable: BitmapResourceTable<Glyph> = charResourceTable; 
	Object.keys(imageSourceTable).forEach(key => {
		const img = imageSourceTable[key];
		const mgScale = img.width / img.height;
		const mgWidth = Math.ceil((resolvedSizeOptions.baselineHeight + resolvedSizeOptions.descend) * mgScale);
		bitmapResourceTable[key] = { width: mgWidth, image: img } satisfies ImageGlyph;
	});
	return bitmapResourceTable;
}

export function resolveSizeOptions(glyphList: CharGlyph[], sizeOptions: SizeOptions, font: opentype.Font): ResolvedSizeOptions {
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

export function calculateCanvasSize(
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
