"use client";

import Image from "next/image";
import Link from "next/link";

export function BrandLogo() {
  return (
    <Link href="/" className="brand-logo" aria-label="Atlasio Ana Sayfa">
      <div className="brand-logo-wrap">
        <Image
          src="/atlasio-logo.gif"
          alt="Atlasio Academy"
          width={88}
          height={88}
          priority
          className="brand-logo-img"
        />
        <span className="brand-ring" aria-hidden />
      </div>
      <span className="brand-glow" aria-hidden />
      <span className="brand-orbit" aria-hidden />
    </Link>
  );
}
