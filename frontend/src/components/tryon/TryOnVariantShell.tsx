"use client";

import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";

interface TryOnVariantShellProps {
  title: string;
  subtitle: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  applyLabel: string;
  onApply: () => void;
  loading?: boolean;
  stepperStep?: number;
  chipClassName?: string;
  backHref: string;
  backLabel?: string;
}

export function TryOnVariantShell({
  title,
  subtitle,
  options,
  selected,
  onSelect,
  applyLabel,
  onApply,
  loading = false,
  stepperStep = 3,
  chipClassName,
  backHref,
  backLabel = "Kết quả thử mặc",
}: TryOnVariantShellProps) {
  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={TRYON_FLOW_STEPS}
        currentStep={stepperStep}
        title={title}
        subtitle={subtitle}
        showAiBadge
        backHref={backHref}
        backLabel={backLabel}
      />
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <Chip
            key={opt}
            selected={selected === opt}
            onClick={() => onSelect(opt)}
            className={chipClassName}
          >
            {opt}
          </Chip>
        ))}
      </div>
      <Disclaimer className="mt-6" />
      <Button className="mt-6 w-full" disabled={!selected || loading} onClick={onApply}>
        {loading ? "Đang xử lý..." : applyLabel}
      </Button>
    </PageShell>
  );
}
