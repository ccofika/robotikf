import React from 'react';
import { cx } from './ui';

// Znak: petlja obilaska oko objekta (radnik u sredini), otvorena na kontrolnoj tački koja je
// upravo na redu (plava). Čita se i kao objektiv nadzora. Tuš na papiru, bez podloge.
export default function BrandMark({ className, size = 30 }) {
  return (
    <svg className={cx('sx-mark', className)} width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path className="sx-mark__loop" d="M23.83 19.69 A10 10 0 1 1 23.83 10.31" />
      <circle className="sx-mark__core" cx="15" cy="15" r="3" />
      <circle className="sx-mark__now" cx="25" cy="15" r="3.6" />
    </svg>
  );
}
