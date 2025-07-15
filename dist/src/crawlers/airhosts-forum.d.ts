export interface AirHostsPost {
    platform: 'AirHosts Forum';
    url: string;
    question: string;
    answer: string;
    category?: string;
}
export declare function crawlAirHostsForum(): Promise<AirHostsPost[]>;
//# sourceMappingURL=airhosts-forum.d.ts.map