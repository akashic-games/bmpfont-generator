import * as canvas from "@napi-rs/canvas";
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
	GenerateBitmapFontResult,
	CanvasSize,
	RenderableBase,
} from "./type";

export function generateBitmapFont(
	entryTable: BitmapFontEntryTable,
	fontOptions: FontRenderingOptions,
	sizeOptions: SizeOptions
): GenerateBitmapFontResult {
	const { glyphRenderableTable, lostChars, imageEntryTable } = collectGlyphRenderables(entryTable, fontOptions.font, sizeOptions);
	const resolvedSizeOptions: ResolvedSizeOptions = resolveSizeOptions(glyphRenderableTable, sizeOptions, fontOptions.font);

	const renderableTable = createAndInsertImageRenderableTable(glyphRenderableTable, imageEntryTable, resolvedSizeOptions);
	const canvasSize = calculateCanvasSize(Object.values(renderableTable), resolvedSizeOptions);
	const cvs = canvas.createCanvas(canvasSize.width, canvasSize.height);
	const ctx = cvs.getContext("2d");
	// TODO: 別途対応するまで暫定的にコメントアウト
	// if (!fontOptions.antialias) ctx.antialias = "none";

	const map = draw(ctx, renderableTable, resolvedSizeOptions, fontOptions);
	return {
		lostChars,
		resolvedSizeOptions,
		canvas: cvs,
		map
	};
}

function draw(
	ctx: canvas.SKRSContext2D,
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

export function collectGlyphRenderables(
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

export function resolveSizeOptions(
	glyphRenderableTable: GlyphRenderableTable,
	sizeOptions: SizeOptions,
	font: opentype.Font): ResolvedSizeOptions {
	if (Object.keys(glyphRenderableTable).length === 0) throw new Error("List has no Glyph");
	const metrics = Object.values(glyphRenderableTable).reduce<{descend: number; baseline: number}>((prev, g: GlyphRenderable) => {
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

export function calculateCanvasSize(
	widthList: RenderableBase[],
	options: ResolvedSizeOptions
): CanvasSize {
	const averageWidth = options.fixedWidth ?? widthList.reduce((acc, g) => acc + g.width + options.margin, 0) / widthList.length;
	const glyphCount = widthList.length;
	const MULTIPLE_OF_CANVAS_HEIGHT = 4;

	let canvasSquareSideSize = 1;

	const averageAdvanceWidth = averageWidth + options.margin;
	const advanceHeight = options.lineHeight + options.margin;

	// 平均の幅から、大まかに文字が入り切る正方形の辺の長さを求める
	while ((canvasSquareSideSize / averageAdvanceWidth) * (canvasSquareSideSize / advanceHeight) < glyphCount) {
		canvasSquareSideSize *= 2;
	}
	const canvasWidth = canvasSquareSideSize;

	// 固定幅の場合: 幅が決まれば高さも単純に計算できる
	if (options.fixedWidth) {
		const rawCanvasHeight = Math.ceil(glyphCount / Math.floor(canvasWidth / averageAdvanceWidth)) * advanceHeight;
		const ceiledCanvasHeight  = Math.ceil(rawCanvasHeight / MULTIPLE_OF_CANVAS_HEIGHT) * MULTIPLE_OF_CANVAS_HEIGHT;
		return { width : canvasSquareSideSize, height: ceiledCanvasHeight };
	}

	let drawX = options.margin;
	let drawY = options.margin + options.lineHeight;

	widthList.forEach((g: RenderableBase) => {
		if (drawX + g.width + options.margin >= canvasWidth) {
			drawX = options.margin;
			drawY += options.lineHeight + options.margin;
		}
		drawX += g.width + options.margin;
	});
	drawY += options.margin;
	return { width: canvasWidth, height: drawY };
}
