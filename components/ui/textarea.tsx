/**
 * Textarea for address and notes.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-gold/40 bg-forest-dark/50 px-3 py-2 text-gold placeholder:text-gold/50 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-forest disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
