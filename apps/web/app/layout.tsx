import "./globals.css";
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import { TopNav } from './_components/top-nav';
import { EmailVerifyBanner } from './_components/email-verify-banner';
import { RoleProvider } from './_components/role-context';
import { LangDirEffect } from "./_components/lang-dir-effect";
import { ThemeProvider } from "./_components/theme-provider";
import GhostMentorWidget from "./_components/ghost-mentor-widget";

const headingFont = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const bodyFont = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata = {
  title: 'ATLASIO — Global Öğrenme Ağı',
  description: 'Dünya standartlarında uzaktan eğitim platformu',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <ThemeProvider>
          <div className="bg-canvas" />
          <div className="bg-grid" />
          <RoleProvider>
            <LangDirEffect />
            <div className="page-shell">
              <TopNav />
              <EmailVerifyBanner />
              <main className="content-shell animate-fade-slide-up">{children}</main>
            </div>
            <GhostMentorWidget />
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
