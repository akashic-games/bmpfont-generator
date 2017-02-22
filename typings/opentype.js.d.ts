declare module "opentype.js" {
	export class Font {
		draw(ctx: any, text: string, x: number, y: number, fontSize: number, options: any): void;
		stringToGlyphs(string: string): Glyph[];
		charToGlyph(string: string): Glyph;
		ascender: number;
		descender: number;
		unitsPerEm: number;
		lineGap: number;
		getPath(text: string, x: number, y: number, fontSize: number): Path;
		glyphs: Glyph[];
	}
	export class Glyph {
		font: Font;
		name: string;
		unicode: number;
		unicodes: number[];
		index: number;
		advanceWidth: number;
		xMin: number;
		yMin: number;
		xMax: number;
		yMax: number;
		draw(ctx: any, x: number, y: number, fontSize: number): void;
		getPath(x: number, y: number, fontSize: number): Path;
	}
	export class Path {
		commands: {type: string; x1: number; x2: number; y1: number; y2: number; x: number; y: number}[];
		fill: string;
		stroke: string;
		strokeWidth: number;
		draw(ctx: any): void;
	}
	export function load(path: string, callback: (err: any, font: Font) => void): void;
}