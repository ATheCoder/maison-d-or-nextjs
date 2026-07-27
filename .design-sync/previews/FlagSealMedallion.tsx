import FlagSealMedallion from '@/components/dailygold/FlagSealMedallion';

// A collected-country seal. `countryCode` is ISO2 (rendered as a flag emoji),
// `earned` is the collected/uncollected state, and `size` is the scale axis.

const ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1.25rem',
  padding: '1rem',
  flexWrap: 'wrap',
};

export function Sizes() {
  return (
    <div style={ROW}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <FlagSealMedallion key={size} countryCode="JP" countryName="Japan" size={size} />
      ))}
    </div>
  );
}

export function EarnedAndUnearned() {
  return (
    <div style={ROW}>
      <FlagSealMedallion countryCode="FR" countryName="France" size="lg" earned />
      <FlagSealMedallion countryCode="KE" countryName="Kenya" size="lg" earned={false} />
    </div>
  );
}

export function WithLabels() {
  return (
    <div style={ROW}>
      <FlagSealMedallion countryCode="IS" countryName="Iceland" size="lg" showLabel />
      <FlagSealMedallion countryCode="PE" countryName="Peru" size="lg" showLabel />
      <FlagSealMedallion countryCode="VN" countryName="Vietnam" size="lg" showLabel />
    </div>
  );
}

export function AcrossTheCollection() {
  return (
    <div style={ROW}>
      {['JP', 'FR', 'BR', 'EG', 'IN', 'NO', 'MX', 'AU'].map((code) => (
        <FlagSealMedallion key={code} countryCode={code} size="md" />
      ))}
    </div>
  );
}

export function FallbackInitials() {
  return (
    <div style={ROW}>
      <FlagSealMedallion countryName="Unknown Territory" size="lg" showLabel />
      <FlagSealMedallion fallbackInitials="??" size="lg" />
    </div>
  );
}
