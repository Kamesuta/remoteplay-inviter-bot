# Steam Remoteplay Inviter BOT

このリポジトリは、「Steam Remoteplay Inviter」ツールのバックエンドとして機能するDiscord BOTのソースコードを管理しています。

## BOTの役割

このBOTは、以下の主要な役割を担っています。

*   **招待パネルの作成と管理**: Discordのスラッシュコマンド (`/steam invite` など) を提供し、ユーザーがゲームの招待パネルを簡単に作成・管理できるようにします。
*   **ユーザーインタラクションの処理**: 参加者が招待パネルの「参加」ボタンを押した際のアクションを処理します。
*   **クライアントとの通信**: ホスト（ゲーム主催者）のマシンで動作するクライアントアプリケーションと通信し、Steam Remote Play Togetherの招待リンクの発行をリクエストし、受け取ります。

このBOTは、「Steam Remoteplay Inviter」エコシステムの中核をなすコンポーネントです。

## 関連リポジトリ

「Steam Remoteplay Inviter」プロジェクトは、複数のリポジトリに分かれています。

*   **[remoteplay-inviter-web](https://github.com/Kamesuta/remoteplay-inviter-web)**: プロジェクトの公式ウェブサイトです。
*   **[remoteplay-inviter](https://github.com/Kamesuta/remoteplay-inviter)**: ホストのPCで実行されるクライアントアプリケーションです。
*   **[remoteplay-inviter-bot](https://github.com/Kamesuta/remoteplay-inviter-bot)**: このリポジトリです。

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
