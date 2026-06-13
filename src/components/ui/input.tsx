import * as React from "react"
import { twMerge } from "tailwind-merge"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={twMerge(
          "flex h-10 w-full rounded-xl border border-slate-200/60 bg-white/40 px-3.5 py-2 text-slate-800 text-sm shadow-sm transition-all placeholder:text-slate-400/70 focus-visible:outline-none focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#0054A6]/10 focus-visible:border-[#0054A6] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
