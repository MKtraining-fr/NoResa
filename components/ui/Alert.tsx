import React from 'react';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';

type Tone = 'danger' | 'warning' | 'info';

const STYLES: Record<Tone, { box: string; Icon: typeof Info }> = {
  danger: { box: 'bg-danger-soft text-danger-text', Icon: CircleAlert },
  warning: { box: 'bg-warning-soft text-warning-text', Icon: TriangleAlert },
  info: { box: 'bg-line-soft text-ink', Icon: Info },
};

interface AlertProps {
  tone?: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: { label: React.ReactNode; onClick: () => void };
  className?: string;
}

const Alert: React.FC<AlertProps> = ({ tone = 'info', title, children, action, className = '' }) => {
  const { box, Icon } = STYLES[tone];
  return (
    <div role="alert" className={`flex items-center gap-3 px-4 py-3 ${box} ${className}`}>
      <Icon size={18} className="shrink-0" />
      <div className="min-w-0">
        {title && <span className="font-extrabold">{title} </span>}
        {children}
      </div>
      {action && (
        <button type="button" onClick={action.onClick} className="ml-auto shrink-0 font-extrabold hover:underline">{action.label}</button>
      )}
    </div>
  );
};

export default Alert;
