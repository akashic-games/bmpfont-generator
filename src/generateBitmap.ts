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
	CollectGlyphRenderablesResult,
	GlyphLocation,
} from "./type";

export function generateBitmapFont(
	entryTable: BitmapFontEntryTable,
	fontOptions: FontRenderingOptions,
	sizeOptions: SizeOptions
): GenerateBitmapFontResult {
	const { glyphRenderableTable, lostChars, imageEntryTable } = collectGlyphRenderables(entryTable, fontOptions.font, sizeOptions);
	const resolvedSizeOptions: ResolvedSizeOptions = resolveSizeOptions(glyphRenderableTable, sizeOptions, fontOptions.font);
	const renderableTable = createAndInsertImageRenderableTable(glyphRenderableTable, imageEntryTable, resolvedSizeOptions);
	const canvasSize = calculateCanvasSize(renderableTable, resolvedSizeOptions);
	const cvs = canvas.createCanvas(canvasSize.width, canvasSize.height);
	const ctx = cvs.getContext("2d");

	const map = draw(ctx, renderableTable, resolvedSizeOptions, fontOptions);
	if (!fontOptions.antialias) binarize(ctx, map, fontOptions);

	return {
		lostChars,
		resolvedSizeOptions,
		canvas: cvs,
		map
	};
}

function colorNameToRgb(color: string): Uint8ClampedArray<ArrayBuffer> {
	const cvs = canvas.createCanvas(1, 1);
	const ctx = cvs.getContext("2d");
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, 1, 1);
	const data = ctx.getImageData(0, 0, 1, 1).data;
	return data.slice(0, 3);
}

function calcColorDistance(
	color0: Uint8ClampedArray<ArrayBuffer>,
	color1: Uint8ClampedArray<ArrayBuffer>
): number {
	return (
		// NOTE: 色ベクトル同士の大きさを比較できれば良いので、sqrtで厳密な平方根を求める必要はない
		Math.pow(color0[0] - color1[0], 2) +
		Math.pow(color0[1] - color1[1], 2) +
		Math.pow(color0[2] - color1[2], 2)
	);
}

function binarize(ctx: canvas.SKRSContext2D, map: GlyphLocationMap, fontOptions: FontRenderingOptions): void {
	const threshold = 129;
	const fillColor = colorNameToRgb(fontOptions.fillColor);
	const strokeColor = fontOptions.strokeColor ? colorNameToRgb(fontOptions.strokeColor) : undefined;

	Object.values(map).forEach((e: GlyphLocation) => {
		const imageData = ctx.getImageData(e.x, e.y, e.width, e.height);
		const data = imageData.data;
		for (let i = 0; i < data.length; i+=4) {
			const alpha = data[i + 3];
			if (alpha < threshold) {
				data[i + 3] = 0;
				continue;
			};
			let color = fillColor;
			if (strokeColor &&
				calcColorDistance(data.slice(i, 3), fillColor) > calcColorDistance(data.slice(i, 3), strokeColor)
			) color = strokeColor;
			data[i] = color[0];
			data[i + 1] = color[1];
			data[i + 2] = color[2];
			data[i + 3] = 255;
		}
		ctx.putImageData(imageData, e.x, e.y);
	});
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
		const renderable = renderableTable[key];
		const width = resolvedSizeOption.fixedWidth ?? renderable.width;
		if (drawX + width + resolvedSizeOption.margin > ctx.canvas.width) {
			drawX = resolvedSizeOption.margin;
			drawY += resolvedSizeOption.lineHeight + resolvedSizeOption.margin;
		}

		if (isImageRenderable(renderable)) {
			ctx.drawImage(renderable.image, drawX, drawY, renderable.width, resolvedSizeOption.lineHeight);
		} else {
			const path = renderable.glyph.getPath(
				drawX, drawY + resolvedSizeOption.baselineHeight, resolvedSizeOption.height);
			path.fill = fontOptions.fillColor;
			path.stroke = fontOptions.strokeColor || null;
			path.strokeWidth = fontOptions.strokeWidth;
			path.draw(ctx as unknown as CanvasRenderingContext2D); // NOTE: oepntype.jsとcanvasのCanvasRenderingContext2Dが一致しないためunknownを経由する

			// NOTE: そのフォントにおけるグリフが対応するunicodesがkeyの値以外にも存在する可能性がある。
			// 過去のビットマップフォントとの互換性も考慮し、unicodesもmapに含める。
			renderable.glyph.unicodes.forEach(unicode => {
				map[unicode] = {x: drawX, y: drawY, width, height: resolvedSizeOption.lineHeight};
			});
		}
		map[key] = {x: drawX, y: drawY, width, height: resolvedSizeOption.lineHeight};
		drawX += width + resolvedSizeOption.margin;
	});

	return map;
}

function isImageRenderable(renderable: Renderable): renderable is ImageRenderable {
	return !!(renderable as any).image;
}

export function collectGlyphRenderables(
	entryTable: BitmapFontEntryTable,
	font: opentype.Font,
	sizeOptions: SizeOptions
): CollectGlyphRenderablesResult {
	const glyphRenderableTable: GlyphRenderableTable = {};
	const lostChars: string[] = [];
	const imageEntryTable: ImageBitmapFontEntryTable = {};
	Object.keys(entryTable).forEach(key => {
		const entry = entryTable[key];
		if (typeof entry !== "string") {
			imageEntryTable[key] = entry;
			return;
		};

		const glyphs = font.stringToGlyphs(entry);
		glyphs.forEach((g) => {
			if (g.unicodes.length === 0) lostChars.push(entry);
			const scale = 1 / (g.path.unitsPerEm ?? font.unitsPerEm) * sizeOptions.height;
			glyphRenderableTable[key] = {glyph: g, width: Math.ceil((g.advanceWidth ?? 0) * scale)};
		});
	});
	return { glyphRenderableTable, lostChars, imageEntryTable };
}

function createAndInsertImageRenderableTable(
	glyphRenderableTable: GlyphRenderableTable,
	imageEntryTable: ImageBitmapFontEntryTable,
	resolvedSizeOptions: ResolvedSizeOptions
): RenderableTable {
	const renderableTable: RenderableTable = { ...glyphRenderableTable };
	Object.keys(imageEntryTable).forEach(key => {
		const image = imageEntryTable[key];
		const scale = image.width / image.height;
		const width = Math.ceil((resolvedSizeOptions.baselineHeight + resolvedSizeOptions.descend) * scale);
		renderableTable[key] = { width, image } satisfies ImageRenderable;
	});
	return renderableTable;
}

export function resolveSizeOptions(
	glyphRenderableTable: GlyphRenderableTable,
	sizeOptions: SizeOptions,
	font: opentype.Font
): ResolvedSizeOptions {
	if (Object.keys(glyphRenderableTable).length === 0) throw new Error("Unsupported: List has no Glyph");
	const metrics = Object.values(glyphRenderableTable).reduce((prev, g: GlyphRenderable) => {
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
	renderableTable: Record<string, RenderableBase>, // RenderableTable を受け取る想定だがテストしやすいよう必要な要素のみ指定
	options: ResolvedSizeOptions
): CanvasSize {
	const widthList = Object.values(renderableTable);
	const averageWidth = options.fixedWidth ?? widthList.reduce((acc, g) => acc + g.width, 0) / widthList.length;
	const renderablesCount = widthList.length;
	const MULTIPLE_OF_CANVAS_HEIGHT = 4;

	let canvasSquareSideSize = 1;

	const averageAdvanceWidth = averageWidth + options.margin;
	const advanceHeight = options.lineHeight + options.margin;

	// 文字が入りきる、かつ、縦横のマージン幅を納めることができる正方形の辺の長さを求める
	function hasEnoughSpace(canvasSquareSideSize: number): boolean {
		const capacityX = Math.floor((canvasSquareSideSize - options.margin) / averageAdvanceWidth);
		const capacityY = Math.floor((canvasSquareSideSize - options.margin) / advanceHeight);
		return capacityX * capacityY > renderablesCount;
	}
	while (!hasEnoughSpace(canvasSquareSideSize)) {
		canvasSquareSideSize *= 2;
	}
	const canvasWidth = canvasSquareSideSize;

	if (options.fixedWidth) {
		// canvasWidthから左端のmarginを除いた幅を、1文字に必要な字幅とmarginの合計で割ってその1行に収めることができる文字数を出し、
		// 文字数全体との徐とadvanceHeightの積が文字全数の描画に必要なキャンバス高さになる
		// 縦横ともにmarginは1つ余分に必要
		const rawCanvasHeight =
			Math.ceil(renderablesCount / Math.floor((canvasWidth - options.margin) / averageAdvanceWidth)) * advanceHeight + options.margin;
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
	const canvasHeight  = Math.ceil(drawY / MULTIPLE_OF_CANVAS_HEIGHT) * MULTIPLE_OF_CANVAS_HEIGHT;
	return { width: canvasWidth, height: canvasHeight };
}
