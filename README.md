# OTA Answer Hub

A knowledge base for tour vendors to find answers about OTA platforms like Airbnb, Viator, GetYourGuide, and more.

## Features

- Admin interface for managing questions and answers
- Public knowledge base with search and filtering
- SEO optimized for search engines
- Automatic crawling of OTA help centers

## Tech Stack

- Next.js 14
- Prisma (PostgreSQL)
- Tailwind CSS
- TypeScript

## Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ota-answer-hub
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
     - Name: ota-answer-hub
     - Environment: Node
     - Build Command: `npm install && npx prisma generate && npm run build`
     - Start Command: `npm start`

3. Add the following environment variables in Render:
   - `DATABASE_URL`: Your PostgreSQL database URL
   - `NEXT_PUBLIC_BASE_URL`: Your Render service URL (e.g., https://ota-answer-hub.onrender.com)

4. Deploy!

### Scheduled Crawler (Cron Job) on Render

To run the crawler on a schedule (e.g., daily), create a new Cron Job service in Render with the following settings:

- **Build Command:**
  ```bash
  npm install && npx prisma generate && npm run build
  ```
- **Command:**
  ```bash
  npx playwright install && npx ts-node src/scripts/crawl.ts
  ```
  > **Note:** This ensures Playwright browsers are installed every time before crawling. Do **not** use `src/scripts/crawl.ts` as the path. The correct path is `scripts/crawl.ts` from the repo root.
- **Environment Variables:**
  - `DATABASE_URL`: Your PostgreSQL database URL
  - `NEXT_PUBLIC_BASE_URL`: Your Render service URL (e.g., https://ota-answer-hub.onrender.com)
  - `OPENAI_API_KEY`: Your OpenAI API key (if using AI features)
- **Schedule:**
  - Use a cron expression like `0 2 * * *` to run daily at 2am UTC

## Environment Variables

Required environment variables:

- `