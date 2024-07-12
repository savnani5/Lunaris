import './globals.css';
import { Inter } from 'next/font/google';

const fontHeading = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
});

const fontBody = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

export default function Layout({ children }) {
  return (
    <html lang="en">
      <body className={`${fontHeading.variable} ${fontBody.variable}`}>
        {children}
      </body>
    </html>
  );
}

