import { describe, expect, it } from "vitest";
import { sanitizeDatabaseUrl } from "../../backend/database-url.mjs";

describe("sanitizeDatabaseUrl", () => {
  it("removes Neon channel_binding without corrupting the remaining query string", () => {
    expect(
      sanitizeDatabaseUrl(
        "postgresql://owner:password@example.neon.tech/neondb?channel_binding=require&sslmode=require",
        "production",
      ),
    ).toBe("postgresql://owner:password@example.neon.tech/neondb?sslmode=require");
  });

  it("preserves parameters before and after channel_binding", () => {
    expect(
      sanitizeDatabaseUrl(
        "postgresql://owner:password@example.neon.tech/neondb?application_name=forms&channel_binding=require&sslmode=require",
        "production",
      ),
    ).toBe("postgresql://owner:password@example.neon.tech/neondb?application_name=forms&sslmode=require");
  });

  it("adds sslmode in production when the URL does not provide it", () => {
    expect(
      sanitizeDatabaseUrl(
        "postgresql://owner:password@example.neon.tech/neondb?channel_binding=require",
        "production",
      ),
    ).toBe("postgresql://owner:password@example.neon.tech/neondb?sslmode=require");
  });
});
