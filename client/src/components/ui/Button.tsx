import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-250 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]",
    {
        variants: {
            variant: {
                default: "bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] hover:shadow-md hover:shadow-[var(--accent)]/20 hover:-translate-y-0.5",
                destructive: "bg-[var(--error)] text-white hover:bg-[var(--error)]/90",
                outline: "border border-[var(--border-color)] bg-transparent hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 text-[var(--text-primary)]",
                secondary: "bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--accent)]/30",
                ghost: "hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]",
                link: "underline-offset-4 hover:underline text-[var(--accent)]",
                gold: "bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] hover:shadow-md hover:shadow-[var(--accent)]/25",
                glow: "bg-[var(--accent)] text-[var(--bg-primary)] shadow-[0_0_16px_var(--glow-color)] hover:shadow-[0_0_24px_var(--glow-color)]",
            },
            size: {
                default: "h-11 py-2.5 px-6 text-sm",
                sm: "h-9 px-4 text-xs",
                lg: "h-14 px-8 text-base",
                xl: "h-16 px-10 text-lg",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, isLoading, children, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
