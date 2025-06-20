import { Metadata } from "next";

export const metadata: Metadata = {
  title: "OTA Answers - Knowledge Base",
  description: "Find answers to common questions about Airbnb, Viator, GetYourGuide, and other OTA platforms.",
};

export default function QuestionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 