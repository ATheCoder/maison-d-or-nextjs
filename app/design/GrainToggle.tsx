'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import Button from '@/components/ds/Button';

/**
 * §5.4 — the same panels with grain on and off. The kill switch is the one
 * globals.css designed in: --grain-image: none on the wrapper empties every
 * descendant grain overlay (texture-paper and .section-dark alike) without
 * touching the vignette or the token scopes. §3.1's acceptance bar: the grain
 * must only be noticeable when toggled OFF. The section this sits in must NOT
 * be grained itself, or the parent's overlay would keep painting over the
 * "off" state — page.tsx keeps this section's ground bare for that reason.
 */
export default function GrainToggle() {
  const [on, setOn] = useState(true);

  return (
    <div>
      <div className="mb-5 flex items-center gap-4">
        <Button variant="ghost" aria-pressed={on} onClick={() => setOn((v) => !v)}>
          Grain: {on ? 'on' : 'off'}
        </Button>
        <p className="type-caption">Done right, you only see it when it leaves.</p>
      </div>

      <div style={on ? undefined : ({ '--grain-image': 'none' } as CSSProperties)}>
        <div className="texture-paper border border-fine bg-surface-page px-8 py-10">
          <p className="type-label-editorial text-accent">On parchment</p>
          <hr className="rule-accent mt-2 mb-4" />
          <p className="type-body max-w-[34rem] text-secondary">
            Multiply at 6% — aged paper, not an Instagram filter. Toggle and watch the
            surface, not the ink.
          </p>
        </div>
        <div className="section-dark px-8 py-10">
          <p className="type-label-editorial text-accent">On espresso</p>
          <hr className="rule-accent mt-2 mb-4" />
          <p className="type-body max-w-[34rem] text-secondary">
            Screen at 9% — grain reads less on dark, so it comes up a step and the flecks
            catch light instead of shadow. The vignette stays either way; only the grain
            is on trial here.
          </p>
        </div>
      </div>
    </div>
  );
}
