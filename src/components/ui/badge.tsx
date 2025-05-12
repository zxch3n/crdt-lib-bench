import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-black text-white shadow hover:bg-white hover:text-black",
                secondary:
                    "border-transparent bg-white text-black hover:bg-white/80",
                destructive:
                    "border-transparent bg-black text-white shadow hover:bg-black/80",
                outline: "text-white border-white/20",
                success: "border-transparent bg-white text-black shadow hover:bg-white/80",
                warning: "border-transparent bg-white text-black shadow hover:bg-white/80",
                ghost: "border-transparent bg-white/10 text-white",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants } 
