import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-white hover:bg-primary-hover active:scale-[0.98] shadow-[0_2px_8px_rgba(108,99,255,0.25)] hover:shadow-[0_4px_20px_rgba(108,99,255,0.38)]',
        destructive:
          'border border-error/25 text-error bg-error/5 hover:bg-error/10 hover:border-error/40 active:scale-[0.98]',
        outline:
          'border border-border bg-surface text-[#1a1d2e] hover:bg-background hover:border-primary/30 active:scale-[0.98]',
        ghost:
          'text-muted hover:bg-background hover:text-[#1a1d2e] active:scale-[0.98]',
        link:
          'text-primary underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm:      'h-8 rounded-lg px-3 text-xs',
        lg:      'h-12 rounded-xl px-6 text-base',
        icon:    'h-9 w-9',
        full:    'h-11 w-full px-4 text-[15px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
