import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import '@moonwitness/ui/styles.css';
import '../src/styles.css';

export async function generateMetadata() {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'moonwitness-os.openai.site';
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https';
  const origin = `${protocol}://${host}`;
  const image = `${origin}/og.png`;
  const title = 'MoonWitness OS — Evidence Before Certainty';
  const description = 'Auditable analytical infrastructure for evidence, provenance, human review, and Witness integrity.';

  return {
    metadataBase: new URL(origin),
    title,
    description,
    openGraph: { title, description, type: 'website', images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
