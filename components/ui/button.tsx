import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none min-h-11 px-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-white hover:bg-teal-800",
        secondary: "bg-slate-900 text-white hover:bg-slate-800",
        outline: "border border-slate-300 bg-white hover:bg-slate-50",
        ghost: "hover:bg-slate-100",
        danger: "bg-danger text-white hover:bg-red-800",
        gold: "bg-accent-2 text-white hover:bg-amber-700",
      },
      size: {
        default: "text-sm",
        lg: "text-base min-h-12 px-5",
        sm: "min-h-9 text-sm px-3",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
