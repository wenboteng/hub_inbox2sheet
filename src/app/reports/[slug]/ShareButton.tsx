"use client";

interface ShareButtonProps {
  url: string;
}

export default function ShareButton({ url }: ShareButtonProps) {
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(url);
      alert('Link copied!');
    }
  };

  return (
    <button
      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
      onClick={handleShare}
      title="Copy link to this report"
    >
      Share
    </button>
  );
} 