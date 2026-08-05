# Supabase セットアップ手順

## 1. SQLマイグレーションの適用

マイグレーションは `mcp__supabase__apply_migration` ツール経由で既に適用済みです。

以下のテーブルが作成されます:
- `clinics` — クリニック情報
- `clinic_members` — ユーザーとクリニックの関連付け（ロール管理）
- `clinic_information` — クリニック詳細情報
- `faqs` — FAQ
- `chat_settings` — チャット設定

RLS（Row Level Security）は全テーブルで有効になっています。

## 2. 最初のユーザーを作成

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. **Authentication** → **Users** → **Add user** を開く
4. メールアドレスとパスワードを入力してユーザーを作成
   - Email confirmation は OFF のままで構いません

## 3. ユーザーUUIDをコピー

1. 作成したユーザーの行をクリック
2. **User UID** の値をコピー

## 4. ユーザーをオーナーとして割り当て

Supabase Dashboard の **SQL Editor** で以下を実行:

```sql
-- REPLACE_WITH_AUTH_USER_UUID を手順3でコピーしたUUIDに置き換えてください
INSERT INTO clinic_members (clinic_id, user_id, role)
VALUES (
  (SELECT id FROM clinics WHERE slug = 'tsunamaru-test'),
  'REPLACE_WITH_AUTH_USER_UUID',
  'owner'
)
ON CONFLICT (clinic_id, user_id) DO UPDATE SET role = 'owner';
```

## 5. アプリにログイン

1. アプリの `#/admin/login` にアクセス
2. 手順2で作成したメールアドレスとパスワードでログイン
3. クリニックが1つの場合は自動的に選択されます
4. 複数ある場合はクリニック選択画面が表示されます

## 6. ローカルデータをSupabaseへ移行

1. 管理画面の **データ管理** タブを開く
2. 「ローカルデータをSupabaseへ移行」ボタンをクリック
3. 確認ダイアログで「移行する」をクリック
4. 以下のデータが移行されます:
   - クリニック情報
   - FAQ（既存のFAQは置き換えられます）
   - チャット設定
5. 会話履歴・未回答質問・デモデータは移行されません
6. ローカルデータは削除されません

## 7. パブリックスラグルートのテスト

以下のURLでパブリックページが正しく表示されるか確認:

- チャット: `#/chat/tsunamaru-test`
- プレビュー: `#/preview/tsunamaru-test`
- 埋め込み: `#/embed/tsunamaru-test`

旧ルート（`#/chat`、`#/preview`、`#/embed`）は開発用フォールバックとして引き続き利用可能です。

## 環境変数

以下の環境変数が `.env` に設定済みです:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

サービスロールキーはフロントエンドで使用しません。

## セキュリティ

- 全テーブルでRLSが有効
- 認証ユーザーは自分が所属するクリニックのデータのみアクセス可能
- 匿名ユーザーはアクティブなクリニックの公開データのみ参照可能
- 匿名ユーザーはデータの挿入・更新・削除は不可
- クリニックIDの手動変更による他クリニックへのアクセスはRLSで拒否されます
