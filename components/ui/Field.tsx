import React, { createContext, useContext } from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';

const FieldContext = createContext<{ invalid: boolean }>({ invalid: false });

interface FieldProps {
  label: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Libellé au-dessus, en casse normale, aide ou erreur en dessous. */
export const Field: React.FC<FieldProps> = ({ label, required, optional, hint, error, className = '', children }) => (
  <label className={`block ${className}`}>
    <span className="block text-sm font-semibold text-ink mb-1.5">
      {label}
      {required && <span className="text-primary"> *</span>}
      {optional && <span className="font-normal text-muted"> (facultatif)</span>}
    </span>
    <FieldContext.Provider value={{ invalid: !!error }}>{children}</FieldContext.Provider>
    {error ? (
      <span className="flex items-center gap-1.5 text-sm text-danger-text mt-1.5"><CircleAlert size={14} className="shrink-0" /> {error}</span>
    ) : hint ? (
      <span className="block text-sm text-muted mt-1.5">{hint}</span>
    ) : null}
  </label>
);

const controlClass = (invalid: boolean, size: 'md' | 'lg') => [
  'w-full bg-surface border px-3 text-base text-ink placeholder:text-muted transition-colors',
  'focus:outline focus:outline-1 focus:-outline-offset-2 focus:outline-primary focus:border-primary',
  'disabled:bg-line-soft disabled:text-muted disabled:cursor-not-allowed',
  size === 'lg' ? 'h-11' : 'h-9',
  invalid ? 'border-danger-text' : 'border-subtle hover:border-muted',
].join(' ');

type InputSize = { fieldSize?: 'md' | 'lg' };

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & InputSize>(
  ({ fieldSize = 'md' as 'md' | 'lg', className = '', ...rest }, ref) => {
    const { invalid } = useContext(FieldContext);
    return <input ref={ref} className={`${controlClass(invalid, fieldSize)} ${className}`} {...rest} />;
  },
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', rows = 3, ...rest }, ref) => {
    const { invalid } = useContext(FieldContext);
    return <textarea ref={ref} rows={rows} className={`${controlClass(invalid, 'md')} h-auto py-2 resize-y ${className}`} {...rest} />;
  },
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & InputSize>(
  ({ fieldSize = 'md' as 'md' | 'lg', className = '', children, ...rest }, ref) => {
    const { invalid } = useContext(FieldContext);
    return (
      <span className={`relative block ${className}`}>
        <select ref={ref} className={`${controlClass(invalid, fieldSize)} appearance-none pr-9`} {...rest}>{children}</select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      </span>
    );
  },
);
Select.displayName = 'Select';

export const Checkbox: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }> = ({ label, className = '', ...rest }) => (
  <label className={`flex items-start gap-3 py-2 text-base text-ink cursor-pointer ${className}`}>
    <input type="checkbox" className="h-4 w-4 mt-0.5 shrink-0" {...rest} />
    <span>{label}</span>
  </label>
);
