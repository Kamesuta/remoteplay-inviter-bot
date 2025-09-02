# Steam Remoteplay Inviter BOT

このリポジトリは、「[Steam Remoteplay Inviter](https://github.com/Kamesuta/remoteplay-inviter-web)」ツールのバックエンドとして機能するDiscord BOTのソースコードを管理しています。

## 概要

このBOTは、Steamの「Remote Play Together」機能を使ったゲームへの招待を、Discordを通じて自動化するためのものです。ホスト（ゲーム主催者）が手動で招待リンクを発行する手間を省き、参加者はDiscordのボタンをクリックするだけで簡単にゲームに参加できます。

## 主な機能

*   **スラッシュコマンド**: Discordの `/steam` コマンド群を提供し、直感的な操作を実現します。
*   **招待パネル**: ゲームへの参加ボタンが付いた招待パネルをDiscord上に作成します。
*   **招待リンクの自動発行**: 参加ボタンが押されると、BOTがホストのクライアントと連携し、自動で招待リンクを発行して参加者に通知します。
*   **多言語対応**: i18nを利用し、日本語と英語に対応しています。

## セットアップ方法

### 前提条件

*   [Node.js](https://nodejs.org/) (v22.x)
*   データベース (MySQL)

### 1. インストール

リポジトリをクローンし、依存パッケージをインストールします。

```bash
git clone https://github.com/Kamesuta/remoteplay-inviter-bot.git
cd remoteplay-inviter-bot
npm install
```

### 2. 環境変数の設定

`.env.sample` ファイルをコピーして `.env` ファイルを作成します。

```bash
cp .env.sample .env
```

次に、`.env` ファイルをエディタで開き、以下の各項目を設定してください。

| 変数名                      | 説明                                                                                             | 例                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `DISCORD_TOKEN`             | **(必須)** あなたのDiscordボットのトークン。                                                     | `M...`                                             |
| `DATABASE_URL`              | **(必須)** Prismaが使用するデータベースの接続URL。                                               | `mysql://user:password@localhost:3306/mydb`   |
| `PORT`                      | クライアントアプリ（デーモン）からの接続を待ち受けるためのポート番号です。                                  | `8000`                                             |
| `DAEMON_REQUIRED_VERSION`   | **(必須)** 要求するクライアントアプリの最低バージョン。                                          | `1.0.0`                                            |
| `DAEMON_DOWNLOAD_URL`       | **(必須)** クライアントアプリのバージョンが古い場合に表示するダウンロードURL。                   | `https://github.com/Kamesuta/remoteplay-inviter/releases/latest` |


## 実行方法

### 1. データベースのマイグレーション

以下のコマンドを実行して、データベースのスキーマをセットアップします。

```bash
npx prisma migrate deploy
```

### 2. Discordコマンドの登録

BOTが使用するスラッシュコマンドをDiscordに登録します。

```bash
npm run register
```

### 3. BOTの起動 (開発環境)

以下のコマンドでBOTを起動します。`tsx`によりTypeScriptコードが直接実行されます。

```bash
npm start
```

### 4. 本番環境向けのビルドと起動

まず、TypeScriptをJavaScriptにビルドします。

```bash
npm run build
```

ビルドが完了すると、`dist` ディレクトリにファイルが生成されます。以下のコマンドでビルドされたコードを実行します。

```bash
node dist/index.js
```

## 開発向け情報

### リンターとフォーマッター

コードの品質を保つため、ESLintとPrettierを使用しています。

*   **リンターの実行**: `npm run lint`
*   **フォーマッターの実行**: `npm run prettier`

## 関連リポジトリ

*   **[remoteplay-inviter-web](https://github.com/Kamesuta/remoteplay-inviter-web)**: プロジェクトの公式ウェブサイト
*   **[remoteplay-inviter](https://github.com/Kamesuta/remoteplay-inviter)**: ホストのPCで実行されるクライアントアプリケーション
*   **[remoteplay-inviter-bot](https://github.com/Kamesuta/remoteplay-inviter-bot)**: このリポジトリ

## シーケンス図

```mermaid
sequenceDiagram
    actor ホスト
    actor 参加者
    participant Discord
    participant BOT
    participant クライアント
    participant Steam

    rect rgb(221, 221, 255)
    note over ホスト, Discord: 1. 招待パネルの作成
    ホスト->>Discord: /steam invite コマンドを実行
    Discord->>BOT: コマンドを転送
    activate BOT
    BOT->>Discord: 招待パネル (参加ボタン付き) を作成
    deactivate BOT
    end

    rect rgb(221, 255, 221)
    note over 参加者, BOT: 2. 参加者がゲームに参加
    参加者->>Discord: 「参加」ボタンをクリック
    Discord->>BOT: ボタンクリックを通知
    activate BOT

    BOT->>クライアント: 招待リンクの生成をリクエスト
    activate クライアント
    クライアント->>Steam: Remote Play Together の招待リンクを要求
    activate Steam
    Steam-->>クライアント: 招待リンクを返却
    deactivate Steam
    クライアント-->>BOT: 招待リンクを転送
    deactivate クライアント

    BOT->>Discord: 参加者に招待リンクを送信 (一時的なメッセージ)
    Discord-->>参加者: 招待リンクを表示
    deactivate BOT
    end

    rect rgb(255, 221, 221)
    note over 参加者, Steam: 3. 参加者がSteamに参加
    参加者->>Steam: 招待リンクを使用してゲームに接続
    end
```
