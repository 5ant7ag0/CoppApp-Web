import * as React from "react"
import { twMerge } from "tailwind-merge"
import { ChevronDown } from "lucide-react"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, label, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {label && <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>}
        <div className="relative">
          <select
            className={twMerge(
              "appearance-none w-full bg-white border border-slate-200/60 rounded-xl px-4 py-2.5 pr-10 text-slate-800 text-sm focus:outline-none focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6] transition-all cursor-pointer",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
        </div>
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
