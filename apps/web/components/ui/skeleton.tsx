import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md sl-shimmer", className)}
      {...props}
    />
  )
}

export { Skeleton }
