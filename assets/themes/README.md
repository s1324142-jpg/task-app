# Theme assets

テーマ固有の壁紙・マスコット画像は、テーマIDごとのサブディレクトリへ置きます。
画像を追加したら対応する`src/themes/*.ts`から`require('../../assets/themes/<theme-id>/<file>')`で参照してください。
