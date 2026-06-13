import * as React from "react"
import { twMerge } from "tailwind-merge"

interface TabsContextType {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (val: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, children, className, ...props }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={twMerge("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => {
  return (
    <div
      className={twMerge(
        "inline-flex h-10 w-full items-center justify-center rounded-xl bg-slate-100/80 p-1 text-slate-500",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, className, ...props }) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used inside Tabs");

  const isActive = context.value === value;

  return (
    <button
      type="button"
      className={twMerge(
        "inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all cursor-pointer focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        isActive ? "bg-[#0054A6] text-white shadow-sm font-semibold" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/20",
        className
      )}
      onClick={() => context.onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  )
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className, ...props }) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used inside Tabs");

  if (context.value !== value) return null;

  return (
    <div
      className={twMerge(
        "mt-4 focus-visible:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
