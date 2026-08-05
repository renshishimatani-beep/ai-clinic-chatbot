import { useState } from "react";
import { HeartPulse, LogIn, Loader2, AlertCircle } from "lucide-react";
import { signInWithEmail } from "@/services/authService";

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const mainColor = "#3BA9D4";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    const { error: signInError } = await signInWithEmail(email.trim(), password);
    setLoading(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    onLoggedIn();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white mb-3"
            style={{ backgroundColor: mainColor }}
          >
            <HeartPulse size={28} />
          </span>
          <h1 className="text-xl font-bold text-slate-800">つなまるAI 管理画面</h1>
          <p className="text-sm text-slate-500 mt-1">管理者ログイン</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@example.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 transition"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
            style={{ backgroundColor: mainColor }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                ログイン中...
              </>
            ) : (
              <>
                <LogIn size={16} />
                ログイン
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          アカウントの作成は管理者にお問い合わせください。
        </p>
      </div>
    </div>
  );
}
