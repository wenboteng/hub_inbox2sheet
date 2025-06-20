# OTA Answers

A knowledge base for tour vendors to find answers about OTA platforms like Airbnb, Viator, GetYourGuide, and more.

## Features

- Admin interface for managing questions and answers
- Public knowledge base with search and filtering
- SEO optimized for search engines
- Automatic crawling of OTA help centers using Axios + Cheerio

## Tech Stack

- Next.js 14
- Prisma (PostgreSQL)
- Tailwind CSS
- TypeScript
- Axios + Cheerio for web crawling

## Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ota-answers
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your database URL and other configurations.

5. Run database migrations:
```bash
npx prisma db push
```

6. Start the development server:
```bash
npm run dev
```

## Deployment on Render

1. Create a new PostgreSQL database on Render.

2. Create a new Web Service on Render:
   - Connect your GitHub repository
   - Select the repository
   - Use the following settings:
     - Name: ota-answers
     - Environment: Node
     - Build Command: `npm install && npx prisma generate && npm run build`
     - Start Command: `npm start`

3. Add the following environment variables in Render:
   - `DATABASE_URL`: Your PostgreSQL database URL
   - `NEXT_PUBLIC_BASE_URL`: Your Render service URL (e.g., https://ota-answers.onrender.com)

4. Deploy!

### Scheduled Crawling (Cron Jobs) on Render

To keep your knowledge base fresh and growing, set up the following **Render Cron Jobs**:

| Task                  | Frequency    | Command                        | Description                         |
|-----------------------|-------------|--------------------------------|-------------------------------------|
| `recheck`             | Every 6 hrs | `npm run recheck`              | Refreshes existing content only if it is old or changed |
| `discovery`           | Daily       | `npm run discovery`            | Discovers and crawls new official articles and threads  |
| `community-discover`  | Every 12 hrs| `npm run community-discover`   | Finds and crawls new community/forum content           |

**How to set up each job:**
- **Build Command:**
  ```bash
  npm install && npx prisma generate && npm run build
  ```
- **Start Command:** (choose one per job)
  ```bash
  npm run recheck
  # or
  npm run discovery
  # or
  npm run community-discover
  ```
- **Environment Variables:**
  - `DATABASE_URL`: Your PostgreSQL database URL
  - `NEXT_PUBLIC_BASE_URL`: Your Render service URL (e.g., https://ota-answers.onrender.com)
  - `OPENAI_API_KEY`: Your OpenAI API key for embeddings
- **Schedule:**
  - `recheck`: `0 */6 * * *` (every 6 hours)
  - `discovery`: `0 3 * * *` (daily at 3am UTC)
  - `community-discover`: `0 */12 * * *` (every 12 hours)

**What each job does:**
- `recheck`: Only re-scrapes articles that haven't been updated in 7+ days, using ETag/Last-Modified headers to avoid unnecessary work.
- `discovery`: Starts from index/category pages, finds new articles/threads, and adds them to the crawl queue.
- `community-discover`: Crawls community forums, paginates through threads, and adds new user-generated content.

## Environment Variables

Required environment variables:

- `DATABASE_URL`: Your PostgreSQL database URL
- `NEXT_PUBLIC_BASE_URL`: Your Render service URL (e.g., https://ota-answers.onrender.com)
- `OPENAI_API_KEY`: Your OpenAI API key for embeddings

Optional environment variables for OTA platform access:

Expedia Partner Central:
- `EXPEDIA_USERNAME`: Your Expedia Partner Central username
- `EXPEDIA_PASSWORD`: Your Expedia Partner Central password
- `EXPEDIA_SESSION_COOKIE`: Your Expedia Partner Central session cookie (if using session-based auth)

Booking.com Partner Portal:
- `BOOKING_API_TOKEN`: Your Booking.com Partner API token
- `BOOKING_SESSION_COOKIE`: Your Booking.com Partner session cookie
- `BOOKING_XSRF_TOKEN`: Your Booking.com Partner XSRF token

GetYourGuide Supplier Portal:
- `GETYOURGUIDE_EMAIL`: Your GetYourGuide supplier account email
- `GETYOURGUIDE_PASSWORD`: Your GetYourGuide supplier account password