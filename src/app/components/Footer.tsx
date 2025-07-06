import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-16">
      {/* Inbox2Sheet soft promotion - helping vendors grow smarter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Built with ❤️ by the Inbox2Sheet team — helping vendors grow smarter.</span>
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <Link
              href="/privacy-policy"
              rel="nofollow"
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200 hover:underline"
            >
              Privacy Policy
            </Link>
            <span className="text-gray-400">|</span>
            <Link
              href="/terms"
              rel="nofollow"
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200 hover:underline"
            >
              Terms & Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 