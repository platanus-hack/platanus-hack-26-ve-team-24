import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const MODULE = size.width / 8;

// la C del sello en la misma grilla 6×6 con un módulo de margen: { col, row, cols, rows }
const SEGMENTS = [
  [6, 2, 1, 1],
  [2, 1, 5, 1],
  [1, 1, 1, 3],
  [1, 4, 1, 3],
  [2, 6, 5, 1],
];

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#f2b705',
        display: 'flex',
        position: 'relative',
      }}
    >
      {SEGMENTS.map(([col, row, cols, rows]) => (
        <div
          key={`${col}-${row}`}
          style={{
            position: 'absolute',
            left: col * MODULE,
            top: row * MODULE,
            width: cols * MODULE,
            height: rows * MODULE,
            background: '#000',
          }}
        />
      ))}
    </div>,
    size,
  );
}
