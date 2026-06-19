/**
 * Small presentational atoms (PRD §9) used across screens.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'default';
  block?: boolean;
};

export function Btn({ variant = 'default', block, className = '', ...rest }: BtnProps) {
  const cls = ['btn', variant !== 'default' ? variant : '', block ? 'block' : '', className]
    .filter(Boolean)
    .join(' ');
  return <button className={cls} {...rest} />;
}

type ToolBtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
};

export function ToolBtn({ icon, label, className = '', ...rest }: ToolBtnProps) {
  return (
    <button className={`toolbtn ${className}`} aria-label={label} {...rest}>
      <span className="ic" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

export function Pill({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return <span className={`pill ${accent ? 'accent' : ''}`}>{children}</span>;
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="knob" />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="seg" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function formatTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
