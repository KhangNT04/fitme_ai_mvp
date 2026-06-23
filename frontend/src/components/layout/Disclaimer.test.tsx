import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Disclaimer } from "./Disclaimer";
import { AI_DISCLAIMER } from "@/utils/constants";

describe("Disclaimer", () => {
  it("renders AI_DISCLAIMER text from constants", () => {
    render(<Disclaimer />);

    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.getByText(AI_DISCLAIMER)).toBeInTheDocument();
  });
});
