/**
 * The Inngest endpoint — the dev server (`npx inngest-cli dev`) and the hosted
 * platform both discover and invoke this app's functions through it.
 */
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { renderImagesBatch, renderSlot } from '@/lib/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [renderImagesBatch, renderSlot],
});
