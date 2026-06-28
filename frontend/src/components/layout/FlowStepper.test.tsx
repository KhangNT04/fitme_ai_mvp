import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlowStepper, AI_FLOW_STEPS } from "./FlowStepper";

describe("FlowStepper", () => {
  it("highlights current step", () => {
    render(<FlowStepper steps={AI_FLOW_STEPS} currentStep={2} />);
    expect(screen.getByText("Phong cách")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
