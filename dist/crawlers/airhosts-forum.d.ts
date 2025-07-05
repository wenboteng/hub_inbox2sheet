interface AirHostsPost {
    url: string;
    question: string;
    answer: string;
    platform: string;
    category: string;
}
export declare function crawlAirHostsForum(): Promise<AirHostsPost[]>;
export {};
//# sourceMappingURL=airhosts-forum.d.ts.map