import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SubjectCardProps {
  title: string;
  shortTitle: string;
  description: string;
  href: string;
  status: "live" | "soon";
  comingDate?: string;
}

export function SubjectCard({
  title,
  shortTitle,
  description,
  href,
  status,
  comingDate,
}: SubjectCardProps) {
  const isLive = status === "live";

  const cardInner = (
    <Card
      className={cn(
        "h-full transition-all",
        isLive && "hover:border-primary/50 hover:shadow-md",
        !isLive && "opacity-70",
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {shortTitle}
            </p>
            <CardTitle className="mt-1">{title}</CardTitle>
          </div>
          {!isLive && (
            <Lock
              className="mt-1 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>
        <CardDescription className="pt-2">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLive ? (
          <p className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
            Start practicing
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Coming {comingDate ?? "soon"}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (!isLive) {
    return (
      <div aria-disabled className="group block opacity-100">
        {cardInner}
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-label={`Start ${title}`}
      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {cardInner}
    </Link>
  );
}
