import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlowStepper, AI_FLOW_STEPS } from "./FlowStepper";

describe("FlowStepper", () => {
  it("highlights current step", () => {
    render(<FlowStepper steps={AI_FLOW_STEPS} currentStep={2} />);
    expect(screen.getByText("Đang xử lý")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows stage labels in compact inline header mode", () => {
    render(<FlowStepper steps={AI_FLOW_STEPS} currentStep={0} compact inline />);
    expect(screen.getByText("Hồ sơ")).toBeInTheDocument();
    expect(screen.getByText("Kết quả")).toBeInTheDocument();
  });

  it("renders without crashing when compact", () => {
    const { container } = render(
      <div data-scroll-compact="">
        <FlowStepper steps={AI_FLOW_STEPS} currentStep={0} compact inline />
      </div>,
    );
    expect(container.querySelector('[role="navigation"]')).toBeTruthy();
  });
});
