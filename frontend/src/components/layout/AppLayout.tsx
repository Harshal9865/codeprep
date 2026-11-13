import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface AppLayoutProps {
  children: React.ReactNode;
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  showFooter?: boolean;
  currentStreak?: number;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentTab,
  onTabChange,
  showFooter = true,
  currentStreak,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-primary selection:bg-primary/20 selection:text-primary transition-colors">
      <Navbar currentTab={currentTab} onTabChange={onTabChange} currentStreak={currentStreak} />
      <main className="flex-1 flex flex-col animate-page-enter">{children}</main>
      {showFooter && <Footer onNavigate={onTabChange} />}
    </div>
  );
};
