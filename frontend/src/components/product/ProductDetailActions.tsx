import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductDetailActionsProps {
  productId: string;
  aiTryOnEligible?: boolean;
  onConsult: () => void;
  onTryOn?: () => void;
  className?: string;
}

export function ProductDetailActions({
  productId,
  aiTryOnEligible,
  onConsult,
  onTryOn,
  className,
}: ProductDetailActionsProps) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <Button variant="ai" onClick={onConsult}>
        <Sparkles className="mr-2 h-4 w-4" />
        Tư vấn size & phối đồ bằng AI
      </Button>
      {aiTryOnEligible && onTryOn ? (
        <Button variant="outline" onClick={onTryOn}>
          Thử mặc bằng AI
        </Button>
      ) : aiTryOnEligible ? (
        <Button variant="outline" asChild>
          <Link href={`/try-on?product=${productId}`}>Thử mặc bằng AI</Link>
        </Button>
      ) : null}
      <Button variant="outline" asChild>
        <Link href={`/redirect/confirm/${productId}`}>Mua ngay</Link>
      </Button>
    </div>
  );
}
