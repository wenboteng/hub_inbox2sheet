# 📊 OTA Answers Report System Documentation

## Overview

The OTA Answers Report System enables you to generate, store, and display analytics reports for tour vendors and admins. Reports are generated from your database (e.g., imported GetYourGuide data), saved in the database, and rendered beautifully on the `/reports` page with interactive, SEO-friendly UI.

---

## 1. How It Works

- **Data Source:** Reports are generated from your database tables (e.g., `importedGYGActivity`).
- **Report Generation:** Scripts (TypeScript, in `src/scripts/`) aggregate, analyze, and format data as Markdown.
- **Storage:** Reports are saved in the `Report` table in your database, with fields like `type`, `title`, `content`, and `isPublic`.
- **Frontend:** The `/reports` page fetches and displays only public reports, rendering Markdown (including tables) with enhanced styling and interactivity.

---

## 2. Generating a New Report

1. **Create a Script**
   - Add a new script in `src/scripts/` (e.g., `generate-gyg-city-country-report.ts`).
   - Use the Prisma client from `src/lib/prisma.ts`.
   - Aggregate and analyze your data as needed.
   - Format the report as Markdown (tables, insights, etc.).
   - Save or update the report in the `Report` table using a unique `type`.

2. **Example:**
   ```ts
   import prisma from '../lib/prisma';

   async function generateMyReport() {
     // 1. Query and aggregate your data
     const stats = await prisma.myTable.groupBy({ ... });

     // 2. Build a Markdown table or other content
     let table = '| Col1 | Col2 |\n|------|------|\n';
     for (const row of stats) {
       table += `| ${row.col1} | ${row.col2} |\n`;
     }

     // 3. Compose the report
     const report = `# My Report Title\n\n${table}\n\nSome insights...`;

     // 4. Save to the database
     await prisma.report.upsert({
       where: { type: 'my-report-type' },
       create: { type: 'my-report-type', title: 'My Report Title', content: report, isPublic: true },
       update: { title: 'My Report Title', content: report, isPublic: true },
     });

     await prisma.$disconnect();
   }

   if (require.main === module) {
     generateMyReport();
   }
   ```

3. **Run the Script**
   ```sh
   npx ts-node src/scripts/generate-my-report.ts
   ```

4. **View the Report**
   - Go to `/reports` on your site.
   - The new report will appear in the sidebar if `isPublic: true`.

---

## 3. Updating Reports with New Data

- As new data is imported (e.g., new GetYourGuide activities), simply re-run the relevant report script(s).
- The script will update the report content in the database.
- The frontend will always show the latest version.

---

## 4. Admin/System Reports

- Set `isPublic: false` for internal/admin-only reports.
- These will not appear to regular users.

---

## 5. Best Practices

- Use clear, descriptive titles and types for each report.
- Include a Markdown table for key stats, and a "Key Insights" section for actionable takeaways.
- Keep scripts modular—one script per report.
- Use the `upsert` method to avoid duplicate reports.

---

## 6. Extending the System

- Add new scripts for new types of analysis as your data grows.
- Enhance the frontend with more interactivity (search, filters, downloads) as needed.
- Use the same Markdown+Prisma pattern for all future reports.

---

**Questions or want to automate report generation on a schedule? Let me know!** 