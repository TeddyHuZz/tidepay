import { generateKeyPairSync, sign } from "node:crypto";
import { baseDecode } from "near-api-js";
import { describe, expect, it } from "vitest";
import {
  NEAR_DERIVE_MESSAGE,
  NearDerivationMismatchError,
  assertStableDerivation,
  implicitAccountId,
  keyPairFromSignature,
} from "./derive-key";

const sigA = new Uint8Array(64).map((_, i) => i);
const sigB = new Uint8Array(64).map((_, i) => 255 - i);

describe("keyPairFromSignature", () => {
  it("is deterministic and signature-specific", async () => {
    const a1 = await keyPairFromSignature(sigA);
    const a2 = await keyPairFromSignature(sigA);
    const b = await keyPairFromSignature(sigB);
    expect(a1.getPublicKey().toString()).toBe(a2.getPublicKey().toString());
    expect(a1.getPublicKey().toString()).not.toBe(b.getPublicKey().toString());
  });

  it("produces a valid key pair whose public key matches its secret", async () => {
    const kp = await keyPairFromSignature(sigA);
    const msg = new TextEncoder().encode("hello");
    const { signature } = kp.sign(msg);
    expect(kp.getPublicKey().verify(msg, signature)).toBe(true);
  });

  it("rejects a signature that is not 64 bytes", async () => {
    await expect(keyPairFromSignature(new Uint8Array(10))).rejects.toThrow(/64/);
  });
});

describe("implicitAccountId", () => {
  it("is the 64-char lowercase hex of the public key bytes", async () => {
    const kp = await keyPairFromSignature(sigA);
    const id = implicitAccountId(kp);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    const raw = baseDecode(kp.getPublicKey().toString().replace("ed25519:", ""));
    expect(id).toBe(Buffer.from(raw).toString("hex"));
  });
});

describe("derivation message", () => {
  it("is pinned: changing it would orphan every merchant's NEAR account", () => {
    expect(NEAR_DERIVE_MESSAGE("So1anaAddr")).toBe("TidePay NEAR account v1\nSo1anaAddr");
  });

  it("ed25519 signatures over it are deterministic (the assumption the scheme relies on)", () => {
    const { privateKey } = generateKeyPairSync("ed25519");
    const msg = Buffer.from(NEAR_DERIVE_MESSAGE("So1anaAddr"));
    expect(sign(null, msg, privateKey).equals(sign(null, msg, privateKey))).toBe(true);
  });
});

describe("assertStableDerivation", () => {
  it("accepts a first derivation and a repeat of the same key", () => {
    expect(() => assertStableDerivation(null, "ed25519:abc")).not.toThrow();
    expect(() => assertStableDerivation("ed25519:abc", "ed25519:abc")).not.toThrow();
  });

  it("throws when the wallet now derives a different key", () => {
    expect(() => assertStableDerivation("ed25519:abc", "ed25519:xyz")).toThrow(NearDerivationMismatchError);
  });
});
