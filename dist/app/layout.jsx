"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
var google_1 = require("next/font/google");
require("./globals.css");
var link_1 = __importDefault(require("next/link"));
var inter = (0, google_1.Inter)({ subsets: ["latin"] });
exports.metadata = {
    title: "OTA Answer Hub - Find Solutions for Tour Vendors",
    description: "Centralized knowledge base for tour vendors across platforms like Airbnb, Viator, Booking.com, and more.",
};
function RootLayout(_a) {
    var children = _a.children;
    return (<html lang="en">
      <body className={inter.className}>
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <link_1.default href="/" className="text-xl font-bold text-gray-900">
                    OTA Answer Hub
                  </link_1.default>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <link_1.default href="/search" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Search Answers
                  </link_1.default>
                  <link_1.default href="/tools" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Tools
                  </link_1.default>
                  <link_1.default href="/submit" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Submit Question
                  </link_1.default>
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                <link_1.default href="https://inbox2sheet.com" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                  Try Inbox2Sheet
                </link_1.default>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>);
}
