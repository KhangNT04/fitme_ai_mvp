import { timingSafeEqual } from "node:crypto";

export interface RelayMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  fromName: string;
}

const EMAIL_PATTERN = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
const MAX_SUBJECT = 200;
const MAX_BODY = 200_000;

export function secretMatches(expected: string | undefined, provided: unknown): boolean {
  if (!expected || typeof provided !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Validates the backend's relay payload; one recipient only so the relay cannot be used for bulk mail. */
export function parseRelayMessage(body: Record<string, unknown>): RelayMessage | string {
  const { to, subject, text, html, fromName } = body;
  if (typeof to !== "string" || !EMAIL_PATTERN.test(to.trim())) return "invalid recipient";
  if (typeof subject !== "string" || !subject.trim() || subject.length > MAX_SUBJECT) return "invalid subject";
  if (typeof text !== "string" || text.length > MAX_BODY) return "invalid text";
  if (html !== undefined && (typeof html !== "string" || html.length > MAX_BODY)) return "invalid html";
  const name = typeof fromName === "string" && fromName.trim() ? fromName.trim().replace(/["<>\r\n]/g, "") : "FitMe AI";
  return { to: to.trim(), subject: subject.replace(/[\r\n]+/g, " ").trim(), text, html, fromName: name.slice(0, 60) };
}
