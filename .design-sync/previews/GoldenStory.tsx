import GoldenStory from '@/components/dailygold/GoldenStory';

// The illustrated book. `story` is a remarkable-person row with its authored
// sections; the book lays them out as spreads (cover + childhood, then
// chapters, timeline, treasures, lessons). `page` selects the spread, so each
// story below shows a different one rather than repeating the cover.

const PLATE = (a: string, b: string, portrait = false) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${portrait ? 500 : 900}" height="${portrait ? 700 : 560}">
       <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/>
       </linearGradient></defs>
       <rect width="100%" height="100%" fill="url(#g)"/>
       <circle cx="${portrait ? 250 : 640}" cy="${portrait ? 230 : 150}" r="${portrait ? 92 : 96}" fill="#FFF6E0" opacity="0.6"/>
       <path d="M0 ${portrait ? 470 : 380} Q ${portrait ? 250 : 300} ${portrait ? 380 : 300} ${portrait ? 500 : 620} ${portrait ? 460 : 372} T ${portrait ? 500 : 900} ${portrait ? 470 : 384} L100% 100% L0 100% Z" fill="#7C8770" opacity="0.55"/>
       <path d="M0 ${portrait ? 560 : 452} Q ${portrait ? 250 : 380} ${portrait ? 490 : 396} ${portrait ? 500 : 760} ${portrait ? 546 : 444} T ${portrait ? 500 : 900} ${portrait ? 560 : 456} L100% 100% L0 100% Z" fill="#4A3B2A" opacity="0.45"/>
     </svg>`,
  );

const STORY = {
  name: 'Wangarĩ Maathai',
  role: 'Environmentalist and Nobel laureate',
  field: 'Service',
  country: 'Kenya',
  birth_date: '1940-04-01',
  death_date: '2011-09-25',
  story_title: 'Fifty million trees, planted one at a time',
  famous_quote: 'It’s the little things citizens do. That’s what will make the difference.',
  image_url: PLATE('#EADCC2', '#5C6B52', true),
  childhood_image_url: PLATE('#F3E9D8', '#7C8770'),
  story_childhood_title: 'A stream with a fig tree beside it',
  story_childhood:
    'She grew up in the highlands, where her mother showed her a fig tree by a stream and told her not to gather firewood there, because that tree was the reason the water kept running.\n\nYears later, when the tree was gone and the stream had dried, she understood that her mother had not been telling her a rule. She had been telling her how the world was held together.',
  chapters: [
    {
      number: 1,
      title: 'The first seedlings',
      narrative:
        'She began with seven trees, planted on a single day, and an idea that sounded far too simple to work: pay ordinary women a few coins for every seedling that survived.\n\nThe foresters said village women could not grow trees without training. The women grew them anyway, by the thousand, and then by the million.',
      image_url: PLATE('#F0E6D3', '#8B7355'),
    },
    {
      number: 2,
      title: 'Standing in the park',
      narrative:
        'When a tower was planned for the middle of the city’s only green park, she wrote letters, then stood in the way, and was beaten for it.\n\nThe tower was never built. The park is still there, and children play in it who have no idea what it cost.',
      image_url: PLATE('#EADCC2', '#6E5B3E'),
      page_span: 'both',
    },
  ],
  timeline: [
    { year: '1940', caption: 'Born in Nyeri, in the Kenyan highlands.' },
    { year: '1971', caption: 'First woman in East and Central Africa to earn a doctorate.' },
    { year: '1977', caption: 'Plants the first seven trees of the Green Belt Movement.' },
    { year: '2004', caption: 'Awarded the Nobel Peace Prize.' },
  ],
  treasures: [
    { name: 'A seedling tin', note: 'The rusted can she used to carry her first saplings.' },
    { name: 'A wooden stool', note: 'Where she sat to teach women how to sort seed.' },
  ],
  treasures_image_url: PLATE('#F7EFDD', '#8B7355'),
  lessons: [
    { icon_name: 'seedling', lesson: 'Small things, done by many people, are not small.' },
    { icon_name: 'compass', lesson: 'You do not need permission to begin.' },
    { icon_name: 'shield', lesson: 'Protecting something is a kind of building.' },
  ],
  modern_interpretation:
    'The movement she started has now planted more than fifty million trees, and the method — pay people to tend what grows near them — is used on four continents.',
};

// `embedded` drops the fixed full-viewport stage and scales the book to its
// host container instead — the same mode the person editor uses for its live
// preview. Without it the book fits itself to window.innerHeight and collapses
// inside a card. The stage needs a definite height for the fit to measure.
function Stage({ children }: { children: React.ReactNode }) {
  return <div style={{ position: 'relative', width: '100%', height: 460 }}>{children}</div>;
}

export function Cover() {
  return (
    <Stage>
      <GoldenStory story={STORY} page={0} embedded />
    </Stage>
  );
}

export function ChapterSpread() {
  return (
    <Stage>
      <GoldenStory story={STORY} page={1} embedded />
    </Stage>
  );
}

export function Timeline() {
  return (
    <Stage>
      <GoldenStory story={STORY} page={3} embedded />
    </Stage>
  );
}
