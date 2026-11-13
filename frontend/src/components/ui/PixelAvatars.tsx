import React from 'react';

export const DEFAULT_PIXEL_AVATAR_ID = 'pixel:bot-amber';

export interface PixelAvatarPreset {
  id: string;
  name: string;
  tag: string;
  bg: string;
  accent: string;
  palette: Record<string, string>;
  grid: string[];
}

export const PIXEL_AVATAR_PRESETS: PixelAvatarPreset[] = [
  {
    id: 'pixel:bot-amber',
    name: 'Circuit Bot',
    tag: 'Default',
    bg: '#1c1610',
    accent: '#ffa116',
    palette: {
      K: '#121318',
      B: '#4c5468',
      L: '#7a849e',
      H: '#a5b0ca',
      A: '#ffa116',
      Y: '#ffd166',
      S: '#0c1118',
      E: '#38bdf8',
      W: '#e0f2fe',
      C: '#f97316',
    },
    grid: [
      '.......YY.......',
      '.......AA.......',
      '....KKKKKKKK....',
      '...KBBBBBBBBK...',
      '..KBLHHHHHHHHK..',
      '..KBSSSSSSSSSK..',
      '.KABSEWSSSEWSBAK',
      '.KABSEESSSEESBAK',
      '..KBSSSSSSSSSK..',
      '..KBLLLLLLLLLK..',
      '...KBBAAAAABBK..',
      '..KKKBBBBBBKKK..',
      '.KBBBCBBBBBCBBK.',
      '.KBBKKKKKKKKBBK.',
      '..KK..BBBB..KK..',
      '......KKKK......',
    ],
  },
  {
    id: 'pixel:bot-cyan',
    name: 'Cyber Droid',
    tag: 'Compiler',
    bg: '#0c1821',
    accent: '#22d3ee',
    palette: {
      K: '#090e14',
      B: '#1e3a5f',
      L: '#3b6998',
      H: '#6495c7',
      C: '#22d3ee',
      W: '#ecfeff',
      S: '#071019',
      M: '#f43f5e',
    },
    grid: [
      '....CC....CC....',
      '.....K....K.....',
      '...KKKKKKKKKK...',
      '..KLLLLLLLLLLK..',
      '..KLHHHHHHHHHK..',
      '.CKLSSSSSSSSSKC.',
      '.CKLSCCCCCCCSKC.',
      '..KLSCWWCCCWSK..',
      '..KLSSSSSSSSSK..',
      '...KBBBBBBBBK...',
      '..KKBBMMMMBBKK..',
      '.KLLBBBBBBBBLLK.',
      '.KLLKBBBBBBKLLK.',
      '..KK.KBBBBK.KK..',
      '.....KK..KK.....',
      '................',
    ],
  },
  {
    id: 'pixel:bot-emerald',
    name: 'Kernel Unit',
    tag: 'Runtime',
    bg: '#0d1b16',
    accent: '#2cbb5d',
    palette: {
      K: '#09110e',
      G: '#1f4d3a',
      L: '#2f7a5b',
      H: '#5ec796',
      E: '#2cbb5d',
      Y: '#bef264',
      S: '#07140f',
      W: '#dcfce7',
    },
    grid: [
      '.......YY.......',
      '......KEEK......',
      '...KKKKKKKKKK...',
      '..KGGGGGGGGGGK..',
      '..KGHHHHHHHHHK..',
      '.EKGSSSSSSSSSKE.',
      '.EKGSEEYYSEESKE.',
      '..KGSEWWYSEWSK..',
      '..KGSSSSSSSSSK..',
      '...KLLLLLLLLK...',
      '..KKGEEEEEEGGKK.',
      '.KLLGGGGGGGGLLK.',
      '.KLLKGGGGGGKLLK.',
      '..KK.KGGGGK.KK..',
      '.....KK..KK.....',
      '................',
    ],
  },
  {
    id: 'pixel:bot-violet',
    name: 'Logic Core',
    tag: 'Solver',
    bg: '#191229',
    accent: '#a855f7',
    palette: {
      K: '#0e0a17',
      P: '#4c1d95',
      L: '#7c3aed',
      H: '#c4b5fd',
      M: '#f472b6',
      S: '#110b1f',
      W: '#fae8ff',
      C: '#38bdf8',
    },
    grid: [
      '......MMMM......',
      '.....K....K.....',
      '...KKKKKKKKKK...',
      '..KPPPPPPPPPPK..',
      '..KPLHHHHHHHLPK.',
      '.MKPSSSSSSSSSKM.',
      '.MKPSCWWSSCWWSKM',
      '..KPSSCCSSCCSSK.',
      '..KPSSSSSSSSSSK.',
      '...KLLLLLLLLLK..',
      '..KKPPCCCCPPPKK.',
      '.KLLPPPPPPPPPLLK',
      '.KLLKPPPPPPPKLLK',
      '..KK.KPPPPPK.KK.',
      '.....KK...KK....',
      '................',
    ],
  },
  {
    id: 'pixel:dev-hoodie',
    name: 'Coder Hoodie',
    tag: 'Builder',
    bg: '#131622',
    accent: '#60a5fa',
    palette: {
      K: '#0d0f17',
      D: '#1d4ed8',
      B: '#3b82f6',
      H: '#93c5fd',
      S: '#f1c27d',
      T: '#d99b66',
      E: '#111827',
      W: '#ffffff',
    },
    grid: [
      '....KKKKKKKK....',
      '...KBBBBBBBBK...',
      '..KBHHHHHHHHBK..',
      '..KBKKKKKKKKBK..',
      '.KBKSSSSSSSSKBK.',
      '.KBKSTSSSSSTKBK.',
      '.KBKSEWSSSEWKBK.',
      '.KBKSEESSSSEKBK.',
      '.KBKSSSTTTSSKBK.',
      '..KKSSSSSSSSKK..',
      '..KDDDDDDDDDDK..',
      '.KDBBDDDDDDBBDK.',
      '.KDBBWDDDDWBBDK.',
      '.KDBDDDDDDDDBDK.',
      '..KKKKKKKKKKKK..',
      '................',
    ],
  },
  {
    id: 'pixel:dev-glasses',
    name: 'ICT Dev',
    tag: 'Engineer',
    bg: '#18141c',
    accent: '#f59e0b',
    palette: {
      K: '#120f14',
      R: '#2b2018',
      H: '#4a3525',
      S: '#f2c197',
      T: '#d89d72',
      G: '#0ea5e9',
      W: '#e0f2fe',
      A: '#f59e0b',
      J: '#334155',
    },
    grid: [
      '....KKKKKKKK....',
      '...KRRRRRRRRK...',
      '..KRHHHHHHHHHK..',
      '..KRSSSSSSSSSK..',
      '..KRSSSSSSSSSK..',
      '.KAKKKKKKKKKKAK.',
      '.KAKGWWKSSKGWWK.',
      '..KKGGGKSSKGGGK.',
      '..KTSSSSSSSSSTK.',
      '...KSSSTTTTSSK..',
      '...KKKKKKKKKK...',
      '..KJJJAAAAAJJJK.',
      '.KJJJAAAAAAJJJK.',
      '.KJJKKKKKKKKJJK.',
      '..KK........KK..',
      '................',
    ],
  },
  {
    id: 'pixel:knight-bit',
    name: 'Byte Knight',
    tag: 'DSA',
    bg: '#1c1215',
    accent: '#ef4444',
    palette: {
      K: '#100b0d',
      R: '#ef4444',
      O: '#fca5a5',
      M: '#64748b',
      L: '#94a3b8',
      H: '#e2e8f0',
      S: '#0f172a',
      Y: '#facc15',
    },
    grid: [
      '......KRRK......',
      '.....KROORK.....',
      '....KRRRRRRK....',
      '...KMMMMMMMMK...',
      '..KMHHHHHHHHMK..',
      '..KMLSSSSSSLMK..',
      '..KMLSYYSSYSLK..',
      '..KMLSSSSSSLMK..',
      '..KMLLHHHLLLMK..',
      '...KMMLLLLMMK...',
      '..KKMMYYYYMMKK..',
      '.KLLMMMMMMMMLLK.',
      '.KLLKMMMMMMKLLK.',
      '..KK.KMMMMK.KK..',
      '.....KK..KK.....',
      '................',
    ],
  },
  {
    id: 'pixel:cat-terminal',
    name: 'Terminal Cat',
    tag: 'Night Owl',
    bg: '#16141e',
    accent: '#fb923c',
    palette: {
      K: '#110f17',
      O: '#fb923c',
      L: '#fdba74',
      W: '#fff7ed',
      P: '#f472b6',
      E: '#22c55e',
      D: '#0f172a',
    },
    grid: [
      '..KK........KK..',
      '.KOOK......KOOK.',
      '.KOPLK....KLPOK.',
      '.KOOOKKKKKKOOOK.',
      '.KOOOOOOOOOOOOK.',
      '.KOOOWOOOOOWOOK.',
      '.KOOEDOOOOODEOK.',
      '.KOOLLPPPPPLLOK.',
      '.KOOWWKKKKWWOOK.',
      '..KKOOOOOOOOOK..',
      '...KLLLLLLLLK...',
      '..KOOLLLLLLLOOK.',
      '..KOOKOOOOOKOK..',
      '...KK.KKKKK.KK..',
      '................',
      '................',
    ],
  },
];

export const ALLOWED_PIXEL_AVATAR_IDS = new Set(PIXEL_AVATAR_PRESETS.map((preset) => preset.id));

export function isPixelAvatarId(value?: string | null): boolean {
  return Boolean(value && ALLOWED_PIXEL_AVATAR_IDS.has(value));
}

export function resolvePixelAvatarPreset(avatarUrl?: string | null): PixelAvatarPreset {
  if (avatarUrl && ALLOWED_PIXEL_AVATAR_IDS.has(avatarUrl)) {
    return PIXEL_AVATAR_PRESETS.find((p) => p.id === avatarUrl) || PIXEL_AVATAR_PRESETS[0];
  }
  return PIXEL_AVATAR_PRESETS[0];
}

interface PixelRect {
  x: number;
  y: number;
  w: number;
  fill: string;
}

function compileGrid(preset: PixelAvatarPreset): PixelRect[] {
  const rects: PixelRect[] = [];
  for (let y = 0; y < preset.grid.length; y++) {
    const row = preset.grid[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const fill = preset.palette[ch];
      if (!fill) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) {
        w++;
      }
      rects.push({ x, y, w, fill });
      x += w;
    }
  }
  return rects;
}

const COMPILED_CACHE = new Map<string, PixelRect[]>();

function getCompiledRects(preset: PixelAvatarPreset): PixelRect[] {
  const cached = COMPILED_CACHE.get(preset.id);
  if (cached) return cached;
  const compiled = compileGrid(preset);
  COMPILED_CACHE.set(preset.id, compiled);
  return compiled;
}

export interface PixelAvatarProps {
  presetId?: string | null;
  className?: string;
  size?: number;
  title?: string;
}

export const PixelAvatar: React.FC<PixelAvatarProps> = ({
  presetId,
  className = '',
  size = 32,
  title,
}) => {
  const preset = resolvePixelAvatarPreset(presetId);
  const rects = getCompiledRects(preset);

  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label={title || `${preset.name} pixel character`}
    >
      <rect x="0" y="0" width="16" height="16" fill={preset.bg} />
      {rects.map((r, idx) => (
        <rect
          key={idx}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
          fill={r.fill}
        />
      ))}
    </svg>
  );
};

export interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName?: string;
  size?: number;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  displayName = 'Developer',
  size = 32,
  className = '',
}) => {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const hasCustomUpload = Boolean(
    avatarUrl && !avatarUrl.startsWith('pixel:') && !imgError
  );

  if (hasCustomUpload && avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${displayName} avatar`}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <PixelAvatar
      presetId={avatarUrl}
      size={size}
      title={`${displayName} avatar`}
      className={className}
    />
  );
};
