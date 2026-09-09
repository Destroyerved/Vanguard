import React from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

/**
 * VANGUARD tactical primitives.
 *
 * The console reuses the landing page's design language: olive/lime accents on
 * black instrument glass, hairline rules, mono readouts and hardware brackets.
 * Every console surface is composed from these so the whole app reads as one
 * piece of defense hardware rather than a set of unrelated dashboards.
 */

export const VG = {
  lime: '#a4c639',
  limeBright: '#c6ff00',
  forest: '#526a27',
  olive: '#33401c',
  oliveDeep: '#16200d',
} as const;

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/* ─── Panel ──────────────────────────────────────────────────────────────── */

interface TacticalPanelProps {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Right-hand slot in the header rule — status pills, counters, controls. */
  actions?: React.ReactNode;
  /** Raises the border/glow — use for the primary panel on a screen. */
  glow?: boolean;
  /** Adds hover lift. Only for panels that are themselves clickable regions. */
  interactive?: boolean;
  brackets?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function TacticalPanel({
  title,
  subtitle,
  icon: Icon,
  actions,
  glow = false,
  interactive = false,
  brackets = true,
  className,
  bodyClassName,
  children,
}: TacticalPanelProps) {
  return (
    <div
      className={cx(
        'vg-panel flex flex-col min-h-0',
        glow && 'vg-panel-glow',
        interactive && 'vg-panel-interactive',
        className
      )}
    >
      {/* Hardware corner brackets, drawn as real nodes so they never collide
          with the panel's own specular-highlight pseudo-element. */}
      {brackets && (
        <span aria-hidden className="pointer-events-none absolute inset-0 z-10">
          <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t border-l border-[#a4c639]/60" />
          <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b border-r border-[#a4c639]/60" />
        </span>
      )}

      {(title || actions) && (
        <div className="vg-panel-head flex items-center justify-between gap-3 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && <Icon className="w-4 h-4 shrink-0 text-[#a4c639]" />}
            <div className="min-w-0">
              {title && (
                <h3 className="vg-title text-[13px] text-slate-100 truncate leading-tight">
                  {title}
                </h3>
              )}
              {subtitle && <p className="vg-label mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={cx('flex-1 min-h-0 p-4', bodyClassName)}>{children}</div>
    </div>
  );
}

/* ─── Chip ───────────────────────────────────────────────────────────────── */

interface ChipProps {
  active?: boolean;
  tone?: 'olive' | 'danger' | 'warn' | 'good' | 'neutral';
  className?: string;
  children: React.ReactNode;
}

const CHIP_TONES: Record<NonNullable<ChipProps['tone']>, string> = {
  olive: '',
  danger: 'border-rose-500/45 bg-rose-950/60 text-rose-300',
  warn: 'border-amber-500/45 bg-amber-950/60 text-amber-300',
  good: 'border-emerald-500/45 bg-emerald-950/60 text-emerald-300',
  neutral: 'border-white/10 bg-white/5 text-slate-400',
};

export function Chip({ active, tone = 'olive', className, children }: ChipProps) {
  return (
    <span
      className={cx('vg-chip', active && 'vg-chip-active', CHIP_TONES[tone], className)}
    >
      {children}
    </span>
  );
}

interface ChipButtonProps extends ChipProps {
  onClick: () => void;
  title?: string;
}

export function ChipButton({ active, className, onClick, title, children }: ChipButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx('vg-chip vg-chip-btn', active && 'vg-chip-active', className)}
    >
      {children}
    </button>
  );
}

/* ─── Button ─────────────────────────────────────────────────────────────── */

interface TacticalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger';
  icon?: LucideIcon;
}

export function TacticalButton({
  variant = 'default',
  icon: Icon,
  className,
  children,
  ...rest
}: TacticalButtonProps) {
  return (
    <motion.button
      whileHover={rest.disabled ? undefined : { y: -1 }}
      whileTap={rest.disabled ? undefined : { scale: 0.97 }}
      className={cx(
        'vg-btn',
        variant === 'primary' && 'vg-btn-primary',
        variant === 'danger' && 'vg-btn-danger',
        className
      )}
      {...(rest as any)}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </motion.button>
  );
}

/* ─── Stat tile ──────────────────────────────────────────────────────────── */

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon?: LucideIcon;
  tone?: 'lime' | 'rose' | 'amber' | 'emerald' | 'slate';
  hint?: string;
  className?: string;
}

const STAT_TONES: Record<NonNullable<StatTileProps['tone']>, string> = {
  lime: 'text-[#a4c639]',
  rose: 'text-rose-400',
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
  slate: 'text-slate-200',
};

export function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  tone = 'lime',
  hint,
  className,
}: StatTileProps) {
  return (
    <div className={cx('vg-stat pl-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="vg-label truncate">{label}</span>
        {Icon && <Icon className="w-3 h-3 text-[#526a27] shrink-0" />}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={cx('vg-readout font-bold text-lg leading-none', STAT_TONES[tone])}>
          {value}
        </span>
        {unit && <span className="vg-label">{unit}</span>}
      </div>
      {hint && <p className="mt-1 text-[10px] leading-tight text-slate-500 truncate">{hint}</p>}
    </div>
  );
}

/* ─── Screen heading ─────────────────────────────────────────────────────── */

interface ScreenHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export function ScreenHeading({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
}: ScreenHeadingProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-[#a4c639]" />}
          <span className="vg-label text-[#a4c639]">{eyebrow}</span>
        </div>
        <h2 className="vg-title text-xl sm:text-2xl text-slate-100 mt-1 leading-none">{title}</h2>
        {description && (
          <p className="mt-1.5 text-xs text-slate-400 font-sans max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ─── Live status dot ────────────────────────────────────────────────────── */

export function StatusDot({
  online,
  label,
  className,
}: {
  online: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <span className={cx('inline-flex items-center gap-1.5', className)}>
      <span
        className={cx(
          'w-1.5 h-1.5 rounded-full',
          online ? 'bg-[#a4c639] vg-pulse-ring' : 'bg-rose-500'
        )}
      />
      {label && (
        <span
          className={cx(
            'vg-readout text-[10px] font-bold uppercase',
            online ? 'text-[#a4c639]' : 'text-rose-400'
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}

/* ─── Confidence meter ───────────────────────────────────────────────────── */

export function ConfidenceMeter({
  value,
  className,
  showLabel = true,
}: {
  value: number;
  className?: string;
  showLabel?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = pct >= 85 ? '#a4c639' : pct >= 65 ? '#eab308' : '#f97316';
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden min-w-[48px]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: tone, boxShadow: `0 0 8px ${tone}` }}
        />
      </div>
      {showLabel && (
        <span className="vg-readout text-[11px] font-bold" style={{ color: tone }}>
          {pct}%
        </span>
      )}
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center select-none">
      {Icon && <Icon className="w-8 h-8 text-[#33401c] mb-3" />}
      <p className="vg-title text-xs text-slate-400">{title}</p>
      {hint && <p className="mt-1.5 text-[11px] text-slate-600 font-mono max-w-xs">{hint}</p>}
    </div>
  );
}

/* ─── Severity vocabulary (shared across every console surface) ──────────── */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | string;

export const SEVERITY_STYLE: Record<
  string,
  { text: string; border: string; bg: string; dot: string; hex: string }
> = {
  critical: {
    text: 'text-rose-300',
    border: 'border-rose-500/55',
    bg: 'bg-rose-950/50',
    dot: 'bg-rose-500',
    hex: '#f43f5e',
  },
  high: {
    text: 'text-orange-300',
    border: 'border-orange-500/55',
    bg: 'bg-orange-950/50',
    dot: 'bg-orange-500',
    hex: '#f97316',
  },
  medium: {
    text: 'text-yellow-300',
    border: 'border-yellow-500/55',
    bg: 'bg-yellow-950/50',
    dot: 'bg-yellow-500',
    hex: '#eab308',
  },
  low: {
    text: 'text-[#a4c639]',
    border: 'border-[#526a27]/70',
    bg: 'bg-[#16200d]',
    dot: 'bg-[#a4c639]',
    hex: '#a4c639',
  },
};

export function severityStyle(sev: Severity) {
  return SEVERITY_STYLE[sev] ?? SEVERITY_STYLE.low;
}
