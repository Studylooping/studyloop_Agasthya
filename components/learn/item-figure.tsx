import type { ItemFigure as ItemFigureType } from "@/lib/content/types";
import { cn } from "@/lib/utils";

interface ItemFigureProps {
  figure: ItemFigureType;
  className?: string;
}

export function ItemFigure({ figure, className }: ItemFigureProps) {
  return (
    <figure
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="overflow-hidden">
        <div
          aria-label={figure.description}
          className="w-full [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: figure.svg }}
          role="img"
        />
      </div>
    </figure>
  );
}
