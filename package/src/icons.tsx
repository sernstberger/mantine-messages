import React from 'react';

interface IconProps {
  size?: number;
}

function icon(paths: string[]) {
  return function Icon({ size = 16 }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
        {paths.map((d) => (
          <path
            key={d}
            d={d}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    );
  };
}

export const ReplyIcon = icon(['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11']);
export const SmileIcon = icon([
  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  'M8 14s1.5 2 4 2 4-2 4-2',
  'M9 9h.01',
  'M15 9h.01',
]);
export const CopyIcon = icon(['M8 8h12v12H8z', 'M16 8V4H4v12h4']);
export const CheckIcon = icon(['M20 6 9 17l-5-5']);
export const EditIcon = icon(['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z']);
export const ThreadIcon = icon(['M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12Z']);
export const DotsIcon = icon(['M5 12h.01', 'M12 12h.01', 'M19 12h.01']);
export const FileIcon = icon(['M14 3H6v18h12V7Z', 'M14 3v4h4']);

export const HashIcon = icon(['M4 9h16', 'M4 15h16', 'M10 3 8 21', 'M16 3l-2 18']);
export const SearchIcon = icon(['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm21 21-4.3-4.3']);
export const LockIcon = icon(['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4']);
