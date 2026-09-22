
import type * as React from 'react';

import { cn } from '@/lib/utils';

function Card({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      ref={ref}
      className={cn('rounded-xl border border-border bg-surface text-text-primary shadow-sm', className)}
      {...props}
    />
  );
}

function CardHeader({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      ref={ref}
      className={cn('flex flex-col gap-1.5 p-6', className)}
      {...props}
    />
  );
}

function CardTitle({ className, ref, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="card-title"
      ref={ref}
      className={cn('text-2xl font-semibold leading-tight tracking-tight', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ref, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      ref={ref}
      className={cn('text-sm text-text-secondary leading-relaxed', className)}
      {...props}
    />
  );
}

function CardContent({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
}

function CardFooter({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  );
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };

export default Card;
