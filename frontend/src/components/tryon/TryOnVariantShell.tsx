"use client";

import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";

export interface TryOnVariantItemOption {
  id: string;
  label: string;
  currentValue?: string;
}

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
  items?: TryOnVariantItemOption[];
  selectedItemId?: string;
  onSelectItem?: (id: string) => void;
  currentValueLabel?: string;
  itemsLoading?: boolean;
  itemsError?: boolean;
  onRetryItems?: () => void;
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
  items,
  selectedItemId,
  onSelectItem,
  currentValueLabel = "Hiện tại",
  itemsLoading = false,
  itemsError = false,
  onRetryItems,
}: TryOnVariantShellProps) {
  const selectedItem = items?.find((item) => item.id === selectedItemId);
  const noItems = items !== undefined && items.length === 0;

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
      {itemsLoading ? (
        <LoadingSkeleton type="detail" />
      ) : itemsError ? (
        <ErrorState onRetry={onRetryItems} />
      ) : (
        <>
          {items && items.length > 1 && (
            <div className="mb-6">
              <p className="mb-2 text-sm font-medium">Chọn món muốn thay đổi</p>
              <div className="flex flex-wrap gap-3">
                {items.map((item) => (
                  <Chip
                    key={item.id}
                    selected={selectedItemId === item.id}
                    onClick={() => onSelectItem?.(item.id)}
                  >
                    {item.label}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {noItems && (
            <p className="mb-4 text-sm text-muted-foreground">
              Kết quả thử mặc này chưa có sản phẩm nào để thay đổi.
            </p>
          )}
          {selectedItem?.currentValue && (
            <p className="mb-3 text-sm text-muted-foreground">
              {currentValueLabel} của {selectedItem.label}:{" "}
              <strong className="text-foreground">{selectedItem.currentValue}</strong>
            </p>
          )}
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
          <Button className="mt-6 w-full" disabled={!selected || loading || noItems} onClick={onApply}>
            {loading ? "Đang xử lý..." : applyLabel}
          </Button>
        </>
      )}
    </PageShell>
  );
}
