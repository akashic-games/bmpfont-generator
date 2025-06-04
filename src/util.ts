import type * as canvas from "canvas";
import type * as opentype from "opentype.js";
import type { SizeOptions, Glyph, ResolvedSizeOptions, CharGlyph, ImageGlyph } from "./type";

export function charsToGlyphList(
	chars: (string | canvas.Image)[],
	font: opentype.Font,
	sizeOptions: SizeOptions
): {
		charGlyphList: CharGlyph[];
		lostChars: string[];
	} {
	const lostChars: string[] = [];
	const charGlyphList: CharGlyph[] = [];

	chars.forEach(char => {
		if (typeof char !== "string") return;

		const glyph = font.stringToGlyphs(char);
		glyph.forEach((g) => {
			if (g.unicodes.length === 0) lostChars.push(char);
			const scale = 1 / (g.path.unitsPerEm ?? font.unitsPerEm) * sizeOptions.height;
			charGlyphList.push({glyph: g, width: Math.ceil((g.advanceWidth ?? 0) * scale)});
		});
	});
	return { charGlyphList, lostChars };
}

export function updateGlyphListWithImage(
	charGlyphList: CharGlyph[],
	chars: (string | canvas.Image)[],
	unitsPerEm: number,
	resolvedSizeOption: ResolvedSizeOptions
): Glyph[] {
	const descend = getMinDescend(charGlyphList, resolvedSizeOption.height + resolvedSizeOption.margin, unitsPerEm);
	const glyphList: Glyph[] = charGlyphList;

	chars.forEach(charOrImage => {
		if (typeof charOrImage !== "string") {
			const mgScale = charOrImage.width / charOrImage.height;
			const mgWidth = Math.ceil((resolvedSizeOption.baselineHeight + descend) * mgScale);
			glyphList.push({ width: mgWidth, image: charOrImage } satisfies ImageGlyph);
		}
	});
	return glyphList;
}

function getMinDescend(glyphList: CharGlyph[], height: number, defaultUnitsPerEm: number): number {
	const descend = Math.min.apply(Math, glyphList.map((g: CharGlyph) => {
		const scale = 1 / (g.glyph.path.unitsPerEm ?? defaultUnitsPerEm) * height;
		const metrics = g.glyph.getMetrics();
		return metrics.yMin * scale;
	}));
	return Math.ceil(Math.abs(descend));
}

export function resolveSizeOptions(glyphList: CharGlyph[], sizeOptions: SizeOptions, font: opentype.Font): ResolvedSizeOptions {
	const baselineHeight = sizeOptions.baselineHeight ?? getMaxBaseline(glyphList, sizeOptions.height, font.unitsPerEm);
	const descendAbs = getMinDescend(glyphList, sizeOptions.height + sizeOptions.margin, font.unitsPerEm);
	const requiredHeight = baselineHeight + descendAbs;
	const lineHeight = Math.max(requiredHeight, sizeOptions.height);
	return {
		...sizeOptions,
		baselineHeight,
		requiredHeight,
		lineHeight,
	} as ResolvedSizeOptions;
}

function getMaxBaseline(glyphList: CharGlyph[], height: number, defaultUnitsPerEm: number): number {
	return Math.ceil(Math.max.apply(Math, glyphList.map((g: CharGlyph) => {
		const scale = 1 / (g.glyph.path.unitsPerEm ?? defaultUnitsPerEm) * height;
		const metrics = g.glyph.getMetrics();
		return metrics.yMax * scale;
	})));
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
	let drawY = margin;

	glyphList.forEach((g: Glyph) => {
		if (drawX + g.width + margin >= canvasWidth) {
			drawX = margin;
			drawY += lineHeight + margin;
		}
		drawX += g.width + margin;
	});
	return drawY;
}
