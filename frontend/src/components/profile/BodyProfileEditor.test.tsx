import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

// The full suite runs many jsdom files in parallel; default 1s waits / 5s test timeout flake under load.
const ASYNC_OPTS = { timeout: 5000 };

describe("BodyProfileEditor", () => {
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it("expands the collapsed measurements and focuses the invalid field on submit", { timeout: 20_000 }, async () => {
    const onSubmit = vi.fn();
    render(
      <BodyProfileEditor
        initial={{ heightCm: 165, weightKg: 55, age: 25, gender: "FEMALE", fitPreference: "REGULAR" }}
        onSubmit={onSubmit}
      />,
    );

    const chest = await screen.findByLabelText("Ngực (cm)", {}, ASYNC_OPTS);
    expect(chest.closest(".hidden")).not.toBeNull();

    fireEvent.change(chest, { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(await screen.findByText("Tối thiểu 50cm", {}, ASYNC_OPTS)).toBeInTheDocument();
    await waitFor(() => expect(chest.closest(".hidden")).toBeNull(), ASYNC_OPTS);
    expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng kiểm tra lại");
    await waitFor(() => expect(chest).toHaveFocus(), ASYNC_OPTS);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
