import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins headers and rows with CRLF and ends with a newline", () => {
    expect(toCsv(["email", "status"], [["a@b.com", "verified"]])).toBe(
      "email,status\r\na@b.com,verified\r\n",
    );
  });

  it("quotes cells containing commas, quotes or newlines", () => {
    expect(
      toCsv(
        ["email", "note"],
        [
          ['"weird,email"@example.com', "line1\nline2"],
          [null, undefined],
        ],
      ),
    ).toBe('email,note\r\n"""weird,email""@example.com","line1\nline2"\r\n,\r\n');
  });

  it("leaves plain numbers unquoted", () => {
    expect(toCsv(["n"], [[42]])).toBe("n\r\n42\r\n");
  });
});
