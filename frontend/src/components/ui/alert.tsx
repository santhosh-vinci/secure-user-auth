import * as React from 'react';
import { cn } from '@/lib/utils';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'error' | 'success' | 'info';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', children, ...props }, ref) => {
    const styles = {
      error:   'border-error/20 bg-error/[0.06] text-error',
      success: 'border-success/20 bg-success/[0.06] text-success',
      info:    'border-primary/20 bg-primary/[0.06] text-primary',
    };

    const icons = {
      error:   '✕',
      success: '✓',
      info:    'ℹ',
    };

    const iconStyles = {
      error:   'bg-error/10 text-error',
      success: 'bg-success/10 text-success',
      info:    'bg-primary/10 text-primary',
    };

    return (
      <div
        ref={ref}
        role={variant === 'error' ? 'alert' : 'status'}
        className={cn(
          'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed',
          styles[variant],
          className,
        )}
        {...props}
      >
        <span className={cn('mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold', iconStyles[variant])}>
          {icons[variant]}
        </span>
        <span className="pt-px">{children}</span>
      </div>
    );
  },
);
Alert.displayName = 'Alert';

export { Alert };
