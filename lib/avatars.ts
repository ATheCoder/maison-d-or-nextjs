/**
 * Preset child-profile avatars — a fixed set so profiles carry no uploaded
 * images (auth-plan §7: minimal child PII). The key is what child_profile
 * stores; emoji + background render the tile.
 */
export const AVATARS = {
  sun: { emoji: '☀️', bg: '#F3D9A4' },
  moon: { emoji: '🌙', bg: '#C9D4E8' },
  star: { emoji: '⭐', bg: '#EAD9F3' },
  fox: { emoji: '🦊', bg: '#F3C4A4' },
  owl: { emoji: '🦉', bg: '#D8CBB8' },
  whale: { emoji: '🐋', bg: '#B8D4E0' },
  leaf: { emoji: '🍁', bg: '#DEAF97' },
  wave: { emoji: '🌊', bg: '#AEC9E8' },
} as const;

export type AvatarKey = keyof typeof AVATARS;

export const isAvatarKey = (v: unknown): v is AvatarKey =>
  typeof v === 'string' && v in AVATARS;
