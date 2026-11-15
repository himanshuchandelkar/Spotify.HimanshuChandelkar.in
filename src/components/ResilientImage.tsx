import React, { useEffect, useState } from 'react';
import { Disc3 } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  fallbackTitle?: string;
  className?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  fallbackTitle,
  className = 'w-full h-full object-cover',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#18181B] via-[#111113] to-[#09090B] p-6 text-center select-none"
        role="img"
        aria-label={alt}
      >
        <div className="w-12 h-12 rounded-full border border-zinc-800 bg-zinc-900/80 flex items-center justify-center text-zinc-400">
          <Disc3 className="w-6 h-6" aria-hidden="true" />
        </div>
        {fallbackTitle && (
          <span className="font-display text-sm font-medium text-zinc-300 line-clamp-2 max-w-[180px]">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
