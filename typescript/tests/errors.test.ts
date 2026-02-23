import { describe, it, expect } from "vitest";
import {
  TrailproofError,
  ValidationError,
  StoreError,
  ChainError,
  SignatureError,
} from "../src/errors.js";

describe("Error hierarchy", () => {
  it("ValidationError is a TrailproofError", () => {
    const err = new ValidationError("test");
    expect(err).toBeInstanceOf(TrailproofError);
    expect(err).toBeInstanceOf(Error);
  });

  it("StoreError is a TrailproofError", () => {
    const err = new StoreError("test");
    expect(err).toBeInstanceOf(TrailproofError);
    expect(err).toBeInstanceOf(Error);
  });

  it("ChainError is a TrailproofError", () => {
    const err = new ChainError("test");
    expect(err).toBeInstanceOf(TrailproofError);
    expect(err).toBeInstanceOf(Error);
  });

  it("SignatureError is a TrailproofError", () => {
    const err = new SignatureError("test");
    expect(err).toBeInstanceOf(TrailproofError);
    expect(err).toBeInstanceOf(Error);
  });

  it("TrailproofError is an Error", () => {
    const err = new TrailproofError("test");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("Error instantiation", () => {
  it("ValidationError preserves message", () => {
    const err = new ValidationError("Trailproof: missing required field — actor_id is required");
    expect(err.message).toBe("Trailproof: missing required field — actor_id is required");
    expect(err.name).toBe("ValidationError");
  });

  it("StoreError preserves message", () => {
    const err = new StoreError("Trailproof: write failed — disk full");
    expect(err.message).toBe("Trailproof: write failed — disk full");
    expect(err.name).toBe("StoreError");
  });

  it("ChainError preserves message", () => {
    const err = new ChainError("Trailproof: broken chain — hash mismatch at index 3");
    expect(err.message).toBe("Trailproof: broken chain — hash mismatch at index 3");
    expect(err.name).toBe("ChainError");
  });

  it("SignatureError preserves message", () => {
    const err = new SignatureError("Trailproof: signature mismatch — HMAC verification failed");
    expect(err.message).toBe("Trailproof: signature mismatch — HMAC verification failed");
    expect(err.name).toBe("SignatureError");
  });
});

describe("Error catching", () => {
  it("catches ValidationError as TrailproofError", () => {
    try {
      throw new ValidationError("test");
    } catch (e) {
      expect(e).toBeInstanceOf(TrailproofError);
    }
  });

  it("catches StoreError as TrailproofError", () => {
    try {
      throw new StoreError("test");
    } catch (e) {
      expect(e).toBeInstanceOf(TrailproofError);
    }
  });

  it("catches ChainError as TrailproofError", () => {
    try {
      throw new ChainError("test");
    } catch (e) {
      expect(e).toBeInstanceOf(TrailproofError);
    }
  });

  it("catches SignatureError as TrailproofError", () => {
    try {
      throw new SignatureError("test");
    } catch (e) {
      expect(e).toBeInstanceOf(TrailproofError);
    }
  });

  it("specific error is not caught by sibling type check", () => {
    const err = new ValidationError("test");
    expect(err).not.toBeInstanceOf(StoreError);
    expect(err).not.toBeInstanceOf(ChainError);
    expect(err).not.toBeInstanceOf(SignatureError);
  });
});
