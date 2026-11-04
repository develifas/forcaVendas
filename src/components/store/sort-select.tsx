"use client";

import { useRouter } from "next/navigation";

export function SortSelect({
  options,
  value,
}: {
  options: { value: string; label: string; href: string }[];
  value: string;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-store-muted">
      Ordenar
      <select
        value={value}
        onChange={(e) => {
          const opt = options.find((o) => o.value === e.target.value);
          if (opt) router.push(opt.href);
        }}
        className="h-11 rounded-xl border border-store-border bg-store-surface px-3 text-sm font-semibold text-store-text focus:outline-none focus:ring-2 focus:ring-store-accent sm:h-10"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

