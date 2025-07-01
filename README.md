# OTA Answers

A knowledge base for tour vendors to find answers about OTA platforms like Airbnb, Viator, GetYourGuide, and more.

## Features

- Admin interface for managing questions and answers
- Public knowledge base with search and filtering
- SEO optimized for search engines
- Automatic crawling of OTA help centers using Axios + Cheerio
- **Analytics Suite**: Comprehensive reports for tour vendors including market analysis, customer insights, and competitive intelligence

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

## Analytics Suite

The platform includes a comprehensive analytics suite that generates valuable insights for tour vendors based on collected content from major travel platforms.

### Available Reports

- **Quick Demo** (`npm run analytics:demo`): Quick overview of key insights
- **Vendor Analytics** (`npm run analytics:vendor`): Comprehensive market analysis and strategic insights
- **Customer Insights** (`npm run analytics:customer`): Deep dive into customer behavior and pain points
- **Competitive Analysis** (`npm run analytics:competitive`): Competitive landscape and market positioning
- **Complete Suite** (`npm run analytics:all`): All reports with executive summary

### Admin Interface

Access analytics reports through the admin interface at `/admin`:

1. Navigate to the admin dashboard
2. Scroll to the "📊 Analytics Reports" section
3. Click on any report type to generate it
4. Reports are saved as markdown files in the project root

### Key Insights

Based on analysis of 260+ articles across 7 platforms:

- **Market Leader**: Airbnb (45% market share)
- **Top Customer Concerns**: Booking (155 mentions), Payment (97), Cancellation (64)
- **Language Opportunity**: 97% English content, huge potential for multilingual expansion
- **Community Engagement**: 43% community content, growing trend

### Use Cases for Tour Vendors

- **Market Entry**: Choose the right platforms to focus on
- **Content Strategy**: Create content that addresses real customer needs
- **Customer Support**: Understand and address customer pain points
- **Global Expansion**: Identify language and market opportunities
- **Competitive Positioning**: Find gaps and differentiation opportunities

For detailed documentation, see [ANALYTICS_CAPABILITIES.md](./ANALYTICS_CAPABILITIES.md).

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

### Expanding Discovery Sources

Add more URLs to the `indexUrls` arrays in `src/scripts/discovery.ts` and
`src/scripts/communityDiscover.ts` to cover additional help center sections or
forum categories. After editing these files, regenerate the compiled scripts:

```bash
npm run build:scripts
```

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
