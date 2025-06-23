import * as canvas from "@napi-rs/canvas";
import { FontRenderingOptions, SizeOptions, ResolvedSizeOption, Glyph, ImageGlyph, BitmapDictionaryEelement, BitmapDictionary } from "./type";
import { calculateCanvasSize, calculateResolvedSizeOption, calculateWidthAverage, charsToGlyphList, updateGlyphListWithImage } from "./util";

export function generateBitmap(
	chars: (string | canvas.Image)[],
	fontOptions: FontRenderingOptions,
	sizeOptions: SizeOptions
): Promise<{
	canvas: canvas.Canvas,
	map: BitmapDictionary,
    missingGlyph: BitmapDictionaryEelement,
    lostChars: string[],
    resolvedSizeOption: ResolvedSizeOption
  }> {
	const { charGlyphList, lostChars } = charsToGlyphList(chars, fontOptions.font, sizeOptions);
    const resolvedSizeOption: ResolvedSizeOption = calculateResolvedSizeOption(charGlyphList, sizeOptions, fontOptions.font);

    let glyphList: Glyph[];
    if (chars.some(charOrImage => typeof charOrImage !== "string")) {
        glyphList = updateGlyphListWithImage(charGlyphList, chars, fontOptions.font.unitsPerEm, resolvedSizeOption);
    } else {
        glyphList = charGlyphList;
    }

    const canvasSize = calculateCanvasSize(glyphList, resolvedSizeOption.width, resolvedSizeOption.lineHeight, resolvedSizeOption.margin);
    const cvs = canvas.createCanvas(canvasSize.width, canvasSize.height);
    const ctx = cvs.getContext("2d");
    const drawResult = draw(ctx, glyphList, resolvedSizeOption, fontOptions);

	if (!fontOptions.antialias) {
		console.log(fontOptions.antialias);
		binarize(ctx, drawResult.map, fontOptions);
	}

	return Promise.resolve({
        lostChars,
        resolvedSizeOption,
		canvas: cvs,
		...drawResult
	});
}

type RgbColor = { r: number; g: number; b: number };

function colorNameToRgb(color: string): RgbColor {
	const cvs = canvas.createCanvas(1, 1);
	const ctx = cvs.getContext("2d");
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, 1, 1);
	const data = ctx.getImageData(0, 0, 1, 1).data;
	return {
		r: data[0],
		g: data[1],
		b: data[2],
	};
}

function calcColorDistance(color1: RgbColor, color2: RgbColor): number {
	return (
		// NOTE: 色ベクトル同士の大きさを比較できれば良いので、sqrtで厳密な平方根を求める必要はない
		Math.pow(color1.r - color2.r, 2) + Math.pow(color1.g - color2.g, 2) + Math.pow(color1.b - color2.b, 2)
	);
}

function binarize(ctx: canvas.SKRSContext2D, map: BitmapDictionary, fontOptions: FontRenderingOptions): void {
	const threshold = 129;
	const fillColor = colorNameToRgb(fontOptions.fillColor);
	const strokeColor = fontOptions.strokeColor ? colorNameToRgb(fontOptions.strokeColor) : undefined;

	Object.values(map).forEach((e: BitmapDictionaryEelement) => {
		const imageData = ctx.getImageData(e.x, e.y, e.width!, e.height!); // TODO: ブランチ元ではoptionalではないのでマージ後に直す
		const data = imageData.data;
		for (let i = 0; i < data.length; i+=4) {
			const alpha = data[i + 3];
			if (alpha < threshold) {
				data[i + 3] = 0;
				continue;
			};
			const pixelRgb = {r: data[i], g: data[i + 1], b: data[i + 2]};
			let color = fillColor;
			if (strokeColor &&
				calcColorDistance(pixelRgb, fillColor) > calcColorDistance(pixelRgb, strokeColor)
			) color = strokeColor;
			data[i] = color.r;
			data[i + 1] = color.g;
			data[i + 2] = color.b;
			data[i + 3] = 255;
		}
		ctx.putImageData(imageData, e.x, e.y);
	});
}

function draw(ctx: canvas.SKRSContext2D, glyphList: Glyph[], resolvedSizeOption: ResolvedSizeOption, fontOptions: FontRenderingOptions): {
    map: BitmapDictionary,
    missingGlyph: BitmapDictionaryEelement
} {
    let drawX = resolvedSizeOption.margin;
	let drawY = resolvedSizeOption.margin;
    let missingGlyph!: BitmapDictionaryEelement;
	const dict: BitmapDictionary = {};

    glyphList.forEach((glyph: Glyph, index: number) => {
        const width = resolvedSizeOption.width ?? glyph.width + resolvedSizeOption.margin;
        if (drawX + width > ctx.canvas.width) {
            drawX = resolvedSizeOption.margin;
            drawY += resolvedSizeOption.lineHeight + resolvedSizeOption.margin;
        }

        if (isImageGlyph(glyph)) {
            ctx.drawImage(glyph.image, drawX, drawY, glyph.width, resolvedSizeOption.lineHeight);
            missingGlyph = {x: drawX, y: drawY, width: glyph.width, height: resolvedSizeOption.lineHeight}; // NOTE: glyphListにImageGlyphが2つ以上入りうる型になっているが0~1個を暗黙に仮定して良いか
        } else {
            const path = glyph.glyph.getPath(drawX + (width / 2) - (glyph.width / 2), drawY + resolvedSizeOption.baselineHeight, resolvedSizeOption.height);
            path.fill = fontOptions.fillColor;
            path.stroke = fontOptions.strokeColor || null;
            path.strokeWidth = fontOptions.strokeWidth;
            path.draw(ctx as unknown as CanvasRenderingContext2D); // NOTE: oepntype.jsとcanvasのCanvasRenderingContext2Dが一致しないためunknownを経由する

            // NOTE: missingGlyphが最後まで無い場合、最後の文字をmissingGlyphにしてよいかどうか
            if (index === glyphList.length - 1 && !missingGlyph) {
                missingGlyph = {x: drawX, y: drawY, width, height: resolvedSizeOption.lineHeight};
            } else {
                glyph.glyph.unicodes.forEach(unicode => {
                    dict[unicode] = {x: drawX, y: drawY, width, height: resolvedSizeOption.lineHeight};
                });
            }
        }
        drawX += width + resolvedSizeOption.margin;
    });
    // NOTE: missingGlyphが末尾でない仕様が許されるか？
    return {map: dict, missingGlyph};
}

function isImageGlyph(glyph: Glyph): glyph is ImageGlyph {
    return !!(glyph as any).image;
}
