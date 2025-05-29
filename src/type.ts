import type { Image } from "canvas";

export interface BmpfontGeneratorCliConfig {
	source: string;
	output: string;
	fixedWidth?: number;
	height: number;
	chars: string;
	missingGlyph?: string | Image;
	missingGlyphImage?: string;
	fill: string;
	stroke?: string;
	strokeWidth: number;
	baseine?: number;
	quality?: number;
	noAntiAlias?: boolean;
	json: string;
	margin: number;
}


export interface CalculateCanvasSizeOptions {
	chars: string;
	charWidth: number;
	charHeight: number;
	margin: number;
}

export interface FontRenderingOptions {
	font: opentype.Font;
	fillColor: string;
	strokeColor?: string;
	strokeWidth: number;
	antialias: boolean;
}

export interface SizeOptions {

	/**
	 * ユーザが指定できる文字の横サイズ(px)
	 * 指定した場合、グリフごとの幅に関わらずこの値を幅として扱う
	 */
	fixedWidth?: number;

	/**
	 * ユーザが指定できる文字の縦サイズ(px)。省略した場合、13。
	 * ただし行の高さとして不十分の場合lineHeightを行の高さとして扱う
	 */
	height: number;

	/**
	 * 文字間の余白
	 */
	margin: number;

	/**
	 * ベースラインの高さ(px)
	 */
	baselineHeight?: number;
}

export interface ResolvedSizeOptions extends SizeOptions {
	baselineHeight: number;
	/**
	 * フォントグリフを重ならず描画するために必要な高さ。
	 * baseline(yMax) + desend(yMin)の絶対値の合計。
	 */
	requiredHeight: number;

	/**
	 * 行の高さ。ビットマップを並べる際の1行辺りの高さ。
	 * requiredHeightとSizeOptions#heightの大きいほうを採用する。
	 * この値にmarginを加えると次の行の上端への距離(advanceHeight)になる。
	 * 旧adjustedHeight相当。
	 */
	lineHeight: number;
}

export type Glyph = CharGlyph | ImageGlyph;

export interface CharGlyph {
	glyph: opentype.Glyph;
	width: number;
}

export interface ImageGlyph {
	width: number;
	image: Image;
}

export interface GlyphLocationMap {
	[key: number]: GlyphLocation;
}

export interface GlyphLocation {
	x: number;
	y: number;
	width: number;
	height: number;
}
