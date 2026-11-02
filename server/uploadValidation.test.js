import test from "node:test";
import assert from "node:assert/strict";
import { uploadPolicyFor, validateUploadedFile } from "./uploadValidation.js";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const pdf = Buffer.from("%PDF-1.7\n");

test("allows only image uploads for portfolio photo categories", () => {
  assert.equal(uploadPolicyFor("profile", "image/png").extension, "png");
  assert.equal(uploadPolicyFor("about", "image/jpeg").extension, "jpg");
  assert.equal(uploadPolicyFor("project", "image/webp").extension, "webp");
  assert.equal(uploadPolicyFor("project", "application/pdf"), null);
  assert.equal(uploadPolicyFor("other", "image/png"), null);
});

test("allows PDF résumé uploads and validates file signatures", () => {
  assert.equal(validateUploadedFile("resume", "application/pdf", pdf).policy.extension, "pdf");
  assert.match(validateUploadedFile("resume", "application/pdf", png).error, /contents do not match/);
  assert.match(validateUploadedFile("profile", "image/png", pdf).error, /contents do not match/);
});

test("rejects empty and oversized uploads", () => {
  assert.match(validateUploadedFile("profile", "image/png", Buffer.alloc(0)).error, /non-empty/);
  const oversizedImage = Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]);
  assert.match(validateUploadedFile("profile", "image/png", oversizedImage).error, /too large/);
  const oversizedResume = Buffer.concat([pdf, Buffer.alloc(10 * 1024 * 1024)]);
  assert.match(validateUploadedFile("resume", "application/pdf", oversizedResume).error, /too large/);
});
