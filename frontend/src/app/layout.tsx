import './globals.css';
import { Inter } from 'next/font/google';
import React, { ReactNode } from 'react';

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

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <body className={`${fontHeading.variable} ${fontBody.variable}`}>
        {children}
      </body>
    </html>
  );
}
