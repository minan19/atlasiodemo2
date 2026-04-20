'use client';

import Link from 'next/link';

export function BrandLogo() {
  return (
    <Link href="/" className="brand-logo-icon" aria-label="Atlasio Ana Sayfa">
      {/* Globe-A mark — navy in light mode, white in dark mode via currentColor */}
      <svg
        viewBox="0 0 200 268"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Globe grid — gold latitude lines */}
        <ellipse cx="100" cy="163" rx="41" ry="10"  fill="none" stroke="#C8A96A" strokeWidth="2"/>
        <ellipse cx="100" cy="181" rx="41" ry="10"  fill="none" stroke="#C8A96A" strokeWidth="2"/>
        <ellipse cx="100" cy="145" rx="32" ry="6.5" fill="none" stroke="#C8A96A" strokeWidth="1.3" opacity={0.7}/>
        <ellipse cx="100" cy="199" rx="32" ry="6.5" fill="none" stroke="#C8A96A" strokeWidth="1.3" opacity={0.7}/>
        {/* Globe grid — gold meridian lines */}
        <ellipse cx="100" cy="163" rx="22" ry="45"  fill="none" stroke="#C8A96A" strokeWidth="1.8"/>
        <ellipse cx="100" cy="163" rx="7"  ry="45"  fill="none" stroke="#C8A96A" strokeWidth="1.2" opacity={0.6}/>

        {/* A — left stroke (currentColor adapts light/dark) */}
        <polygon points="100,14 10,255 49,255 100,70" fill="currentColor"/>
        {/* A — right stroke */}
        <polygon points="100,14 190,255 151,255 100,70" fill="currentColor"/>
        {/* Left serif */}
        <rect x="3"   y="253" width="54" height="9" rx="2.5" fill="currentColor"/>
        {/* Right serif */}
        <rect x="143" y="253" width="54" height="9" rx="2.5" fill="currentColor"/>

        {/* Gold equatorial crossbar (acts as A crossbar) */}
        <line x1="55" y1="163" x2="145" y2="163" stroke="#C8A96A" strokeWidth="3.5"/>
        {/* Gold apex dot */}
        <circle cx="100" cy="10" r="5" fill="#C8A96A"/>
      </svg>
    </Link>
  );
}
