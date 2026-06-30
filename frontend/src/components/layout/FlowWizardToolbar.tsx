"use client";

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
        <FlowStepper
          steps={stepList}
          currentStep={currentStep}
          compact
          inline
          className="mb-0"
        />
      }
    />
  );
}
