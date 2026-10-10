import * as React from "react"


// We need a simple utility for classNames. Since clsx/tailwind-merge isn't installed, I'll write a simple one.
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "brand" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, children, ...props }, ref) => {
    // If asChild is true, we normally use Slot, but to keep it dependency free without Radix:
    // If asChild is true, it expects a single child and clones it.
    
    const baseClasses = "inline-flex items-center justify-center whitespace-nowrap font-sans font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] active:transition-transform active:duration-100 ease-out cursor-pointer";
    
    const variantClasses = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      brand: "bg-brand text-brand-foreground hover:bg-brand/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground text-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      link: "text-brand-text underline-offset-4 hover:underline",
    };

    const sizeClasses = {
      sm: "h-8 px-3 text-sm rounded-sm",
      md: "h-10 px-4 text-base rounded-sm",
      lg: "h-12 px-6 text-base rounded-sm", // lg is for marketing only
      icon: "h-10 w-10 rounded-sm",
      "icon-sm": "h-8 w-8 rounded-sm",
    };

    const compClass = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement> & React.RefAttributes<unknown>>;
      return React.cloneElement(child, {
        className: cn(compClass, child.props.className),
        ref,
        ...props,
      });
    }

    return (
      <button
        className={compClass}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
