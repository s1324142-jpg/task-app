# suke — manaba課題管理スマホアプリ

Expo / React Native / TypeScriptによるAndroid向けVersion 0.1。手動登録した課題を端末に保存し、TODO・締切・提出状況を管理します。Androidアプリを主対象とし、PCで画面・操作を確認するブラウザープレビューも用意しています。

## 実装済み

- 下部5タブ：ホーム、TODO、月間カレンダー、課題一覧、設定
- 課題の登録・詳細・編集・削除、授業の関連付けと既存授業の選択
- 未着手／作業中／完了・未提出／提出済みの管理
- 締切日時と相対時間、今日・明日・3日以内・7日以内の分類
- 「今日やるべきこと」と「余裕があるもの」の自動分類、手動指定
- 締切順・授業別・重要度順のソート、提出状況・今日・今週のフィルター
- AsyncStorageでの端末内保存、オフラインでの閲覧・編集
- 5種類のローカル締切通知、設定ON/OFF、提出済み・削除時の予約取消し
- 締切変更時の通知差分更新、通知タップから詳細への遷移
- 保存失敗／読込失敗／通知設定失敗の表示と再試行
- manabaのWebViewログイン、OS Cookieによるセッション再利用、SecureStoreの接続状態、連携解除
- manaba取得インターフェースと、重複防止・締切更新のマージ処理

**manaba課題HTMLの自動取得は未実装**です。設定からWebViewでログインして次回も同じセッションを確認できますが、実際の課題HTMLを確認するまで同期は有効にしません。大学アカウントのID・パスワードはアプリへ保存しません。

## 開発

Node.js 22 LTSとnpmを用意します。採用SDKはExpo 55で、依存の正確なバージョンは`package-lock.json`で固定しています。

```sh
npm ci
npm run check
npm start
```

Expo Goを使う場合はSDK 55対応版が必要です。端末通知の受け入れ確認は下記APKまたはネイティブビルドで行ってください。Android SDKを導入したPCとUSBデバッグを有効にした端末なら、以下で開発版を起動できます。

manabaの確実な連携解除にはネイティブCookie管理モジュールを使うため、Expo Goではなく開発ビルドまたはAPKで確認してください。

```sh
npm run android
```

## AndroidへインストールするAPK

### EAS Build

Expoアカウントでログインし、このプロジェクトをEASに関連付けます。コマンドはソースコードをExpoのビルドサービスへ送信するため、実行する場合のみ利用してください。Version 0.1はバックエンドや秘密の環境変数を必要としません。

```sh
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

完了後のリンクからAPKをAndroid端末へダウンロードしてインストールします。`preview`はAPK、`production`はストア用AABの設定です。APKの直接インストール時は、端末が表示する「この提供元を許可」設定に従ってください。

### ローカルビルド

JDK 17以降、Android SDK 36、Build Tools 36、NDK 27.1.12297006、CMake 3.22.1が必要です。SDKの場所を`ANDROID_HOME`に設定します。

```sh
npm ci
npx expo prebuild --platform android
cd android
./gradlew :app:assembleRelease
```

APKは`android/app/build/outputs/apk/release/app-release.apk`に生成されます。Expoが生成した標準のローカル設定ではデバッグ用鍵で署名されます。個人利用の動作確認用として扱い、配布・ストア公開はEASの署名管理または専用リリース鍵を使用してください。リリース版のJSはAPK内に含まれるため、Metroサーバーは不要です。

```sh
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## 通知の使い方

設定タブで「通知を許可する」を押します。初期設定は7日前・3日前・前日・当日・3時間前がONです。日単位の通知は現地9時、早朝締切の当日は0時。既に過ぎた通知時刻は予約しません。

課題を提出済みにすると今後の通知を取消し、未提出に戻すと未来の通知を再予約します。手動の「完了」は提出済みとは異なり、締切通知が続きます。通知予約に失敗した場合はホーム・設定の案内を確認し、「通知を再設定」で再試行してください。

Androidの省電力設定・通知権限によって通知が遅れる場合があります。OSの正確なアラーム特別権限は要求せず、許可されている精度でローカル通知を使います。実配信の検証手順は[実機チェックリスト](docs/device-checklist.md)にあります。

## データと安全性

データはこの端末内にのみ保存されます。アプリの削除・データ消去で失われます。クラウド同期・バックアップ・複数端末共有は未実装です。データ形式が壊れていた場合は読み込みエラーを表示し、自動的に空データへ置換しません。

`.env*`・署名鍵・ネイティブ生成物をGit対象から除外しています。`.env.example`以外には秘密情報を入れないでください。`EXPO_PUBLIC_*`やアプリ内に含まれる値は秘密として扱えないため、大学の認証情報は保存しません。manabaのCookieはWebView/OSのCookieストアにだけ保持し、AsyncStorage、SecureStore、ログへ複製しません。SecureStoreにはURL、接続状態、確認日時だけを保存します。

## 検証と構造

```sh
npm run check
npx expo install --check
npx expo export --platform android
```

自動テストでは、優先順位の境界、日付・週・月、課題と授業の保存、破損データ、連続変更、保存失敗、通知取消し・再予約・権限拒否・上限、同期の重複防止と欠損データを検証します。

詳細は[設計](docs/architecture.md)と[実機チェックリスト](docs/device-checklist.md)を参照してください。実際に実行した検証と残作業は[検証結果](docs/verification.md)に記録します。

Version 0.2の取得処理へ進むには、対象大学・manabaのURLと、個人情報・Cookie・認証トークンを除去した課題ページのHTMLが必要です。取得方式が確認できるまでは、ログインやスクレイピングを実装しません。

参照：[Expo SDK 55](https://expo.dev/changelog/sdk-55)、[Expo Notifications](https://docs.expo.dev/versions/v55.0.0/sdk/notifications/)、[APKビルド](https://docs.expo.dev/build-reference/apk/)、[ローカルビルド](https://docs.expo.dev/guides/local-app-production/)。

## PCでのプレビュー

```sh
npm ci
npm run web
```

ブラウザーで課題登録・編集・削除や各タブを確認できます。データはそのブラウザーに保存され、Androidとは共有しません。締切通知はAndroid専用で、PCプレビューでは配信されません。

静的プレビューは`npm run build:web`で生成し、`python3 -m http.server 8080 --directory dist-web`で配信できます。
