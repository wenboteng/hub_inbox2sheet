'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AuthModal from './AuthModal';

export default function Navigation() {
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleAuthSuccess = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setShowUserMenu(false);
  };

  // Mobile menu functionality
  useEffect(() => {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuIcon = document.getElementById('mobile-menu-icon');
    const mobileMenuCloseIcon = document.getElementById('mobile-menu-close-icon');
    
    if (mobileMenuButton && mobileMenu && mobileMenuIcon && mobileMenuCloseIcon) {
      mobileMenuButton.addEventListener('click', function() {
        const isHidden = mobileMenu.classList.contains('hidden');
        
        if (isHidden) {
          mobileMenu.classList.remove('hidden');
          mobileMenuIcon.classList.add('hidden');
          mobileMenuCloseIcon.classList.remove('hidden');
        } else {
          mobileMenu.classList.add('hidden');
          mobileMenuIcon.classList.remove('hidden');
          mobileMenuCloseIcon.classList.add('hidden');
        }
      });
    }
  }, []);

  return (
    <>
      <nav className="bg-gradient-to-r from-[#0B0F2F] to-[#1E223F] shadow-xl border-b border-white/10">
        <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="flex items-center">
                  <Image 
                    src="/logo.svg" 
                    alt="OTA Answers Logo" 
                    width={96} 
                    height={96}
                    className="w-24 h-24"
                  />
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/search"
                  className="border-transparent text-gray-300 hover:border-emerald-400 hover:text-emerald-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  🔍 Search Intelligence
                </Link>
                <Link
                  href="/faq"
                  className="border-transparent text-gray-300 hover:border-emerald-400 hover:text-emerald-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  📚 FAQ Solutions
                </Link>
                <Link
                  href="/reports"
                  className="border-transparent text-gray-300 hover:border-emerald-400 hover:text-emerald-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  📊 Reports
                </Link>
                <Link
                  href="/insight-deck"
                  className="border-transparent text-gray-300 hover:border-emerald-400 hover:text-emerald-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  📊 InsightDeck
                </Link>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:block text-sm">{user.name || user.email}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50">
                      <div className="py-2">
                        <div className="px-4 py-2 text-sm text-gray-400 border-b border-gray-700">
                          <div className="font-medium text-white">{user.name || 'User'}</div>
                          <div className="text-xs">{user.email}</div>
                          <div className="text-xs text-emerald-400 mt-1">
                            {user.subscriptionTier === 'registered' ? 'Registered User' : user.subscriptionTier}
                          </div>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign In
                </button>
              )}

              {/* Mobile menu button */}
              <div className="flex items-center sm:hidden">
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors"
                  aria-controls="mobile-menu"
                  aria-expanded="false"
                  id="mobile-menu-button"
                >
                  <span className="sr-only">Open main menu</span>
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                    id="mobile-menu-icon"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  <svg
                    className="hidden h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                    id="mobile-menu-close-icon"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="sm:hidden hidden" id="mobile-menu">
          <div className="pt-2 pb-3 space-y-1 bg-gradient-to-b from-[#1A1F3A] to-[#2A2F5A] border-t border-white/10">
            <Link
              href="/search"
              className="border-transparent text-gray-300 hover:bg-white/10 hover:border-emerald-400 hover:text-emerald-300 block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors"
            >
              🔍 Search Intelligence
            </Link>
            <Link
              href="/reports"
              className="border-transparent text-gray-300 hover:bg-white/10 hover:border-emerald-400 hover:text-emerald-300 block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors"
            >
              📊 Reports
            </Link>
            <Link
              href="/insight-deck"
              className="border-transparent text-gray-300 hover:bg-white/10 hover:border-emerald-400 hover:text-emerald-300 block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors"
            >
              📊 InsightDeck
            </Link>
            {!user && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full text-left border-transparent text-gray-300 hover:bg-white/10 hover:border-emerald-400 hover:text-emerald-300 block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors"
              >
                🔐 Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
} 