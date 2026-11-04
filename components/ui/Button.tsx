import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark active:translate-y-px',
  secondary: 'bg-surface text-ink border border-ink hover:bg-ground active:bg-line-soft',
  ghost: 'text-primary hover:bg-primary-soft active:bg-primary-soft active:text-primary-dark',
  danger: 'bg-surface text-danger-text border border-danger-text hover:bg-danger-soft',
};

const PADDING: Record<Variant, Record<'md' | 'lg', string>> = {
  primary: { md: 'px-3.5', lg: 'px-4' },
  secondary: { md: 'px-3.5', lg: 'px-4' },
  ghost: { md: 'px-1', lg: 'px-2' },
  danger: { md: 'px-3.5', lg: 'px-4' },
};

const DISABLED = 'bg-line-soft text-muted border-transparent cursor-not-allowed';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  block?: boolean;
  /** Rend un lien interne avec l'apparence du bouton. */
  to?: string;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, block, to, disabled, className = '', children, type = 'button', ...rest
}) => {
  const classes = [
    'inline-flex items-center gap-2 font-extrabold text-base whitespace-nowrap transition-colors',
    size === 'lg' ? 'h-11' : 'h-9',
    PADDING[variant][size],
    block ? 'w-full justify-start' : '',
    disabled ? DISABLED : VARIANTS[variant],
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {Icon && <Icon size={16} className="shrink-0" />}
      {children}
      {IconRight && <IconRight size={16} className="ml-auto shrink-0" />}
    </>
  );

  if (to && !disabled) return <Link to={to} className={classes}>{content}</Link>;
  return <button type={type} disabled={disabled} className={classes} {...rest}>{content}</button>;
};

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }> = ({
  label, className = '', children, type = 'button', ...rest
}) => (
  <button type={type} aria-label={label} title={label} className={`h-9 w-9 inline-flex items-center justify-center shrink-0 text-ink hover:bg-ground transition-colors ${className}`} {...rest}>
    {children}
  </button>
);

export default Button;
