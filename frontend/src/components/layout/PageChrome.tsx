"use client";

import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/layout/BackLink";
import { FlowStepper } from "@/components/layout/FlowStepper";
import { cn } from "@/lib/utils";
import { shouldPinBackLink } from "@/lib/mobile-chrome";
import {
  StickyToolbar,
  StickyToolbarSection,
  scrollToolbarClasses,
} from "@/components/layout/StickyToolbar";

export interface PageChromeProps {
  title: string;
  subtitle?: string;
  showAiBadge?: boolean;
  backHref?: string;
  backLabel?: string;
  steps?: readonly string[];
  currentStep?: number;
  className?: string;
  /** Compact title block — less vertical space for catalog pages */
  dense?: boolean;
  /** When dense, stack back link above title instead of inline (wizard toolbars). */
  stackBackLink?: boolean;
  /** Solid back link (no translucency) */
  solidBackLink?: boolean;
  /** Pin back link, stepper and title below the main nav while scrolling. Default: true */
  sticky?: boolean;
  /** Stepper layout: title above stepper (catalog pickers) vs stepper above title (wizards) */
  titleBeforeStepper?: boolean;
  /** Force pin/unpin back link. Default: auto from route depth (> level 2 pins). */
  pinBackLink?: boolean;
}

function TitleBlock({
  title,
  subtitle,
  showAiBadge,
  dense,
}: Pick<PageChromeProps, "title" | "subtitle" | "showAiBadge" | "dense">) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h1
          className={cn(
            "font-display font-bold tracking-tight text-foreground",
            dense ? "text-base sm:text-xl" : "text-xl sm:text-2xl",
          )}
        >
          {title}
        </h1>
        {showAiBadge && <Badge variant="ai">AI</Badge>}
      </div>
      {subtitle && (
        <p
          className={cn(
            "text-muted-foreground",
            dense
              ? "mt-0.5 line-clamp-1 text-xs sm:text-sm"
              : "mt-1.5 max-w-3xl text-sm leading-relaxed",
          )}
        >
          {subtitle}
        </p>
      )}
    </>
  );
}

function PageChromeBody({
  title,
  subtitle,
  showAiBadge,
  backHref,
  backLabel,
  steps,
  currentStep,
  dense,
  backLinkSolid,
  titleBeforeStepper,
  showBackLink = true,
  stackBackLink,
}: {
  title: string;
  subtitle?: string;
  showAiBadge?: boolean;
  backHref?: string;
  backLabel?: string;
  steps?: readonly string[];
  currentStep?: number;
  dense?: boolean;
  backLinkSolid: boolean;
  titleBeforeStepper?: boolean;
  showBackLink?: boolean;
  stackBackLink?: boolean;
}) {
  const hasStepper = steps != null && currentStep != null;

  if (hasStepper && titleBeforeStepper) {
    return (
      <>
        {showBackLink && backHref && (
          <BackLink href={backHref} label={backLabel} className="mb-2" solid={backLinkSolid} compact={dense} />
        )}
        <TitleBlock title={title} subtitle={subtitle} showAiBadge={showAiBadge} dense={dense} />
        <div className="mt-2 border-t border-border/30 pt-2 sm:mt-3 sm:pt-3">
          <FlowStepper steps={[...steps]} currentStep={currentStep} className="mb-0" />
        </div>
      </>
    );
  }

  if (hasStepper) {
    return (
      <>
        <div className="grid grid-cols-1 items-center gap-2 sm:gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)_minmax(0,1fr)] md:gap-4">
          <div className="min-w-0 md:justify-self-start">
            {showBackLink && backHref ? (
              <BackLink href={backHref} label={backLabel} className="mb-0" solid={backLinkSolid} compact={dense} />
            ) : (
              <span className="hidden md:block" aria-hidden="true" />
            )}
          </div>
          <div className="w-full md:justify-self-center">
            <FlowStepper steps={[...steps]} currentStep={currentStep} className="mb-0" />
          </div>
          <span className="hidden md:block" aria-hidden="true" />
        </div>
        <div className="mt-2 border-t border-border/30 pt-2 sm:mt-3 sm:pt-3">
          <TitleBlock title={title} subtitle={subtitle} showAiBadge={showAiBadge} dense={dense} />
        </div>
      </>
    );
  }

  if (dense && backHref && showBackLink && !stackBackLink) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:gap-x-3 sm:gap-y-2">
        <BackLink href={backHref} label={backLabel} className="mb-0 shrink-0" solid={backLinkSolid} compact />
        <div className="min-w-0">
          <TitleBlock title={title} subtitle={subtitle} showAiBadge={showAiBadge} dense={dense} />
        </div>
      </div>
    );
  }

  if (dense && backHref && showBackLink && stackBackLink) {
    return (
      <>
        <BackLink href={backHref} label={backLabel} className="mb-2" solid={backLinkSolid} compact />
        <TitleBlock title={title} subtitle={subtitle} showAiBadge={showAiBadge} dense={dense} />
      </>
    );
  }

  return (
    <>
      {showBackLink && backHref && (
        <BackLink href={backHref} label={backLabel} className="mb-3" solid={backLinkSolid} />
      )}
      <TitleBlock title={title} subtitle={subtitle} showAiBadge={showAiBadge} dense={dense} />
    </>
  );
}

export function PageChrome({
  title,
  subtitle,
  showAiBadge,
  backHref,
  backLabel,
  steps,
  currentStep,
  className,
  dense,
  solidBackLink,
  sticky = true,
  titleBeforeStepper,
  pinBackLink,
  stackBackLink,
}: PageChromeProps) {
  const pathname = usePathname() ?? "/";
  const backLinkSolid = solidBackLink ?? sticky;
  const pinBack = pinBackLink ?? (backHref ? shouldPinBackLink(pathname) : false);

  const body = (
    <PageChromeBody
      title={title}
      subtitle={subtitle}
      showAiBadge={showAiBadge}
      backHref={backHref}
      backLabel={backLabel}
      steps={steps}
      currentStep={currentStep}
      dense={dense}
      backLinkSolid={backLinkSolid}
      titleBeforeStepper={titleBeforeStepper}
      showBackLink={!pinBack}
      stackBackLink={stackBackLink}
    />
  );

  if (pinBack && backHref) {
    return (
      <>
        <StickyToolbar className={cn("mb-0 rounded-b-none border-b-0 shadow-sm", className)}>
          <StickyToolbarSection className="py-1.5 sm:py-2">
            <BackLink
              href={backHref}
              label={backLabel}
              solid={backLinkSolid}
              compact={dense ?? true}
              className="mb-0"
            />
          </StickyToolbarSection>
        </StickyToolbar>
        <div className={cn(scrollToolbarClasses, "mb-3 sm:mb-4")}>{body}</div>
      </>
    );
  }

  if (sticky) {
    return (
      <StickyToolbar className={className}>
        <StickyToolbarSection>{body}</StickyToolbarSection>
      </StickyToolbar>
    );
  }

  return (
    <div className={cn("page-chrome", dense ? "mb-0" : "mb-6", className)}>
      {body}
    </div>
  );
}
