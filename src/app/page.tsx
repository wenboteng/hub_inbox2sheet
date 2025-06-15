import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Find Answers for Tour Vendors
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Search through verified solutions from Airbnb, Viator, Booking.com, and more.
          Save hours of manual searching with our centralized knowledge base.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/search"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Search Answers
          </Link>
          <Link
            href="/submit"
            className="text-sm font-semibold leading-6 text-gray-900"
          >
            Submit a Question <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

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
