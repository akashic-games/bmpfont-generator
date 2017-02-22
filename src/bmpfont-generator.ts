import generator = require("./generator");
import commander = require("commander");
import fs = require("fs");
import opentype = require("opentype.js");
import Canvas = require("canvas");
var Image = Canvas.Image;

commander
	.usage("[options] infile.ttf outfile.png")
	.option("-h, --height <size>", "文字の縦サイズ(px)", Number, 13)
	.option("-w, --width <size>", "文字の横サイズ(px)", Number)
	.option("-l, --list <string>", "書き出す文字の羅列",
	        "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~")
	.option("-m, --missingGlyph <char>", "-lの指定に含まれない文字の代わりに用いる代替文字")
	.option("-f, --fill <fillstyle>", "フィルスタイル", "#000000")
	.option("-s, --stroke <strokestyle>", "ストロークスタイル")
	.option("-q, --quality <quality>", "画質 1以上100以下", Number, null)
	.option("--lf, --listFile <filepath>", "書き出す文字が羅列されたテキストファイルのパス")
	.option("--mi, --missingGlyphImage <filepath>", "-lの指定に含まれない文字の代わりに用いる画像ファイルのパス")
	.option("-b, --baseline <baseline>", "baselineの数値(px)", Number)
	.option("-j, --json <filepath>", "jsonファイルを書き出すパス")
	.option("--noAntiAlias", "アンチエイリアスを無効化する")
	.parse(process.argv);

if (commander.args.length < 2) {
	console.error("invalid arguments");
	process.exit(1);
}

var existCheck = (path: string) => {
	if (!fs.existsSync(path)) {
		console.error(path, "is not found");
		process.exit(1);
	}
};

var fontFilePath = commander.args[0];
existCheck(fontFilePath);
var outputPath = commander.args[1];

var cliArgs: any = commander;

// 任意オプション
if (cliArgs.listFile) {
	existCheck(cliArgs.listFile);
	var listFileContent = fs.readFileSync(cliArgs.listFile);
	cliArgs.list = listFileContent.toString();
}
cliArgs.list = cliArgs.list.replace(/[\n\r]/g, "");

if (cliArgs.missingGlyphImage) {
	existCheck(cliArgs.missingGlyphImage);
	cliArgs.missingGlyph = new Image;
	cliArgs.missingGlyph.src = fs.readFileSync(cliArgs.missingGlyphImage);
}
cliArgs.noAntiAlias = !!cliArgs.noAntiAlias;

opentype.load(fontFilePath, (err: any, font: opentype.Font) => {
	if (err) {
		console.error("could not load ", fontFilePath, ":", err);
		process.exit(1);
	} else {
		generator.generateBitmapFont(font, outputPath, cliArgs, (err: any) => {
			if (err) {
				console.error(err);
				process.exit(1);
			} else {
				console.log("done!");
			}
		});
	}
});
