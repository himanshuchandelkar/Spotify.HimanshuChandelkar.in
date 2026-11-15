import React from 'react';
import {
  Disc3,
  ExternalLink,
  Globe,
  Headphones,
  Heart,
  Music2,
  Radio,
  Share2,
} from 'lucide-react';
import { ButtonIconName } from '../types/site';

interface IconGlyphProps {
  name: ButtonIconName;
  className?: string;
}

export const IconGlyph: React.FC<IconGlyphProps> = ({ name, className = 'w-4 h-4' }) => {
  switch (name) {
    case 'spotify':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 1.5C6.201 1.5 1.5 6.201 1.5 12S6.201 22.5 12 22.5 22.5 17.799 22.5 12 17.799 1.5 12 1.5Zm4.813 15.146a.654.654 0 0 1-.899.217c-2.463-1.505-5.563-1.845-9.215-1.01a.655.655 0 1 1-.292-1.278c3.996-.913 7.423-.52 10.188 1.17a.654.654 0 0 1 .218.901Zm1.284-2.859a.819.819 0 0 1-1.125.271c-2.819-1.733-7.118-2.235-10.453-1.223a.82.82 0 1 1-.476-1.568c3.81-1.156 8.545-.596 11.783 1.394a.82.82 0 0 1 .271 1.126Zm.11-2.977C14.828 8.803 9.25 8.618 6.023 9.598a.983.983 0 1 1-.571-1.882c3.705-1.124 9.865-.907 13.757 1.404a.983.983 0 0 1-1.002 1.69Z" />
        </svg>
      );
    case 'disc':
      return <Disc3 className={className} aria-hidden="true" />;
    case 'headphones':
      return <Headphones className={className} aria-hidden="true" />;
    case 'radio':
      return <Radio className={className} aria-hidden="true" />;
    case 'heart':
      return <Heart className={className} aria-hidden="true" />;
    case 'share':
      return <Share2 className={className} aria-hidden="true" />;
    case 'music':
      return <Music2 className={className} aria-hidden="true" />;
    case 'globe':
      return <Globe className={className} aria-hidden="true" />;
    case 'external':
    default:
      return <ExternalLink className={className} aria-hidden="true" />;
  }
};
