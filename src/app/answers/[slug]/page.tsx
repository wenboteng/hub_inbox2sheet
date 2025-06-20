import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import EmailSignup from '@/app/components/EmailSignup';

const prisma = new PrismaClient();

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await prisma.article.findUnique({
    where: { slug: params.slug },
  });

  if (!article) {
    return {
      title: 'Answer not found',
    };
  }

  return {
    title: `${article.question} - OTA Answers`,
    description: article.answer.substring(0, 160),
    openGraph: {
      title: `${article.question} - OTA Answers`,
      description: article.answer.substring(0, 160),
      type: 'article',
      url: `https://ota-answers.com/answers/${article.slug}`, // Replace with actual domain
    },
  };
}

export default async function AnswerPage({ params }: Props) {
  const article = await prisma.article.findUnique({
    where: { slug: params.slug },
  });

  if (!article) {
    notFound();
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": article.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": article.answer
      }
    }]
  };

  return (
    <div className="bg-white px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <p className="text-base font-semibold leading-7 text-indigo-600">{article.platform} - {article.category}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {article.question}
        </h1>
        <div className="mt-6 prose lg:prose-xl" dangerouslySetInnerHTML={{ __html: article.answer }} />

        <div className="mt-10 border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-600">Was this helpful?</p>
          <div className="mt-2 flex items-center gap-x-4">
            <button className="rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-200">
              👍 Yes
            </button>
            <button className="rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-200">
              👎 No
            </button>
          </div>
        </div>

        <div className="mt-8">
            <p className="text-sm text-gray-600 mb-2">Share this answer:</p>
            <div className="flex space-x-2">
                <Link href={`https://www.linkedin.com/sharing/share-offsite/?url=https://ota-answers.com/answers/${article.slug}`} target="_blank" className="text-gray-500 hover:text-gray-700">LinkedIn</Link>
                <Link href={`https://twitter.com/intent/tweet?url=https://ota-answers.com/answers/${article.slug}&text=${encodeURIComponent(article.question)}`} target="_blank" className="text-gray-500 hover:text-gray-700">Twitter</Link>
                <Link href={`https://api.whatsapp.com/send?text=${encodeURIComponent(article.question + " " + "https://ota-answers.com/answers/" + article.slug)}`} target="_blank" className="text-gray-500 hover:text-gray-700">WhatsApp</Link>
                <Link href={`mailto:?subject=${encodeURIComponent(article.question)}&body=${encodeURIComponent("Check out this answer: https://ota-answers.com/answers/" + article.slug)}`} className="text-gray-500 hover:text-gray-700">Email</Link>
            </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-x-6 rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
            <div className="text-center">
                <h2 className="text-base font-semibold leading-7 text-gray-900">Have a different question?</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">Can't find the answer you're looking for? Submit your own question to our community.</p>
                <div className="mt-6">
                    <Link href="/submit" className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                        Submit a Question
                    </Link>
                </div>
            </div>
        </div>

        <EmailSignup />

      </div>
    </div>
  );
} 