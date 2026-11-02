const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_RESUME_BYTES = 10 * 1024 * 1024;

const imageTypes = {
  "image/jpeg": { extension: "jpg" },
  "image/png": { extension: "png" },
  "image/webp": { extension: "webp" },
};

const uploadCategories = {
  profile: { types: imageTypes, maxBytes: MAX_IMAGE_BYTES },
  about: { types: imageTypes, maxBytes: MAX_IMAGE_BYTES },
  project: { types: imageTypes, maxBytes: MAX_IMAGE_BYTES },
  resume: { types: { "application/pdf": { extension: "pdf" } }, maxBytes: MAX_RESUME_BYTES },
};

export function uploadPolicyFor(category, contentType) {
  const categoryPolicy = uploadCategories[category];
  if (!categoryPolicy) return null;
  const fileType = categoryPolicy.types[contentType];
  if (!fileType) return null;
  return { ...fileType, contentType, maxBytes: categoryPolicy.maxBytes };
}

export function validateUploadedFile(category, contentType, bytes) {
  const policy = uploadPolicyFor(category, contentType);
  if (!policy) return { error: category === "resume"
    ? "Résumé uploads must be PDF files."
    : "Upload a JPG, PNG, or WebP image." };
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) return { error: "Choose a non-empty file." };
  if (bytes.length > policy.maxBytes) {
    const maxMegabytes = policy.maxBytes / (1024 * 1024);
    return { error: `This file is too large. The limit is ${maxMegabytes} MB.`, status: 413 };
  }

  const matchesSignature = contentType === "image/jpeg"
    ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : contentType === "image/png"
      ? bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      : contentType === "image/webp"
        ? bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP"
        : bytes.length >= 5 && bytes.toString("ascii", 0, 5) === "%PDF-";

  if (!matchesSignature) return { error: "The file contents do not match the selected file type." };
  return { policy };
}
