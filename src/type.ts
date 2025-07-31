import type { Image, Canvas } from "@napi-rs/canvas";

/**
 * コマンドライン引数をパースした値。各プロパティの内容はcli.tsのshowHelp()を参照
 */
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

/**
 * コマンドラインから渡される、ビットマップフォントを出力するために必要な情報。色や描画に関わるもの
 */
export interface FontRenderingOptions {
	font: opentype.Font;
	fillColor: string;
	strokeColor?: string;
	strokeWidth: number;
	antialias: boolean;
}

/**
 * コマンドラインから渡される、ビットマップフォントを出力するために必要な情報。フォントの大きさに関わるもの
 */
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

/**
 * ビットマップフォントを出力するために必要な情報。フォント情報や書き出す文字から、各種値を算出したもの。
 * Renderableを描画するために実際に必要な情報。
 */
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
	 * v4.0.5までのadjustedHeight相当。
	 */
	lineHeight: number;

	descend: number;
}

/**
 * ビットマップフォントに書き出す文字、または画像
 */
export type BitmapFontEntry = string | Image;

/**
 * 文字コードをキーに、BitmapFontEntryを値に持つテーブル
 */
export type BitmapFontEntryTable = Record<string, BitmapFontEntry>;

/**
 * 文字コードをキーに、Imageのみを値に持つテーブル
 */
export type ImageBitmapFontEntryTable = Record<string, Image>;

/**
 * ビットマップフォント "画像" に「敷き詰めて」「描けるもの」。
 * ただしRenderable間で共通の情報は個別には持たず、ResolvedSizeOptions側に持つ。
 */
export type Renderable = GlyphRenderable | ImageRenderable;

/**
 * 文字コード (キー) からRenderableを引くテーブル
 */
export type RenderableTable = Record<string, Renderable>;

/**
 * 文字コード (キー) からGlyphRenderableを引くテーブル
 */
export type GlyphRenderableTable = Record<string, GlyphRenderable>;

/**
 * Renderableの基底インターフェイス
 */
export interface RenderableBase {
	width: number;
}

export interface GlyphRenderable extends RenderableBase {
	glyph: opentype.Glyph;
}

export interface ImageRenderable extends RenderableBase {
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

export interface CanvasSize {
	width: number;
	height: number;
}

/**
 * collectGlyphRenderables()の返り値。
 * グリフ・またはイメージとして「描けるもの」、描けない文字をそれぞれまとめて返す。
 */
export interface CollectGlyphRenderablesResult {
	glyphRenderableTable: GlyphRenderableTable;
	lostChars: string[];
	imageEntryTable: ImageBitmapFontEntryTable;
}

/**
 * 保存するJSONファイルの型
 */
export interface BitmapFontGlyphInfo {
	map: { [key: string]: GlyphLocation };
	width?: number;
	height: number;
	missingGlyph: GlyphLocation;
}
