import { describe, expect, it } from "vitest";
import { CreateAgentInput, buildSystemPrompt, slugify } from "./agent";

const valid = {
  name: "Satoshi Cat",
  ticker: "scat",
  persona: "A sarcastic cat who explains blockchain concepts simply.",
  creatorAddress: "0x" + "a".repeat(40),
};

describe("CreateAgentInput", () => {
  it("menerima input valid dan uppercase ticker", () => {
    const parsed = CreateAgentInput.parse(valid);
    expect(parsed.ticker).toBe("SCAT");
  });

  it("menolak nama yang meniru brand", () => {
    expect(CreateAgentInput.safeParse({ ...valid, name: "Robinhood AI" }).success).toBe(false);
  });

  it("menolak ticker tidak valid", () => {
    expect(CreateAgentInput.safeParse({ ...valid, ticker: "a" }).success).toBe(false);
    expect(CreateAgentInput.safeParse({ ...valid, ticker: "AB-C" }).success).toBe(false);
  });

  it("menolak alamat wallet tidak valid", () => {
    expect(CreateAgentInput.safeParse({ ...valid, creatorAddress: "0x123" }).success).toBe(false);
  });
});

describe("slugify", () => {
  it("membuat slug aman", () => {
    expect(slugify("  Satoshi Cat!! v2 ")).toBe("satoshi-cat-v2");
  });
});

describe("buildSystemPrompt", () => {
  it("memasukkan persona di dalam tag dan aturan platform", () => {
    const prompt = buildSystemPrompt({ name: "X", ticker: "XX", persona: "hello persona" });
    expect(prompt).toContain("<persona>\nhello persona\n</persona>");
    expect(prompt).toContain("Never give financial advice");
  });
});
