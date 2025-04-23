import * as canvas from "canvas";
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
    if (fontOptions.antialias) ctx.antialias = "none";

    const drawResult = draw(ctx, glyphList, resolvedSizeOption, fontOptions);

	return Promise.resolve({
        lostChars,
        resolvedSizeOption,
		canvas: cvs,
		...drawResult
	});
}

function draw(ctx: canvas.CanvasRenderingContext2D, glyphList: Glyph[], resolvedSizeOption: ResolvedSizeOption, fontOptions: FontRenderingOptions): {
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
