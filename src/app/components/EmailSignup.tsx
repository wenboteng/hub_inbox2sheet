'use client';

import { useState } from 'react';

export default function EmailSignup() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Subscribing...');

    // This is where you would connect to your backend or email service
    // For now, we'll just simulate a successful subscription
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setMessage(`Thanks for subscribing, ${email}!`);
    setEmail('');
  };

  return (
    <div className="mt-16 rounded-2xl bg-gray-50 p-8">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            🛎️ Get Weekly OTA Fixes
        </h2>
        <p className="mt-4 text-lg text-gray-600">
            New answers, vendor issues, and updates — straight to your inbox.
        </p>
        <form className="mt-6 sm:flex sm:max-w-md" onSubmit={handleSubmit}>
            <label htmlFor="email-address" className="sr-only">Email address</label>
            <input
                type="email"
                name="email-address"
                id="email-address"
                autoComplete="email"
                required
                className="w-full min-w-0 appearance-none rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:w-64 sm:text-sm sm:leading-6 xl:w-full"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <div className="mt-4 sm:ml-4 sm:mt-0 sm:flex-shrink-0">
                <button
                    type="submit"
                    className="flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                    Subscribe
                </button>
            </div>
        </form>
        {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
    </div>
  );
} 