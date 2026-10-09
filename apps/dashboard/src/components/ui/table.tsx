import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-[640px] border-collapse text-[13px]", className)} {...props} />
    </div>
  );
}

export function TableHeader(props: ComponentProps<"thead">) {
  return <thead {...props} />;
}

export function TableBody(props: ComponentProps<"tbody">) {
  return <tbody {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("border-t transition-colors hover:bg-accent/60", className)} {...props} />;
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn("px-3 py-2.5 text-left font-medium text-muted-foreground first:pl-5 last:pr-5", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-3 py-3.5 first:pl-5 last:pr-5", className)} {...props} />;
}
