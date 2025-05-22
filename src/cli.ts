import type { BmpfontGeneratorCliConfig, FontRenderingOptions, SizeOptions } from "./type";
import * as opentype from "opentype.js";
import { generateBitmap } from "./generateBitmap";
import { parseArgs } from "node:util";
import * as path from "path";
import * as fs from "fs";
import * as canvas from "@napi-rs/canvas";
import {outputBitmapFont} from "./outputBitmapFont";

export function run (argv: string[]): void {
    const config = parseArguments(argv);
    app(config);
}

async function app(param: BmpfontGeneratorCliConfig) {
    const font = await opentype.load(param.source);

    const fontOptions: FontRenderingOptions = {
        font,
        fillColor: param.fill,
        strokeColor: param.stroke,
        strokeWidth: param.strokeWidth,
        antialias: !!param.noAntiAlias
    };

    const sizeOptions: SizeOptions = {
        width: param.fixedWidth,
        height: param.height,
        baselineHeight: param.baseine,
        margin: param.margin,
    };

    const chars: (string | canvas.Image)[] = param.chars.split("");
    chars.push(param.missingGlyph ?? "");

    const { canvas, map, missingGlyph, lostChars, resolvedSizeOption } = await generateBitmap(chars, fontOptions, sizeOptions);

    if (param.json) {
        fs.writeFileSync(
            param.json,
            JSON.stringify({map: map, missingGlyph: missingGlyph, width: resolvedSizeOption.width, height: resolvedSizeOption.lineHeight })
        );
    }

    outputBitmapFont(param.output, canvas, param.quality);

}

function parseArguments(argv: string[]): BmpfontGeneratorCliConfig {
    const { values, positionals } = parseArgs({
        args: argv,
        allowPositionals: true,
        options: {
            help: { type: "boolean", short: "h" },
            height: { type: "string", short: "H", default: "13" },
            "fixed-width": { type: "string", short: "w"},
            chars: { type: "string", short: "c", default: "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}`~"},
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
        console.log("Missing arguments. See help.")
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
        fixedWidth: values["fixed-width"] ? Number.parseInt(values["fixed-width"]) : undefined,
        height: Number.parseInt(values.height),
        chars,
        missingGlyph: missingGlyph ?? values["missing-glyph"],
        fill: values.fill,
        stroke: values.stroke,
        strokeWidth: Number.parseInt(values["stroke-width"]!),
        baseine: values.baseline ? Number.parseInt(values.baseline) : undefined,
        quality: values.quality ? Number.parseInt(values.quality) : undefined,
        noAntiAlias: values["no-anti-alias"],
        json: values.json ?? path.join(path.dirname(positionals[3]), path.parse(positionals[3]).name + "_glyphs.json"),
        margin: Number.parseInt(values.margin)
    } satisfies BmpfontGeneratorCliConfig;
}

function showHelp() {
    console.log(`
Usage:
$ bmpfont-generator font.ttf output.png

Options:
    -V, --version                         output the version number
    -H, --height <size>                   文字の縦サイズ(px) (default: 13)
    -w, --fixed-width <size>              文字の横サイズ(px)。指定した場合、文字の幅に関わらずsizeを幅の値とする
    -c, --chars <string>                  書き出す文字の羅列 (default: "0123456789abcdefghijklmnopqrstuvwxyzABCDFEGHIJKLMNOPQRSTUVWXYZ !?#$%^&*()-_=+/<>,.;:'\"[]{}\`~\")
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
