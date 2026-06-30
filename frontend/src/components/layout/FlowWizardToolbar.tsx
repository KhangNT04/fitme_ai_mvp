"use client";

import type { ReactNode } from "react";
import { FlowStepper } from "@/components/layout/FlowStepper";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";

export interface FlowWizardToolbarProps {
  title: string;
  subtitle?: string;
  showAiBadge?: boolean;
  backHref?: string;
  backLabel?: string;
  steps: readonly string[];
  currentStep: number;
  className?: string;
  /** Extra controls shown beside the stepper (search, filters, …). */
  trailing?: ReactNode;
}

/** Sticky title; stepper expands below and merges right when scrolled. */
export function FlowWizardToolbar({
  title,
  subtitle,
  showAiBadge,
  backHref,
  backLabel,
  steps,
  currentStep,
  className,
  trailing,
}: FlowWizardToolbarProps) {
  const stepList = [...steps];

  return (
    <CollapsingPageHeader
      title={title}
      subtitle={subtitle}
      showAiBadge={showAiBadge}
      backHref={backHref}
      backLabel={backLabel}
      className={className}
      trailing={
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {trailing}
          <FlowStepper
            steps={stepList}
            currentStep={currentStep}
            compact
            inline
            className="mb-0 shrink-0"
          />
        </div>
      }
    />
  );
}
