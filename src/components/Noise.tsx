import React, { useEffect, useState } from 'react';

interface NoiseProps {
  patternSize?: number;
  patternScaleX?: number;
  patternScaleY?: number;
  patternRefreshInterval?: number;
  patternAlpha?: number;
}

const tileCache = new Map<string, string>();

// Paints one grain tile and caches it as a data URL. The flicker is a CSS
// `steps()` animation of that tile, so no per-frame JavaScript or canvas work
// runs while the page scrolls.
function createGrainTile(size: number, alpha: number) {
  const key = `${size}:${alpha}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.random() * 255;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = alpha;
  }
  ctx.putImageData(imageData, 0, 0);

  const url = canvas.toDataURL('image/png');
  tileCache.set(key, url);
  return url;
}

const Noise: React.FC<NoiseProps> = ({
  patternSize = 250,
  patternScaleX = 1,
  patternScaleY = 1,
  patternRefreshInterval = 2,
  patternAlpha = 15
}) => {
  const [tile, setTile] = useState('');

  useEffect(() => {
    setTile(createGrainTile(Math.min(Math.max(patternSize, 64), 256), patternAlpha));
  }, [patternSize, patternAlpha]);

  if (!tile) return null;

  return (
    <div
      className="noise-grain"
      aria-hidden="true"
      style={
        {
          backgroundImage: `url(${tile})`,
          backgroundSize: `${patternSize * patternScaleX}px ${patternSize * patternScaleY}px`,
          '--noise-step': `${Math.max(patternRefreshInterval, 1) * 70}ms`
        } as React.CSSProperties
      }
    />
  );
};

export default Noise;
