"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = robots;
function robots() {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/api/"],
        },
        sitemap: "".concat(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000", "/sitemap.xml"),
    };
}
