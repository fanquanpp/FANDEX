
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-fast ease-out focus:outline-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary-600 text-text-inverse hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600',
        secondary:
          'border-transparent bg-secondary-500 text-text-inverse hover:bg-secondary-600 dark:bg-secondary-400 dark:hover:bg-secondary-500',
        destructive:
          'border-transparent bg-error text-text-inverse hover:bg-error-dark dark:bg-error dark:hover:bg-error-dark',
        outline:
          'border-border text-text-primary hover:bg-hover dark:border-border dark:hover:bg-hover',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

export default Badge;
