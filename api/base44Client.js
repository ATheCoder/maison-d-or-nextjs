import { createClient } from '@base44/sdk';

export const base44 = createClient({
  appId: process.env.NEXT_PUBLIC_BASE44_APP_ID ?? '69dba1f66d3b6e4e9e515e5c',
  headers: {
    api_key: process.env.NEXT_PUBLIC_BASE44_API_KEY ?? 'a583b146482742d5930736abb79b966f',
  },
});
