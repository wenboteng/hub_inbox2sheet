import Link from "next/link";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function Home() {
  // Get platform statistics for the homepage
  const platforms = await prisma.article.groupBy({
    by: ['platform'],
    _count: {
      id: true
    },
    where: {
      crawlStatus: 'active'
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 6
  });

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Get Instant Help with OTA Issues
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Search verified solutions from Airbnb, Viator, Booking.com, and other OTAs. 
          Save time with our centralized knowledge base — built for tour vendors.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/search"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200 hover:shadow-md"
          >
            Search Answers
          </Link>
          <Link
            href="/submit"
            className="text-sm font-semibold leading-6 text-gray-900 hover:text-indigo-600 transition-colors duration-200 hover:underline"
          >
            Submit a Question <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Platform Quick Links */}
      {platforms.length > 0 && (
        <div className="mt-16 w-full max-w-4xl">
          <h2 className="text-2xl font-semibold text-gray-900 text-center mb-8">
            Browse by Platform
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {platforms.map((platform) => (
              <Link
                key={platform.platform}
                href={`/platform/${encodeURIComponent(platform.platform)}`}
                className="group rounded-lg border border-gray-200 p-4 text-center hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200"
              >
                <h3 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {platform.platform}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {platform._count.id} articles
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-lg font-semibold leading-8 text-gray-900">
            Official Documentation
          </h3>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Verified answers from official OTA help centers and partner portals.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-lg font-semibold leading-8 text-gray-900">
            Community Solutions
          </h3>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Real-world solutions from experienced vendors on Reddit and forums.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-lg font-semibold leading-8 text-gray-900">
            Regular Updates
          </h3>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Our crawler automatically updates the knowledge base with new solutions.
          </p>
        </div>
      </div>
    </div>
  );
}
