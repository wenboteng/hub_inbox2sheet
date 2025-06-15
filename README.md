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

## Environment Variables

Required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `NEXT_PUBLIC_BASE_URL`: Your application's public URL

## Database Schema

The application uses Prisma with PostgreSQL. Key models:

- `SubmittedQuestion`: Stores user-submitted questions and answers
- `Answer`: Stores crawled answers from OTA help centers
- `CrawlJob`: Tracks crawling jobs and their status

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [MeiliSearch](https://www.meilisearch.com/)
- [Playwright](https://playwright.dev/)
