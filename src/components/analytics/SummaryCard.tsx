import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export type SummaryCardData = {
  label: string;
  value: string;
  color: string;
  prevMonth?: string | null;
  prevYear?: string | null;
  icon?: ReactNode;
};

export function SummaryCard({ card }: { card: SummaryCardData }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: `${card.color}1a` }}
      >
        {card.icon ?? <span className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />}
      </div>
      <p className="text-3xl font-bold text-slate-800">{card.value}</p>
      <p className="text-sm text-slate-500 mt-1">{card.label}</p>
      {(card.prevMonth || card.prevYear) && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {card.prevMonth && (
            <ComparisonBadge label="前月比" value={card.prevMonth} />
          )}
          {card.prevYear && (
            <ComparisonBadge label="前年同月比" value={card.prevYear} />
          )}
        </div>
      )}
    </div>
  );
}

function ComparisonBadge({ label, value }: { label: string; value: string }) {
  const isPositive = value.startsWith("+");
  const isNegative = value.startsWith("-");
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 ${
        isPositive
          ? "bg-green-50 text-green-600"
          : isNegative
            ? "bg-red-50 text-red-600"
            : "bg-slate-50 text-slate-500"
      }`}
    >
      {isPositive && <TrendingUp size={10} />}
      {isNegative && <TrendingDown size={10} />}
      {label} {value}
    </span>
  );
}
