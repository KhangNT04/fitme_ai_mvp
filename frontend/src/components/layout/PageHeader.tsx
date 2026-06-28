import { PageChrome, type PageChromeProps } from "@/components/layout/PageChrome";

export type PageHeaderProps = PageChromeProps;

/** Sticky page chrome: back link, optional flow stepper, title & subtitle. */
export function PageHeader(props: PageHeaderProps) {
  return <PageChrome {...props} />;
}
