import generator = require("./generator");
import commander = require("commander");
import fs = require("fs");
import path = require("path");
import opentype = require("opentype.js");
import Canvas = require("canvas");
var Image = Canvas.Image;

interface CommandParameterObject {
	source?: string;
	output?: string;
	fixedWidth?: number;
	height?: number;
	chars?: string;
	charsFile?: string;
	missingGlyph?: any;
	missingGlyphImage?: string;
	fill?: string;
	stroke?: string;
	baseine?: number;
	quality?: number;
	noAntiAlias?: boolean;
	json?: string;
	noJson?: boolean;
	margin?: number;
}

export function run(argv: string[]): void {
	const ver = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8")).version;

	commander
		.version(ver);

	commander
		.description("generate bitmap fonts from TrueType fonts.")
		.usage("[options] infile.ttf outfile.png")
		.option("-H, --height <size>", "文字の縦サイズ(px)", Number, 13)
		.option("-w, --fixed-width <size>", "文字の横サイズ(px)。指定した場合、文字の幅に関わらずsizeを幅の値とする", Number)
		.option("-c, --chars <string>", "書き出す文字の羅列",
				"0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~")
		.option("-f, --chars-file <filepath>", "書き出す文字が羅列されたテキストファイルのパス")
		.option("-m, --missing-glyph <char>", "--charsの指定に含まれない文字の代わりに用いる代替文字")
		.option("-M, --missing-glyph-image <filepath>", "--charsの指定に含まれない文字の代わりに用いる画像ファイルのパス")
		.option("-F, --fill <fillstyle>", "フィルスタイル", "#000000")
		.option("-S, --stroke <strokestyle>", "ストロークスタイル")
		.option("-Q, --quality <quality>", "画質 1以上100以下", Number, null)
		.option("--baseline <baseline>", "baselineの数値(px)", Number)
		.option("--no-anti-alias", "アンチエイリアスを無効化する")
		.option("--json <filepath>", "jsonファイルを書き出すパス")
		.option("--no-output-json", "jsonファイルを出力しない")
		.option("--margin <margin>", "文字余白の数値(px)", Number, 1)
		.parse(process.argv);

	if (commander.args.length < 2) {
		console.error("invalid arguments");
		process.exit(1);
	}

	cli({
		source: commander.args[0],
		output: commander.args[1],
		fixedWidth: commander["fixedWidth"],
		height: commander["height"],
		chars: commander["chars"],
		charsFile: commander["charsFile"],
		missingGlyph: commander["missingGlyph"],
		missingGlyphImage: commander["missingGlyphImage"],
		fill: commander["fill"],
		stroke: commander["stroke"],
		baseine: commander["baseline"],
		quality: commander["quality"],
		noAntiAlias: commander["antiAlias"],
		json: commander["json"],
		noJson: commander["outputJson"],
		margin: commander["margin"]
	});
}

function cli(param: CommandParameterObject): void {
	if (param.output === undefined || param.source === undefined) {
		console.error("invalid arguments");
		process.exit(1);
	}

	existCheck(param.source);

	// 任意オプション
	if (param.charsFile) {
		existCheck(param.charsFile);
		const listFileContent = fs.readFileSync(param.charsFile);
		param.chars = listFileContent.toString();
	}
	param.chars = param.chars.replace(/[\n\r]/g, "");

	if (param.missingGlyphImage) {
		existCheck(param.missingGlyphImage);
		param.missingGlyph = new Image;
		param.missingGlyph.src = fs.readFileSync(param.missingGlyphImage);
	}
	param.noAntiAlias = !param.noAntiAlias;
	param.noJson = !param.noJson;

	opentype.load(param.source, (err: any, font: opentype.Font) => {
		if (err) {
			console.error("could not load ", param.source, ":", err);
			process.exit(1);
		} else {
			const jsonPath = param.json ? param.json : path.join(path.dirname(param.output), path.parse(param.output).name + "_glyphs.json");
			const cliArgs: generator.CLIArgs = {
				list: param.chars,
				width: param.fixedWidth,
				height: param.height,
				missingGlyph: param.missingGlyph,
				baseline: param.baseine,
				noAntiAlias: param.noAntiAlias,
				json: param.noJson ? undefined : jsonPath,
				fill: param.fill,
				stroke: param.stroke,
				quality: param.quality,
				margin: param.margin
			};
			generator.generateBitmapFont(font, param.output, cliArgs, (err: any) => {
				if (err) {
					console.error(err);
					process.exit(1);
				} else {
					console.log("done!");
				}
			});
		}
	});
}

function existCheck(filePath: string): void {
	if (!fs.existsSync(filePath)) {
		console.error(filePath, "is not found");
		process.exit(1);
	}
}
