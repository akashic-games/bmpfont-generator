<p align="center">
<img src="img/akashic.png"/>
</p>

# bmpfont-generator

ttfファイルからビットマップフォントを作成するためのツールです。

## インストール方法

このソフトウェアは`canvas`モジュールに依存しています。`canvas`モジュールの動作のために`cairo`をインストールしておく必要があります。`cairo`のインストール方法は`canvas`モジュールの[README](https://github.com/Automattic/node-canvas/tree/v1.x#installation)を参照してください。

```
$ npm install -g @akashic/bmpfont-generator
```

## 利用方法

ビットマップフォントの描画に使用するTrueTypeフォント(ttf形式)のファイル名と、出力されるビットマップフォント(png形式)のファイル名を指定してください。

```
$ bmpfont-generator --source infile.ttf --output outfile.png
```

### ヘルプ

```
$ bmpfont-generator --help
```

### オプション

|       オプション            | 短縮名 |                   効果                        | 必須 | デフォルト値 |
| :---------------------:    | :----: | :--------------------------------------:     | :--: | :--------------: |
| `--source <filepath>`               |  `-s`  | フォントファイル(*.ttf)のパス                  |  〇  |                  |
| `--output <filepath>`               |  `-o`  | 画像ファイルを書きだすパス                     |  〇  |                  |
|  `--height <size>`                  |  `-H`  | 文字の縦サイズ(px)                            |      |   13             |
|  `--fixed-width <size>`             |  `-w`  | 文字の横サイズ(px) 。指定した場合、文字の幅に関わらずsizeを幅の値とする |      |                  |
|  `--chars <string>`                 |  `-c`  | 書きだす文字の羅列                             |      | 0-9,a-Z,各種記号 |
|  `--chars-file <filepath>`          |  `-f`  | 書き出す文字が羅列されたテキストファイルのパス   |      |                  |
|  `--missing-glyph <char>`           |  `-m`  | -cの指定に含まれない文字の代わりに用いる代替文字 |      | フォントが持つ代替文字 |
|  `--missing-glyph-image <filepath>` |  `-M`  | 代替文字として用いる画像ファイルのパス          |      |                  |
|  `--fill <fillstyle>`               |  `-F`  | フィルスタイル                                |      | `#000000`        |
|  `--stroke <strokestyle>`           |  `-S`  | ストロークスタイル                            |      | `#000000`        |
|  `--quality <quality>`              |  `-Q`  | 1-100の画質。指定する場合、 `pngquant` が必要  |      | 圧縮しない       |
|  `--baseline <baseline>`            |        | ベースライン                                 |      | 自動で計算された値 |
|  `--no-anti-alias <size>`           |        | アンチエイリアス無効化                        |      |                  |
|  `--json <filepath>`                |        | jsonファイルを書き出すパス                    |      | sourceと同じパス  |
|  `--no-json`                        |        | jsonファイルを出力しない                      |      |                  |

## ライセンス
本リポジトリは MIT License の元で公開されています。
詳しくは [LICENSE](./LICENSE) をご覧ください。

ただし、画像ファイルおよび音声ファイルは
[CC BY 2.1 JP](https://creativecommons.org/licenses/by/2.1/jp/) の元で公開されています。
