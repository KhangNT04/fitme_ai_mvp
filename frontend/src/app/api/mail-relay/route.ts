import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { parseRelayMessage, secretMatches } from "@/lib/mail-relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-to-server mail relay for the backend (Render Free blocks SMTP ports, Vercel does not).
 * Env: MAIL_RELAY_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD.
 */
export async function POST(request: NextRequest) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!process.env.MAIL_RELAY_SECRET || !user || !pass) {
    return NextResponse.json({ ok: false, error: "relay not configured" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  if (!secretMatches(process.env.MAIL_RELAY_SECRET, body.secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const message = parseRelayMessage(body);
  if (typeof message === "string") {
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 10_000,
      socketTimeout: 20_000,
    });
    const info = await transport.sendMail({
      from: { name: message.fromName, address: user },
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return NextResponse.json({ ok: true, id: info.messageId });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("[mail-relay] send failed:", reason);
    return NextResponse.json({ ok: false, error: "send failed" }, { status: 502 });
  }
}
