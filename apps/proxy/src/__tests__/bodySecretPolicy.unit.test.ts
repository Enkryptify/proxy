import { describe, expect, test } from "bun:test";
import {
  getContentTypeMediaType,
  shouldApplySecretSubstitutionToBody,
} from "@/lib/utils/bodySecretPolicy";

describe("getContentTypeMediaType", () => {
  test("strips parameters and lowercases", () => {
    expect(
      getContentTypeMediaType({
        "Content-Type": 'application/json; charset=utf-8',
      }),
    ).toBe("application/json");
  });

  test("matches header name case-insensitively", () => {
    expect(getContentTypeMediaType({ "content-type": "text/plain" })).toBe("text/plain");
  });
});

describe("shouldApplySecretSubstitutionToBody (security / reliability)", () => {
  test("never treats base64-encoded body as text", () => {
    expect(shouldApplySecretSubstitutionToBody("application/pdf", "base64", "SGVsbG8=")).toBe(false);
  });

  test("allows substitution for JSON and XML media types", () => {
    expect(shouldApplySecretSubstitutionToBody("application/json", undefined, {})).toBe(true);
    expect(shouldApplySecretSubstitutionToBody("application/xml", undefined, "<a/>")).toBe(true);
    expect(shouldApplySecretSubstitutionToBody("text/plain", undefined, "x")).toBe(true);
  });

  test("blocks substitution for binary-like explicit types", () => {
    expect(shouldApplySecretSubstitutionToBody("application/pdf", undefined, "x")).toBe(false);
    expect(shouldApplySecretSubstitutionToBody("image/png", undefined, "x")).toBe(false);
  });

  test("vendor +json and +xml are allowed", () => {
    expect(shouldApplySecretSubstitutionToBody("application/vnd.api+json", undefined, {})).toBe(true);
    expect(shouldApplySecretSubstitutionToBody("application/atom+xml", undefined, "<a/>")).toBe(true);
  });
});
