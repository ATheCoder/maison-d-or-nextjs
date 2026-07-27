// design-sync stub for `@/api/base44Client`.
// Preview cards must render offline and deterministically, so every entity
// query resolves empty and every function invoke resolves a neutral success.
// Components that fetch their own data therefore show their empty state in a
// card; anything worth a rich preview is driven by props instead.
type Row = Record<string, unknown>;

const entity = {
  filter: async (): Promise<Row[]> => [],
  list: async (): Promise<Row[]> => [],
  get: async (): Promise<Row | null> => null,
  create: async (): Promise<Row> => ({}),
  update: async (): Promise<Row> => ({}),
  delete: async (): Promise<void> => {},
};

export const base44 = {
  entities: new Proxy({} as Record<string, typeof entity>, {
    get: () => entity,
  }),
  functions: {
    invoke: async (): Promise<{ data: Record<string, unknown> }> => ({ data: {} }),
  },
};
