import React from 'react';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wrap every case-insensitive occurrence of `triggerWord` in `text`
 * with a bold, amber-colored <span>. Returns the original string when
 * the trigger word is missing or not found.
 */
export function highlightTriggerWord(
  text: string,
  triggerWord: string | null | undefined,
): React.ReactNode {
  if (!text) return text;
  const tw = triggerWord?.trim();
  if (!tw) return text;

  const regex = new RegExp(`(${escapeRegex(tw)})`, 'gi');
  if (!regex.test(text)) return text;

  // Reset lastIndex after .test()
  regex.lastIndex = 0;
  const parts = text.split(regex);

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span
        key={i}
        style={{ fontWeight: 700, color: 'hsl(38, 92%, 50%)' }}
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
}
