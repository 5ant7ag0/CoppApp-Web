import * as React from "react"
import { twMerge } from "tailwind-merge"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={twMerge(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0054A6] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-neutral-250 disabled:text-neutral-500 disabled:shadow-none active:scale-98 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          // Variants
          variant === "default" && "bg-[#0054A6] hover:bg-[#003B75] text-white shadow-sm",
          variant === "destructive" && "bg-red-600 text-white shadow-sm hover:bg-red-700",
          variant === "outline" && "border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900",
          variant === "secondary" && "bg-neutral-100 text-neutral-800 shadow-sm hover:bg-neutral-200",
          variant === "ghost" && "hover:bg-neutral-150 hover:text-neutral-900 text-neutral-700",
          variant === "link" && "text-[#0054A6] hover:underline",
          // Sizes
          size === "default" && "h-10 px-5 py-2.5",
          size === "sm" && "h-8 rounded-md px-3 text-xs",
          size === "lg" && "h-11 rounded-lg px-8",
          size === "icon" && "h-9 w-9",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
