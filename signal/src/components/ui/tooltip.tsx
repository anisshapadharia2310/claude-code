'use client';
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 max-w-xs rounded-md border border-navy-800 bg-navy-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg animate-in fade-in-0 zoom-in-95',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/** Convenience wrapper: an info affordance with explanatory text. */
export function InfoTip({ children, label }: { children: React.ReactNode; label: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted decoration-navy-300 underline-offset-2">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}

export { TooltipProvider, TooltipRoot as Tooltip, TooltipTrigger, TooltipContent };
