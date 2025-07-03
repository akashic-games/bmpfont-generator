import * as canvas from "canvas";
import type {
	FontRenderingOptions,
	SizeOptions,
	ResolvedSizeOptions,
	GlyphLocationMap,
	BitmapFontEntryTable,
	GlyphRenderable,
	Renderable,
	ImageRenderable,
	RenderableTable,
	ImageBitmapFontEntryTable,
	GlyphRenderableTable,
} from "./type";

export function generateBitmapFont(
	entryTable: BitmapFontEntryTable,
	fontOptions: FontRenderingOptions,
	sizeOptions: SizeOptions
): Promise<{
		canvas: canvas.Canvas;
		map: GlyphLocationMap;
		lostChars: string[];
		resolvedSizeOptions: ResolvedSizeOptions;
	}> {
	const { glyphRenderableTable, lostChars, imageEntryTable } = collectGlyphRenderables(entryTable, fontOptions.font, sizeOptions);
	const resolvedSizeOptions: ResolvedSizeOptions = resolveSizeOptions(glyphRenderableTable, sizeOptions, fontOptions.font);

	let renderableTable: RenderableTable;
	if (Object.keys(imageEntryTable).length > 0) {
		renderableTable = createAndInsertImageRenderableTable(glyphRenderableTable, imageEntryTable, resolvedSizeOptions);
	} else {
		renderableTable = glyphRenderableTable;
	}
	const renderableList: Renderable[] = Object.values(renderableTable);
	const canvasSize = calculateCanvasSize(
		renderableList,
		resolvedSizeOptions.fixedWidth,
		resolvedSizeOptions.lineHeight,
		resolvedSizeOptions.margin
	);
	const cvs = canvas.createCanvas(canvasSize.width, canvasSize.height);
	const ctx = cvs.getContext("2d");
	if (!fontOptions.antialias) ctx.antialias = "none";

	const map = draw(ctx, renderableTable, resolvedSizeOptions, fontOptions);
	return Promise.resolve({
		lostChars,
		resolvedSizeOptions,
		canvas: cvs,
		map
	});
}

function draw(
	ctx: canvas.CanvasRenderingContext2D,
	renderableTable: RenderableTable,
	resolvedSizeOption: ResolvedSizeOptions,
	fontOptions: FontRenderingOptions
): GlyphLocationMap {
	let drawX = resolvedSizeOption.margin;
	let drawY = resolvedSizeOption.margin;
	const map: GlyphLocationMap = {};

	Object.keys(renderableTable).forEach(key => {
		const glyph = renderableTable[key];
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

			// NOTE: そのフォントにおけるグリフが対応するunicodesがkeyの値以外にも存在する可能性がある。
			// 過去のビットマップフォントとの互換性も考慮し、unicodesもmapに含める。
			glyph.glyph.unicodes.forEach(unicode => {
				map[unicode] = {x: drawX, y: drawY, width, height: resolvedSizeOption.lineHeight};
			});
		}
		map[key] = {x: drawX, y: drawY, width, height: resolvedSizeOption.lineHeight};
		drawX += width + resolvedSizeOption.margin;
	});

	return map;
}

function isImageGlyph(glyph: Renderable): glyph is ImageRenderable {
	return !!(glyph as any).image;
}

function collectGlyphRenderables(
	entryTable: BitmapFontEntryTable,
	font: opentype.Font,
	sizeOptions: SizeOptions
): {
	glyphRenderableTable: GlyphRenderableTable;
	lostChars: string[];
	imageEntryTable: ImageBitmapFontEntryTable;
} {
	const glyphRenderableTable: GlyphRenderableTable = {};
	const lostChars: string[] = [];
	const imageEntryTable: ImageBitmapFontEntryTable = {};
	Object.keys(entryTable).forEach(key => {
		const char = entryTable[key];
		if (typeof char !== "string") {
			imageEntryTable[key] = char;
			return;
		};

		const glyph = font.stringToGlyphs(char);
		glyph.forEach((g) => {
			if (g.unicodes.length === 0) lostChars.push(char);
			const scale = 1 / (g.path.unitsPerEm ?? font.unitsPerEm) * sizeOptions.height;
			glyphRenderableTable[key] = {glyph: g, width: Math.ceil((g.advanceWidth ?? 0) * scale)};
		});
	});
	return { glyphRenderableTable, lostChars, imageEntryTable };
}

function createAndInsertImageRenderableTable(
	glyphRenderableTable: GlyphRenderableTable,
	imageEntryTable:  ImageBitmapFontEntryTable,
	resolvedSizeOptions: ResolvedSizeOptions
): RenderableTable {
	const renderableTable: RenderableTable = glyphRenderableTable;
	Object.keys(imageEntryTable).forEach(key => {
		const img = imageEntryTable[key];
		const mgScale = img.width / img.height;
		const mgWidth = Math.ceil((resolvedSizeOptions.baselineHeight + resolvedSizeOptions.descend) * mgScale);
		renderableTable[key] = { width: mgWidth, image: img } satisfies ImageRenderable;
	});
	return renderableTable;
}

function resolveSizeOptions(glyphRenderableTable: GlyphRenderableTable, sizeOptions: SizeOptions, font: opentype.Font): ResolvedSizeOptions {
	if (Object.keys(glyphRenderableTable).length === 0) throw new Error("List has no Glyph");
	const metrics = Object.values(glyphRenderableTable).reduce<{descend: number, baseline: number}>((prev, g: GlyphRenderable) => {
		const scale = 1 / (g.glyph.path.unitsPerEm ?? font.unitsPerEm) * sizeOptions.height;
		const metrics = g.glyph.getMetrics();
		const descend = metrics.yMin * scale;
		const baseline = metrics.yMax * scale;

		prev.descend = Math.min(prev.descend, descend);
		prev.baseline = Math.max(prev.baseline, baseline);
		return prev;
	}, { descend: Infinity, baseline: -Infinity });

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

function calculateCanvasSize(
	renderableList: Renderable[], charWidth: number | undefined, lineHeight: number, margin: number): {width: number; height: number} {
	const width = charWidth ?? renderableList.reduce((acc, g) => acc + g.width + margin, 0) / renderableList.length;

	if (width <= 0 || lineHeight <= 0) return {width: -1, height: -1};

	const glyphCount = renderableList.length + 1;
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
	if (!charWidth) {
		let drawX = margin;
		let drawY = margin + lineHeight;

		renderableList.forEach((g: Renderable) => {
			if (drawX + g.width + margin >= canvasWidth) {
				drawX = margin;
				drawY += lineHeight + margin;
			}
			drawX += g.width + margin;
		});
		height = drawY;
	}
	return {width: canvasWidth, height};
}
