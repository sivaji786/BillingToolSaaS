import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-body font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[rgba(30,58,95,0.40)] focus-visible:ring-offset-1",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#1e3a5f] via-[#2a8fbd] to-[#3d5a80] text-white shadow-sm hover:opacity-90 hover:shadow-md active:opacity-100",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500/30",
        outline:
          "border border-[rgba(30,58,95,0.22)] bg-white text-[#1e3a5f] hover:bg-[#f0f6ff] hover:border-[rgba(30,58,95,0.38)] dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-[#f0f6ff] text-[#1e3a5f] hover:bg-[#dbe8f7]",
        ghost:
          "text-[#3d5a80] hover:bg-[#f0f6ff] hover:text-[#1e3a5f] dark:hover:bg-accent/50",
        link:
          "text-[#2a8fbd] underline-offset-4 hover:underline hover:text-[#1e3a5f]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
