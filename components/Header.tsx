'use client';

import { Flag, Moon, Sun, Upload, Menu } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface HeaderProps {
  onUploadClick: () => void;
  onSidebarToggle: () => void;
  isSidebarOpen: boolean;
}

export default function Header({ onUploadClick, onSidebarToggle, isSidebarOpen }: HeaderProps) {
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 dark:border-gray-800 px-6 py-3 shrink-0 bg-white dark:bg-background-dark">
      <div className="flex items-center gap-4 text-gray-900 dark:text-white">
        <button
          onClick={onSidebarToggle}
          className="flex items-center justify-center p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="size-6 text-primary">
          <Flag className="w-6 h-6" fill="currentColor" />
        </div>
        <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
          SpecBot
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <button
          className="flex items-center justify-center rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </div>
    </header>
  );
}
