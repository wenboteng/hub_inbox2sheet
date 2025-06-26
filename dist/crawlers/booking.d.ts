export interface BookingArticle {
    platform: 'Booking.com';
    url: string;
    question: string;
    answer: string;
    category?: string;
}
export declare function crawlBookingArticles(): Promise<BookingArticle[]>;
//# sourceMappingURL=booking.d.ts.map