import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BodyProfileEditor, firstMeasurementError } from "./BodyProfileEditor";

describe("firstMeasurementError", () => {
  it("returns the first errored measurement field in display order", () => {
    expect(
      firstMeasurementError({
        hipCm: { type: "too_small", message: "Tối thiểu 50cm" },
        chestCm: { type: "too_small", message: "Tối thiểu 50cm" },
      }),
    ).toBe("chestCm");
  });

  it("ignores errors outside the detailed measurements", () => {
    expect(firstMeasurementError({ heightCm: { type: "too_small", message: "x" } })).toBeNull();
  });
});

describe("BodyProfileEditor", () => {
  it("expands the collapsed measurements and focuses the invalid field on submit", async () => {
    const onSubmit = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
    render(
      <BodyProfileEditor
        initial={{ heightCm: 165, weightKg: 55, age: 25, gender: "FEMALE", fitPreference: "REGULAR" }}
        onSubmit={onSubmit}
      />,
    );

    const chest = screen.getByLabelText("Ngực (cm)");
    expect(chest.closest(".hidden")).not.toBeNull();

    fireEvent.change(chest, { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(chest.closest(".hidden")).toBeNull());
    expect(await screen.findByText("Tối thiểu 50cm")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng kiểm tra lại");
    await waitFor(() => expect(chest).toHaveFocus());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
