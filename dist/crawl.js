"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var airbnb_1 = require("./crawlers/airbnb");
var viator_1 = require("./crawlers/viator");
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var airbnbArticles, viatorArticles, _i, _a, article, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('[CRAWLER] Starting crawl process');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 8, 9, 11]);
                    return [4 /*yield*/, (0, airbnb_1.crawlAirbnbArticles)()];
                case 2:
                    airbnbArticles = _b.sent();
                    console.log("[CRAWLER] Crawled ".concat(airbnbArticles.length, " Airbnb articles"));
                    return [4 /*yield*/, (0, viator_1.crawlViatorArticles)()];
                case 3:
                    viatorArticles = _b.sent();
                    console.log("[CRAWLER] Crawled ".concat(viatorArticles.length, " Viator articles"));
                    _i = 0, _a = __spreadArray(__spreadArray([], airbnbArticles, true), viatorArticles, true);
                    _b.label = 4;
                case 4:
                    if (!(_i < _a.length)) return [3 /*break*/, 7];
                    article = _a[_i];
                    return [4 /*yield*/, prisma.answer.upsert({
                            where: { sourceUrl: article.url },
                            create: {
                                question: article.question,
                                answer: article.answer,
                                firstAnswerParagraph: article.answer.split('\n')[0],
                                sourceUrl: article.url,
                                platform: article.platform,
                                category: 'help-center',
                                tags: [],
                            },
                            update: {
                                question: article.question,
                                answer: article.answer,
                                firstAnswerParagraph: article.answer.split('\n')[0],
                                platform: article.platform,
                            },
                        })];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7:
                    console.log('[CRAWLER] Successfully stored all articles in database');
                    return [3 /*break*/, 11];
                case 8:
                    error_1 = _b.sent();
                    console.error('[CRAWLER] Error during crawl process:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 11];
                case 9: return [4 /*yield*/, prisma.$disconnect()];
                case 10:
                    _b.sent();
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    });
}
// Run the crawler
main().catch(console.error);
