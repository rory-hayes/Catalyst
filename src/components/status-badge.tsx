import clsx from "clsx";

type BadgeVariant = "stage" | "health" | "pending";

const variantStyles: Record<BadgeVariant, string> = {
  stage: "bg-slate-900 text-slate-100",
  health: "bg-amber-100 text-amber-900",
  pending: "bg-orange-100 text-orange-900",
};

const healthStyles: Record<string, string> = {
  GREEN: "bg-emerald-100 text-emerald-900",
  YELLOW: "bg-amber-100 text-amber-900",
  RED: "bg-rose-100 text-rose-900",
};

export function StatusBadge({
  label,
  variant,
}: {
  label: string;
  variant: BadgeVariant;
}) {
  const computedStyle = variant === "health" ? (healthStyles[label] ?? variantStyles[variant]) : variantStyles[variant];

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide uppercase",
        computedStyle,
      )}
    >
      {label}
    </span>
  );
}
