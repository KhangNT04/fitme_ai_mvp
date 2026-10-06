import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TryOnVariantShell } from "./TryOnVariantShell";

describe("TryOnVariantShell", () => {
  it("disables apply until option selected", () => {
    const onApply = vi.fn();
    render(
      <TryOnVariantShell
        title="So sánh màu"
        subtitle="Thử màu khác"
        options={["Đen", "Trắng"]}
        selected=""
        onSelect={() => {}}
        applyLabel="Áp dụng màu"
        onApply={onApply}
        backHref="/try-on/result/test-id"
      />
    );
    const btn = screen.getByRole("button", { name: "Áp dụng màu" });
    expect(btn).toBeDisabled();
    fireEvent.click(screen.getByText("Đen"));
  });

  it("lets user pick which item to change and shows its current value", () => {
    const onSelectItem = vi.fn();
    render(
      <TryOnVariantShell
        title="So sánh size"
        subtitle="Thử size khác"
        options={["S", "M"]}
        selected="M"
        onSelect={() => {}}
        applyLabel="Áp dụng size"
        onApply={() => {}}
        backHref="/try-on/result/test-id"
        items={[
          { id: "p1", label: "Áo thun", currentValue: "L" },
          { id: "p2", label: "Quần jean" },
        ]}
        selectedItemId="p1"
        onSelectItem={onSelectItem}
        currentValueLabel="Size hiện tại"
      />
    );
    expect(screen.getByText("L")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Quần jean"));
    expect(onSelectItem).toHaveBeenCalledWith("p2");
    expect(screen.getByRole("button", { name: "Áp dụng size" })).toBeEnabled();
  });

  it("disables apply when the try-on has no items", () => {
    render(
      <TryOnVariantShell
        title="So sánh màu"
        subtitle="Thử màu khác"
        options={["Đen"]}
        selected="Đen"
        onSelect={() => {}}
        applyLabel="Áp dụng màu"
        onApply={() => {}}
        backHref="/try-on/result/test-id"
        items={[]}
      />
    );
    expect(screen.getByRole("button", { name: "Áp dụng màu" })).toBeDisabled();
  });
});
