export function DemoDataBadge() {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-700">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        運用後イメージ
      </span>
      <span className="text-xs text-slate-500">
        デモデータ｜実際の運用後に確認できる分析イメージです
      </span>
    </div>
  );
}
