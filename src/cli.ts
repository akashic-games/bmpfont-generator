import * as fs from "fs";
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import * as path from "path";
import * as canvas from "canvas";
import * as opentype from "opentype.js";
import PngQuant from "pngquant";
import { generateBitmap } from "./generateBitmap";
import type { BmpfontGeneratorCliConfig, FontRenderingOptions, GlyphSourceTable, SizeOptions } from "./type";
import { charsToGlyphList } from "./util";

export async function run(argv: string[]): Promise<void> {
	const config = parseArguments(argv);
	return app(config);
}

async function app(param: BmpfontGeneratorCliConfig): Promise<void> {
	const font = await opentype.load(param.source);

	const fontOptions: FontRenderingOptions = {
		font,
		fillColor: param.fill,
		strokeColor: param.stroke,
		strokeWidth: param.strokeWidth,
		antialias: !param.noAntiAlias
	};

	const sizeOptions: SizeOptions = {
		fixedWidth: param.fixedWidth,
		height: param.height,
		baselineHeight: param.baseine,
		margin: param.margin,
	};

	const chars: string[] = param.chars.split("");
	// if (param.missingGlyph) chars.push(param.missingGlyph);

	// const charAndMissingGlyph: (string | { key: string, src: string | canvas.Image })[] = chars;
	const sourceTable: GlyphSourceTable<string | canvas.Image> = chars.reduce((table, ch) => {
		table[ch.charCodeAt(0)] = ch;
		return table;
	}, {} as GlyphSourceTable<string | canvas.Image>);
	sourceTable["missingGlyph"] = param.missingGlyph ?? "";
	console.log("param.missingGlyph", param.missingGlyph);
	const { canvas, map, resolvedSizeOptions, lostChars } = await generateBitmap(sourceTable, fontOptions, sizeOptions);
	const missingGlyph = map["missingGlyph" as any];

	if (lostChars.length > 0) {
		console.log(
			"WARN: Cannot find " + lostChars.join(",") + " from the given font. " +
			"Generated image does not include these characters. " +
			"Try Using other font or characters."
		);
	}

	if (param.json) {
		await writeFile(
			param.json,
			JSON.stringify({
				map,
				missingGlyph,
				width: resolvedSizeOptions.fixedWidth,
				height: resolvedSizeOptions.lineHeight
			})
		);
	}

	await writeFile(param.output, await toBuffer(canvas, param.quality));
}

async function toBuffer(cvs: canvas.Canvas, quality?: number): Promise<Buffer> {
	return new Promise<Buffer>(async (resolve, reject) => {
		if (!quality) {
			cvs.toBuffer((error: any, result: Buffer) => {
				if (error) return reject(error);
				resolve(result);
			});
            return;
		}

		const pngQuanter: any = new PngQuant([`--quality=${quality}`, "256"]);
		const chunks: Buffer[] = [];
		pngQuanter
			.on("data", (chunk: Buffer) => chunks.push(chunk))
			.on("end", () => resolve(Buffer.concat(chunks)))
			.on("error", (e: Error) => reject(e ?? "error at pngquant"));
		cvs.createPNGStream().pipe(pngQuanter);
	});
}

const defaultChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~";

function parseArguments(argv: string[]): BmpfontGeneratorCliConfig {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: {
			help: { type: "boolean", short: "h" },
			height: { type: "string", short: "H", default: "13" },
			"fixed-width": { type: "string", short: "w"},
			chars: { type: "string", short: "c", default: defaultChars},
			"chars-file": { type: "string", short: "f"},
			"missing-glyph": { type: "string", short: "m", },
			"missing-glyph-image": { type: "string", short: "M"},
			fill: { type: "string", short: "F", default: "#000000"},
			stroke: { type: "string", short: "S"},
			quality: { type: "string", short: "Q"},
			"stroke-width": { type: "string", default: "1"},
			baseline: { type: "string"},
			"no-anti-alias": { type: "boolean"},
			json: { type: "string" },
			"no-json": { type: "boolean"},
			margin: { type: "string", default: "1"},
		} as const
	});

	if (values.help) {
		showHelp();
		process.exit(0);
	}

	if (positionals.length < 4) {
		console.log("Missing arguments. See help.");
	}

	fs.accessSync(positionals[2]);

	let chars = values.chars;
	if (values["chars-file"]) {
		const listFileContent = fs.readFileSync(values["chars-file"]);
		chars = listFileContent.toString();
	}
	chars = chars.replace(/[\n\r]/g, "");

	let missingGlyph!: canvas.Image;
	if (values["missing-glyph-image"]) {
		missingGlyph = new canvas.Image;
		missingGlyph.src = fs.readFileSync(values["missing-glyph-image"]);
	}

	return {
		source: positionals[2],
		output: positionals[3],
		fixedWidth: values["fixed-width"] ? Number.parseInt(values["fixed-width"], 10) : undefined,
		height: Number.parseInt(values.height, 10),
		chars,
		missingGlyph: missingGlyph ?? values["missing-glyph"],
		fill: values.fill,
		stroke: values.stroke,
		strokeWidth: Number.parseInt(values["stroke-width"]!, 10),
		baseine: values.baseline ? Number.parseInt(values.baseline, 10) : undefined,
		quality: values.quality ? Number.parseInt(values.quality, 10) : undefined,
		noAntiAlias: values["no-anti-alias"],
		json: values.json ?? path.join(path.dirname(positionals[3]), path.parse(positionals[3]).name + "_glyphs.json"),
		margin: Number.parseInt(values.margin, 10)
	} satisfies BmpfontGeneratorCliConfig;
}

function showHelp(): void {
	console.log(`
Usage:
$ bmpfont-generator font.ttf output.png

Options:
    -V, --version                         output the version number
    -H, --height <size>                   文字の縦サイズ(px) (default: 13)
    -w, --fixed-width <size>              文字の横サイズ(px)。指定した場合、文字の幅に関わらずsizeを幅の値とする
    -c, --chars <string>                  書き出す文字の羅列 (default: "${defaultChars}\")
    -f, --chars-file <filepath>           書き出す文字が羅列されたテキストファイルのパス
    -m, --missing-glyph <char>            --charsの指定に含まれない文字の代わりに用いる代替文字
    -M, --missing-glyph-image <filepath>  --charsの指定に含まれない文字の代わりに用いる画像ファイルのパス
    -F, --fill <fillstyle>                フィルスタイル (default: "#000000")
    -S, --stroke <strokestyle>            ストロークスタイル
    -Q, --quality <quality>               画質 1以上100以下 (default: null)
    --stroke-width <strokeWidth>          ストロークスタイルを設定した時の線の太さを指定 (default: 1)
    --baseline <baseline>                 baselineの数値(px)
    --no-anti-alias                       アンチエイリアスを無効化する
    --json <filepath>                     jsonファイルを書き出すパス
    --no-json                             jsonファイルを出力しない
    --margin <margin>                     文字間の余白(px) (default: 1)
    -h, --help                            output usage information
`);
}
