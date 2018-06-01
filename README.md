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
Akashic Engineの詳細な利用方法については、 [公式ページ](https://akashic-games.github.io/) を参照してください。

```
$ bmpfont-generator infile.ttf outfile.png
```

### ヘルプ

```
$ bmpfont-generator --help
```

### オプション

* -h
  * 文字の縦サイズ(px)
  * フォントのサイズであり、ビットマップフォント画像の包含矩形の高さではありません
  * 省略時は13
* -w
  * 文字の横サイズ(px)
  * 1文字あたりの描画領域の幅を固定値にしたい場合に指定します
* -l
  * 描画したい文字が羅列された文字列
  * 省略時は0-9とa-Zと各種記号
* -m
  * 「書き出す文字」に含まれていない文字を描画する際に用いる代替文字
  * 省略時はttfファイル自体が持っている代替文字を使用
* -f
  * 文字のfillスタイルを指定
  * canvasのfillStyleと同様なので自由に指定できます
  * 省略時は"#000000"
* -s
  * 文字のstrokeスタイルを指定
  * 文字に枠を付けたい場合に指定します
  * canvasのstrokeStyleと同様なので自由に指定できます
* -b
  * 文字を描画するbaseline(px)
  * 省略時は自動で計算されるので、基本的には使用しないことをオススメします
  * 省略時に描画されたフォントがおかしい場合にのみ利用してください
* -q
  * 描画する画質を指定
  * 1以上100以下で指定できます
  * 画質が低いほど出力されるファイルの容量が小さくなります
  * このオプションを指定しての実行には `pngquant` がインストールされている必要があります
  * 省略時は圧縮処理自体が無効化されます
* --noAntiAlias
  * アンチエイリアス処理無効化
  * 指定した場合、描画時にアンチエイリアス処理が行われません

```
$ bmpfont-generator infile.ttf outfile.png -h <h> -l <l> -m <m> -f <f> -b <b> -q <q>
```

### 一部オプションの拡張

* --lf
  * 書き出す文字が羅列されたテキストファイルのパス
  * -l の代わりに使用できます。指定されたテキストファイルに記述された文字列が描画されます
* --mi
  * 代替文字画像のファイルパス
  * -m の代わりに使用できます。「書き出す文字」に含まれていない文字の代わりに、
      指定された画像ファイルの内容を描画するようにします

```
$ bmpfont-generator infile.ttf outfile.png --lf <lf> --mi <mi>
```

### akashic向けオプション

* -j
  * jsonファイルを書き出すパス
  * akashicで作成されたゲームから読み込むことで簡単にbmpfontを利用できます

```
$ bmpfont-generator infile.ttf outfile.png -j <j>
```

### 実行例

```
$ cat list.txt
0123456789abcdefghijklmnopqrstuvwxyz
$ bmpfont-generator truetypefont.ttf bitmapfont.png -h 20 --lf list.txt -f "#0000ff"
```

## ライセンス
本リポジトリは MIT License の元で公開されています。
詳しくは [LICENSE](./LICENSE) をご覧ください。

ただし、画像ファイルおよび音声ファイルは
[CC BY 2.1 JP](https://creativecommons.org/licenses/by/2.1/jp/) の元で公開されています。
