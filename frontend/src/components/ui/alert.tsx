import * as React from 'react';
import { cn } from '@/lib/utils';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'error' | 'success' | 'info';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', children, ...props }, ref) => {
    const styles = {
      error:   'border-error/25 bg-error/5 text-error',
      success: 'border-success/25 bg-success/5 text-success',
      info:    'border-primary/25 bg-primary/5 text-primary',
    };
    const icons = { error: '✕', success: '✓', info: 'ℹ' };

    return (
      <div
        ref={ref}
        role={variant === 'error' ? 'alert' : 'status'}
        className={cn(
          'flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm leading-relaxed',
          styles[variant],
          className,
        )}
        {...props}
      >
        <span className="mt-px shrink-0 font-bold text-xs">{icons[variant]}</span>
        <span>{children}</span>
      </div>
    );
  },
);
Alert.displayName = 'Alert';

export { Alert };
