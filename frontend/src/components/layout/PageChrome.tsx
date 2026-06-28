import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/layout/BackLink";
import { FlowStepper } from "@/components/layout/FlowStepper";
import { cn } from "@/lib/utils";
import {
  StickyToolbar,
  StickyToolbarSection,
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
  /** Solid back link (no translucency) */
  solidBackLink?: boolean;
  /** Pin back link, stepper and title below the main nav while scrolling. Default: true */
  sticky?: boolean;
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
            dense ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
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
              : "mt-1.5 max-w-3xl text-sm leading-relaxed"
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
}) {
  const hasStepper = steps != null && currentStep != null;

  if (hasStepper) {
    return (
      <>
        <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)_minmax(0,1fr)] md:gap-4">
          <div className="min-w-0 md:justify-self-start">
            {backHref ? (
              <BackLink href={backHref} label={backLabel} className="mb-0" solid={backLinkSolid} />
            ) : (
              <span className="hidden md:block" aria-hidden="true" />
            )}
          </div>
          <div className="w-full md:justify-self-center">
            <FlowStepper steps={[...steps]} currentStep={currentStep} className="mb-0" />
          </div>
          <span className="hidden md:block" aria-hidden="true" />
        </div>
        <div className="mt-3 border-t border-border/30 pt-3">
          <TitleBlock title={title} subtitle={subtitle} showAiBadge={showAiBadge} dense={dense} />
        </div>
      </>
    );
  }

  if (dense && backHref) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <BackLink href={backHref} label={backLabel} className="mb-0 shrink-0" solid={backLinkSolid} />
        <div className="min-w-0">
          <TitleBlock title={title} subtitle={subtitle} showAiBadge={showAiBadge} dense={dense} />
        </div>
      </div>
    );
  }

  return (
    <>
      {backHref && (
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
}: PageChromeProps) {
  const backLinkSolid = solidBackLink ?? sticky;

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
    />
  );

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
