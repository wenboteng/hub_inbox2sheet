import { PrismaClient } from '@prisma/client';
import { slugify } from '../src/utils/slugify';

const prisma = new PrismaClient();

async function main() {
  const articlesToUpdate = await prisma.article.findMany({
    where: {
      slug: null,
    },
  });

  console.log(`Found ${articlesToUpdate.length} articles to update.`);

  for (const article of articlesToUpdate) {
    let slug = slugify(article.question);
    let isUnique = false;
    let counter = 1;

    while (!isUnique) {
      const existingArticle = await prisma.article.findUnique({
        where: { slug },
      });

      if (existingArticle) {
        slug = `${slugify(article.question)}-${counter}`;
        counter++;
      } else {
        isUnique = true;
      }
    }
    
    await prisma.article.update({
      where: { id: article.id },
      data: { slug },
    });

    console.log(`Updated article ${article.id} with slug: ${slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 