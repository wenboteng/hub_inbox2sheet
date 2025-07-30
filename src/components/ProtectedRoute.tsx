'use client';

import { useState, useEffect } from 'react';
import AuthModal from './AuthModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Check if user is logged in (stored in localStorage for now)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleAuthSuccess = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F1419] via-[#1A1F3A] to-[#2A2F5A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-[#0F1419] via-[#1A1F3A] to-[#2A2F5A] text-white flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-4">
                  🔒 Premium Access Required
                </h1>
                <p className="text-gray-400 text-lg">
                  Sign in or create an account to access InsightDeck
                </p>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Sign In / Create Account
                </button>
                
                <div className="text-sm text-gray-500">
                  <p>Free registration required for access</p>
                  <p className="mt-1">Premium features coming soon with Stripe integration</p>
                </div>
              </div>

              {fallback && (
                <div className="mt-8 pt-6 border-t border-gray-700">
                  {fallback}
                </div>
              )}
            </div>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // User is authenticated, render children with user context
  return (
    <div className="user-context" data-user-id={user.id}>
      {children}
    </div>
  );
} 