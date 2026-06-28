import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageShell } from "./PageShell";

describe("PageShell", () => {
  it("renders children with narrow width by default", () => {
    const { container } = render(<PageShell><p>Content</p></PageShell>);
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("max-w-xl");
  });

  it("applies wide width class", () => {
    const { container } = render(<PageShell width="wide"><p>Wide</p></PageShell>);
    expect(container.firstChild).toHaveClass("max-w-4xl");
  });
});
