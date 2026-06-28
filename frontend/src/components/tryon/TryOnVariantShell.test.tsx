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
});
