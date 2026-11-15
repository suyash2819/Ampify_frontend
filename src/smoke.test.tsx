import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

test("test setup works", () => {
  render(<h1>Ampify</h1>);
  expect(screen.getByText("Ampify")).toBeInTheDocument();
});
