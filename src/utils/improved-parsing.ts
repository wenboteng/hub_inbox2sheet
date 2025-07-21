
// Updated Import Functions for Future Use

export function parseReviewCountFromText(reviewText: string): { text: string, numeric: number | null } {
  if (!reviewText || reviewText.trim() === '') {
    return { text: 'Unknown', numeric: null };
  }

  const text = reviewText.trim();
  
  // Handle "Unknown" cases
  if (text.toLowerCase() === 'unknown') {
    return { text: 'Unknown', numeric: null };
  }

  // Handle "X reviews" format
  const reviewsMatch = text.match(/(\d+(?:,\d+)*)\s*reviews?/i);
  if (reviewsMatch) {
    const numeric = parseInt(reviewsMatch[1].replace(/,/g, ''));
    return { text: `${numeric} reviews`, numeric };
  }

  // Handle pure numbers (with or without commas)
  const numberMatch = text.match(/^(\d+(?:,\d+)*)$/);
  if (numberMatch) {
    const numeric = parseInt(numberMatch[1].replace(/,/g, ''));
    return { text: numeric.toString(), numeric };
  }

  // Handle "X,XXX" format
  const commaMatch = text.match(/^(\d{1,3}(?:,\d{3})*)$/);
  if (commaMatch) {
    const numeric = parseInt(commaMatch[1].replace(/,/g, ''));
    return { text: numeric.toString(), numeric };
  }

  // If we can't parse it, keep the original text
  return { text, numeric: null };
}

export function parseRatingFromText(ratingText: string): { text: string, numeric: number | null } {
  if (!ratingText || ratingText.trim() === '') {
    return { text: 'Unknown', numeric: null };
  }

  const text = ratingText.trim();
  
  // Handle "Unknown" cases
  if (text.toLowerCase() === 'unknown') {
    return { text: 'Unknown', numeric: null };
  }

  // Handle rating with review count: "4.4 (63,652)"
  const ratingWithReviewsMatch = text.match(/^(\d+(?:\.\d+)?)\s*\([^)]+\)$/);
  if (ratingWithReviewsMatch) {
    const rating = parseFloat(ratingWithReviewsMatch[1]);
    return { text: rating.toString(), numeric: rating >= 0 && rating <= 5 ? rating : null };
  }

  // Handle pure rating: "4.4"
  const ratingMatch = text.match(/^(\d+(?:\.\d+)?)$/);
  if (ratingMatch) {
    const rating = parseFloat(ratingMatch[1]);
    return { text: rating.toString(), numeric: rating >= 0 && rating <= 5 ? rating : null };
  }

  // If we can't parse it, keep the original text
  return { text, numeric: null };
}

export function parsePriceFromText(priceText: string): { text: string, numeric: number | null, currency: string | null } {
  if (!priceText || priceText.trim() === '') {
    return { text: 'Unknown', numeric: null, currency: null };
  }

  const text = priceText.trim();
  
  // Handle "Unknown" cases
  if (text.toLowerCase() === 'unknown') {
    return { text: 'Unknown', numeric: null, currency: null };
  }

  // Handle "From €45" format
  const fromMatch = text.match(/from\s*([€$£¥])(\d+(?:,\d+)?(?:\.\d+)?)/i);
  if (fromMatch) {
    const currency = fromMatch[1];
    const numeric = parseFloat(fromMatch[2].replace(',', ''));
    return { text, numeric, currency };
  }

  // Handle "€43" format
  const currencyMatch = text.match(/^([€$£¥])(\d+(?:,\d+)?(?:\.\d+)?)$/);
  if (currencyMatch) {
    const currency = currencyMatch[1];
    const numeric = parseFloat(currencyMatch[2].replace(',', ''));
    return { text, numeric, currency };
  }

  // Handle "€33-45" range format (take average)
  const rangeMatch = text.match(/^([€$£¥])(\d+)-(\d+)$/);
  if (rangeMatch) {
    const currency = rangeMatch[1];
    const min = parseInt(rangeMatch[2]);
    const max = parseInt(rangeMatch[3]);
    const numeric = (min + max) / 2;
    return { text, numeric, currency };
  }

  // Handle pure numbers
  const numberMatch = text.match(/^(\d+(?:,\d+)?(?:\.\d+)?)$/);
  if (numberMatch) {
    const numeric = parseFloat(numberMatch[1].replace(',', ''));
    return { text, numeric, currency: null };
  }

  // If we can't parse it, keep the original text
  return { text, numeric: null, currency: null };
}
