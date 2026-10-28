import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CommunityFilterBar, type CommunityFeedFilters } from "./CommunityFilterBar";
import type { CommunityFilterOptions } from "@/types";

const OPTIONS: CommunityFilterOptions = {
  styles: [
    { value: "Minimal", label: "Minimal", count: 12 },
    { value: "Streetwear", label: "Streetwear", count: 4 },
  ],
  occasions: [{ value: "Đi làm", label: "Đi làm", count: 7 }],
  brands: [{ value: "b-1", label: "Teelab", count: 3 }],
};

function renderBar(value: CommunityFeedFilters = {}, onChange = vi.fn()) {
  render(<CommunityFilterBar options={OPTIONS} value={value} onChange={onChange} />);
  return onChange;
}

describe("CommunityFilterBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the filter panel closed until the reader asks for it", () => {
    renderBar();

    expect(screen.queryByText("Phong cách")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bộ lọc/i })).toBeInTheDocument();
  });

  it("shows the styles, occasions and brands with their counts", () => {
    renderBar();

    fireEvent.click(screen.getByRole("button", { name: /Bộ lọc/i }));

    expect(screen.getByText("Phong cách")).toBeInTheDocument();
    expect(screen.getByText("Dịp mặc")).toBeInTheDocument();
    expect(screen.getByText("Thương hiệu")).toBeInTheDocument();
    expect(screen.getByText(/Minimal/)).toBeInTheDocument();
    expect(screen.getByText(/Teelab/)).toBeInTheDocument();
  });

  it("picks one value per group", () => {
    const onChange = renderBar();

    fireEvent.click(screen.getByRole("button", { name: /Bộ lọc/i }));
    fireEvent.click(screen.getByText(/Minimal/));

    expect(onChange).toHaveBeenCalledWith({ styleLabel: "Minimal" });
  });

  it("clears a value when the reader picks it again", () => {
    const onChange = renderBar({ styleLabel: "Minimal" });

    fireEvent.click(screen.getByRole("button", { name: /Bộ lọc/i }));
    fireEvent.click(screen.getByText(/Minimal/));

    expect(onChange).toHaveBeenCalledWith({ styleLabel: undefined });
  });

  it("offers a way to drop every filter at once", () => {
    const onChange = renderBar({ styleLabel: "Minimal" });

    fireEvent.click(screen.getByRole("button", { name: /Xoá lọc/i }));

    expect(onChange).toHaveBeenCalledWith({});
  });

  it("hides itself when there is nothing to filter by", () => {
    render(
      <CommunityFilterBar
        options={{ styles: [], occasions: [], brands: [] }}
        value={{}}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /Bộ lọc/i })).not.toBeInTheDocument();
  });
});
