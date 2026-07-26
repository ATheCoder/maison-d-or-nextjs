'use client';
/**
 * Claim beside source (R3.19, D10) — the review a candidate exists for.
 *
 * The admin's job is verification, not sourcing, and the citation is what makes
 * that job possible. So the card puts the claim and the link one line apart,
 * and it is honest about the two ways a claim can be weak:
 *
 *  - **Unverifiable** — the item names a source the search never actually read.
 *    Marked, never hidden: hiding it would silently discard a story that may be
 *    perfectly true, and accepting it must feel different from accepting a
 *    cited one, because it is.
 *  - **Out of window** — the source published far from the edition date. A 2019
 *    feel-good piece presented as today's news is this content type's most
 *    likely failure (R3.20), and the publication date sits right there to catch
 *    it.
 *
 * Accepting publishes and repositions the row; rejecting deletes it. Both are
 * server-side transactions — see acceptCandidate in aiActions.
 */
import { useState } from 'react';
import { acceptCandidate, rejectCandidate, type CandidateKind } from '@/app/admin/daily-gold/aiActions';

export type Candidate = {
  id: number;
  headline: string | null;
  body: string | null;
  /** The year for a moment or an event; nothing for a news story. */
  year?: number | null;
  location?: string | null;
  source_url: string | null;
  source_title: string | null;
  source_published_at?: string | null;
  /** Published far from the edition date (news only). */
  stale?: boolean;
};

export default function CandidateCard({ kind, item, onChanged, onError }: {
  kind: CandidateKind;
  item: Candidate;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    void fn()
      .then((r) => { if (!r.ok) onError(r.error ?? 'That did not work.'); else onChanged(); })
      .finally(() => setBusy(false));
  };

  const host = (() => {
    try { return item.source_url ? new URL(item.source_url).hostname.replace(/^www\./, '') : null; }
    catch { return null; }
  })();

  return (
    <div className="panel" style={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {item.year != null && <span className="chip chip-ink">{item.year < 0 ? `${Math.abs(item.year)} BC` : item.year}</span>}
        {!item.source_url && <span className="chip chip-red">Unverifiable · no source</span>}
        {item.stale && <span className="chip chip-amber">Source is not from this week</span>}
        {item.location && <span className="chip chip-ink">{item.location}</span>}
      </div>

      <div className="serif" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>
        {item.headline || <i>Untitled</i>}
      </div>
      {item.body && <div className="note" style={{ lineHeight: 1.65 }}>{item.body}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {item.source_url ? (
          <a href={item.source_url} target="_blank" rel="noreferrer noopener" style={{ fontSize: 11.5 }}>
            {item.source_title || host || 'the source'} ↗
          </a>
        ) : (
          <span className="note">
            No source came back with this. Check it yourself before it goes near a family.
          </span>
        )}
        {item.source_published_at && (
          <span className="note">published {item.source_published_at.slice(0, 10)}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-sm btn-gold" disabled={busy}
          onClick={() => act(() => acceptCandidate(kind, item.id))}>
          Keep it
        </button>
        <button className="btn btn-sm btn-red" disabled={busy}
          onClick={() => act(() => rejectCandidate(kind, item.id))}>
          Reject
        </button>
      </div>
    </div>
  );
}
