import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

type AlertTone = 'success' | 'warning' | 'danger' | 'info';

interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: AlertTone;
  title?: React.ReactNode;
}

const TONES: Record<AlertTone, { box: string; icon: React.ElementType; iconClass: string }> = {
  success: { box: 'bg-success-50 border-success-100 text-success-800', icon: CheckCircle2, iconClass: 'text-success-600' },
  warning: { box: 'bg-warning-50 border-warning-100 text-warning-800', icon: AlertTriangle, iconClass: 'text-warning-600' },
  danger: { box: 'bg-danger-50 border-danger-100 text-danger-800', icon: AlertCircle, iconClass: 'text-danger-600' },
  info: { box: 'bg-info-50 border-info-100 text-info-800', icon: Info, iconClass: 'text-info-600' },
};

export const Alert: React.FC<AlertProps> = ({ tone = 'info', title, className, children, ...props }) => {
  const { box, icon: Icon, iconClass } = TONES[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-control border p-4 text-body-sm', box, className)}
      {...props}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconClass)} aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-1')}>{children}</div>}
      </div>
    </div>
  );
};
