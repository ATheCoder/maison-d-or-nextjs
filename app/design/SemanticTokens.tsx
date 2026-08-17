import Rule from '@/components/ds/Rule';

/**
 * §5.2 — the semantic token set rendered once per surface scope, side by
 * side. Every column is the SAME markup: only the wrapping data-surface
 * differs, which is the whole §1.2 architecture demonstrated — children
 * restyle with zero per-component logic. Ordered light-first: the five warm
 * light grounds lead, the cinematic interludes close.
 */
const SCOPES = [
  { key: 'light', label: 'Light (parchment)', className: 'texture-paper bg-surface-page' },
  { key: 'sage', label: 'Sage — the garden', className: 'texture-paper bg-surface-page' },
  { key: 'rose', label: 'Rose — the family', className: 'texture-paper bg-surface-page' },
  { key: 'lavender', label: 'Lavender — the evening', className: 'texture-paper bg-surface-page' },
  { key: 'periwinkle', label: 'Periwinkle — the sky', className: 'texture-paper bg-surface-page' },
  { key: 'dark', label: 'Dark (espresso)', className: 'section-dark' },
  { key: 'navy', label: 'Navy', className: 'section-navy' },
] as const;

const SURFACE_CHIPS = [
  { token: 'surface-page', className: 'bg-surface-page' },
  { token: 'surface-raised', className: 'bg-surface-raised' },
  { token: 'surface-tint', className: 'bg-surface-tint' },
  { token: 'surface-wood', className: 'bg-surface-wood' },
];

function TokenColumn() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {SURFACE_CHIPS.map(({ token, className }) => (
          <div key={token}>
            <div className={`h-10 rounded-sm border border-fine ${className}`} />
            <p className="type-caption mt-1">{token}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="type-body text-primary">text-primary — the reading ink</p>
        <p className="type-body-ui text-secondary">text-secondary — captions and asides</p>
        <p className="type-body-ui text-faint">text-faint — metadata, disabled</p>
      </div>

      <div>
        <p className="type-label-editorial text-accent-readable">accent-readable — labels, links</p>
        <hr className="rule-accent mt-2" />
        <p className="type-caption mt-2">
          <span className="text-accent">accent</span> — rules and ornament only
        </p>
      </div>

      <div className="space-y-3">
        <Rule />
        <p className="type-caption">border-fine</p>
        <Rule variant="accent" />
        <p className="type-caption">border-accent</p>
      </div>

      <div>
        <span className="type-body-ui inline-block rounded-sm border border-fine px-3 py-1.5 text-primary outline-2 outline-solid outline-offset-2 outline-focus-ring">
          focus-ring
        </span>
      </div>
    </div>
  );
}

export default function SemanticTokens() {
  return (
    <div className="grid gap-px md:grid-cols-3">
      {SCOPES.map((scope) => (
        <div key={scope.key} data-surface={scope.key} className={`${scope.className} p-6`}>
          <p className="type-body-ui mb-5 text-primary">{scope.label}</p>
          <TokenColumn />
        </div>
      ))}
    </div>
  );
}
