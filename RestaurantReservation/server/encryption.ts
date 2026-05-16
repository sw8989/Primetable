import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.CREDENTIALS_ENCRYPTION_KEY || "";

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length < 64) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars). Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(KEY_HEX, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(encoded: string): string {
  const key = getKey();
  const parts = encoded.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");
  const [ivHex, tagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}
