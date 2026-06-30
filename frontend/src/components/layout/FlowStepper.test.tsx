import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollapsingHeaderContext } from "@/hooks/use-collapsing-header";
import { FlowStepper, AI_FLOW_STEPS } from "./FlowStepper";

describe("FlowStepper", () => {
  it("highlights current step", () => {
    render(<FlowStepper steps={AI_FLOW_STEPS} currentStep={2} />);
    expect(screen.getByText("Phong cách")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows stage labels in compact inline header mode", () => {
    render(<FlowStepper steps={AI_FLOW_STEPS} currentStep={0} compact inline />);
    expect(screen.getByText("Cơ thể")).toBeInTheDocument();
    expect(screen.getByText("Hoàn cảnh")).toBeInTheDocument();
  });

  it("hides stage labels when header is scroll-compact", () => {
    render(
      <CollapsingHeaderContext.Provider value={{ scrollCompact: true }}>
        <FlowStepper steps={AI_FLOW_STEPS} currentStep={0} compact inline />
      </CollapsingHeaderContext.Provider>,
    );
    expect(screen.queryByText("Cơ thể")).not.toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
