/**
 * The Inngest endpoint — the dev server (`npx inngest-cli dev`) and the hosted
 * platform both discover and invoke this app's functions through it.
 */
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import {
  renderImagesBatch, renderSlot, generateBrief, rewriteField, checkFacts,
  renderDailyGoldSlot, renderDailyGoldImages, runDailyGoldAsk, rewriteDailyGoldField,
  purgeAnalyticsEvents,
} from '@/lib/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    renderImagesBatch, renderSlot, generateBrief, rewriteField, checkFacts,
    renderDailyGoldSlot, renderDailyGoldImages, runDailyGoldAsk, rewriteDailyGoldField,
    // Cron-triggered; registering it here is what puts its schedule on the platform.
    purgeAnalyticsEvents,
  ],
});
