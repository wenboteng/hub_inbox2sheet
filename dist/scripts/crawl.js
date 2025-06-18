"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crawler_1 = require("../lib/crawler");
console.log("[DEBUG] Current working directory:", process.cwd());
// List of URLs to scrape
const urlsToScrape = [
    // Airbnb
    'https://www.airbnb.com/help/article/123',
    'https://www.airbnb.com/help/article/456',
    // Booking.com
    'https://partner.booking.com/en-us/help/article/789',
    'https://partner.booking.com/en-us/help/article/012',
    // GetYourGuide
    'https://supplier.getyourguide.com/help/article/345',
    'https://supplier.getyourguide.com/help/article/678',
    // Expedia
    'https://apps.expediapartnercentral.com/help/article/901',
    'https://apps.expediapartnercentral.com/help/article/234',
];
async function main() {
    try {
        console.log("Starting scrape...");
        await (0, crawler_1.scrapeUrls)(urlsToScrape);
        console.log("Scrape completed successfully!");
        process.exit(0);
    }
    catch (error) {
        console.error("Scrape failed:", error);
        process.exit(1);
    }
}
main();
