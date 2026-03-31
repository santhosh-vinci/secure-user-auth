import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5',
          'text-sm text-[#1a1d2e] placeholder:text-muted/50',
          'transition-all duration-150 outline-none',
          'focus:border-primary/60 focus:ring-3 focus:ring-primary/12',
          'hover:border-primary/30',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-background',
          error && 'border-error/50 hover:border-error/60 focus:border-error/70 focus:ring-error/12',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
