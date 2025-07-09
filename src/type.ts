import type { Image, Canvas } from "canvas";

export interface BmpfontGeneratorCliConfig {
	source: string;
	output: string;
	fixedWidth?: number;
	height: number;
	chars: string;
	missingGlyph?: string | Image;
	fill: string;
	stroke?: string;
	strokeWidth: number;
	baseine?: number;
	quality?: number;
	noAntiAlias?: boolean;
	json: string;
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

	descend: number;
}

export type BitmapFontEntry = string | Image;

export type BitmapFontEntryTable = Record<string, BitmapFontEntry>;
export type ImageBitmapFontEntryTable = Record<string, Image>;


/**
 * ビットマップフォント "画像" に「敷き詰めて」「描けるもの」。
 * ただし renderable 間で共通の情報は個別には持たず、 ResolvedSizeOptions 側に持つ。
 */
export type Renderable = GlyphRenderable | ImageRenderable;

/**
 * 文字コード (キー) から renderable を引くテーブル
 */
export type RenderableTable = Record<string, Renderable>;
export type GlyphRenderableTable = Record<string, GlyphRenderable>;

export interface GlyphRenderable {
	glyph: opentype.Glyph;
	width: number;
}

export interface ImageRenderable {
	width: number;
	image: Image;
}

export interface GlyphLocationMap {
	[key: string]: GlyphLocation;
}

export interface GlyphLocation {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface GenerateBitmapFontResult {
	canvas: Canvas;
	map: GlyphLocationMap;
	lostChars: string[];
	resolvedSizeOptions: ResolvedSizeOptions;
}
