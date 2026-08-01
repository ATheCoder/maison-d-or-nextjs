import 'server-only';
/**
 * Outbound email — one thin seam the whole app sends through.
 *
 * Provider: Resend, called over plain `fetch` (no SDK, no dependency to keep
 * current). It is used only when `RESEND_API_KEY` is set; with no key — the
 * normal state of a developer machine — the message is printed to the server
 * console instead and reported as sent. That is deliberate: signup, invites and
 * password resets must work end to end locally, and a console line carrying the
 * real reset link is the fastest way to finish the flow.
 *
 * Nothing here ever throws. Callers are Better Auth hooks and server actions
 * where a mail outage must not become a failed signup or a lost invite, so a
 * delivery failure is logged and returned as `{ ok: false }`.
 *
 * Environment:
 *   RESEND_API_KEY — enables real delivery; absent means console fallback.
 *   EMAIL_FROM     — the From header, e.g. "Maison d'Ore <hello@yourdomain>".
 *                    Defaults to Resend's shared onboarding sender, which only
 *                    delivers to the account owner — set your own in production.
 */
import { BRAND_NAME } from '@/components/maison/MaisonBrandName';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = `${BRAND_NAME} <onboarding@resend.dev>`;

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Generated from the HTML when omitted. */
  text?: string;
};

export type SendEmailResult = { ok: boolean; error?: string };

const from = () => process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;

/** Crude but adequate fallback so no message ships HTML-only. */
const stripTags = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h1|h2|div|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<SendEmailResult> {
  const body = { from: from(), to: [to], subject, html, text: text ?? stripTags(html) };
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    // Dev fallback: the whole message, links included, on the server console.
    console.info(
      [
        '',
        '──────── email (no RESEND_API_KEY — not actually sent) ────────',
        `from:    ${body.from}`,
        `to:      ${to}`,
        `subject: ${subject}`,
        '',
        body.text,
        '───────────────────────────────────────────────────────────────',
        '',
      ].join('\n'),
    );
    return { ok: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`[email] Resend refused the message (${res.status}): ${detail.slice(0, 500)}`);
      return { ok: false, error: `Email provider returned ${res.status}.` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[email] Resend request failed:', err);
    return { ok: false, error: 'Could not reach the email provider.' };
  }
}

// ── Branded template ─────────────────────────────────────────────────────────

const C = {
  gold: '#C9A96E',
  ivory: '#F5F0E7',
  card: '#FFF8EE',
  ink: '#241A0C',
  brown: '#5C4A2A',
  muted: '#8B7355',
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type BrandedEmailInput = {
  /** Serif headline at the top of the card. */
  heading: string;
  /** One or two short paragraphs of plain text. */
  body: string[];
  action?: { label: string; url: string };
  /** Small print under the button — expiry, "ignore this if…", etc. */
  footnote?: string;
};

/**
 * The house style, as one card on an ivory field: gold eyebrow wordmark, serif
 * headline, warm body copy, a single gold button. Table-based and fully inline
 * because email clients drop <style> blocks and modern layout alike.
 *
 * The action URL is repeated as text below the button — plenty of clients
 * strip or mangle links, and a reset that cannot be completed is worse than an
 * ugly one.
 */
export function brandedEmail({ heading, body, action, footnote }: BrandedEmailInput): { html: string; text: string } {
  const paragraphs = body
    .map(
      (p) =>
        `<p style="margin:0 0 0.9em;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${C.brown};">${escapeHtml(p)}</p>`,
    )
    .join('');

  const button = action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:1.4em 0 0.9em;">
          <tr><td style="border-radius:12px;background:${C.gold};">
            <a href="${escapeHtml(action.url)}" style="display:inline-block;padding:13px 28px;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#FFFFFF;text-decoration:none;">${escapeHtml(action.label)}</a>
          </td></tr>
        </table>
        <p style="margin:0 0 0.6em;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${C.muted};word-break:break-all;">
          Or paste this into your browser:<br /><a href="${escapeHtml(action.url)}" style="color:${C.gold};">${escapeHtml(action.url)}</a>
        </p>`
    : '';

  const foot = footnote
    ? `<p style="margin:1.2em 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${C.muted};">${escapeHtml(footnote)}</p>`
    : '';

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:${C.ivory};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ivory};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:${C.card};border:1px solid rgba(201,169,110,0.35);border-radius:18px;">
        <tr><td style="padding:36px 32px 32px;">
          <p style="margin:0 0 0.5em;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:${C.gold};">
            ${escapeHtml(BRAND_NAME)} &mdash; Daily Gold
          </p>
          <h1 style="margin:0 0 1em;font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:600;line-height:1.3;color:${C.ink};">
            ${escapeHtml(heading)}
          </h1>
          ${paragraphs}
          ${button}
          ${foot}
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${C.muted};">
        ${escapeHtml(BRAND_NAME)} &middot; a family's reading house
      </p>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `${BRAND_NAME} — Daily Gold`,
    '',
    heading,
    '',
    ...body,
    ...(action ? ['', `${action.label}: ${action.url}`] : []),
    ...(footnote ? ['', footnote] : []),
  ].join('\n');

  return { html, text };
}
