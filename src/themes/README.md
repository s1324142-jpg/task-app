# テーマの追加方法

1. `types.ts`の`ThemeId`へIDを追加します。
2. `default.ts`または`sparklePink.ts`を雛形にテーマ定義を作ります。
3. `index.ts`の`themes`と`themesById`へ登録します。
4. 壁紙やマスコットを使う場合は`assets/themes/<theme-id>/`へ置き、定義の`backgroundImage`または`mascotImage`へ`require(...)`で指定します。

テーマ設定は見た目だけを管理します。課題、通知、manabaセッションなどのアプリデータとは別のAsyncStorageキーへ保存されます。
