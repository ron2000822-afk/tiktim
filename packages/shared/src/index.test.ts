import { describe, expect, it } from "vitest";
import { PACKAGE_NAME } from "./index";

describe("@tiktim/shared", () => {
  it("exposes its package name", () => {
    expect(PACKAGE_NAME).toBe("@tiktim/shared");
  });
});
