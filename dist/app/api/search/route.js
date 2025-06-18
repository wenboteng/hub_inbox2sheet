"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
var server_1 = require("next/server");
var prisma_1 = __importDefault(require("../../../lib/prisma"));
var openai_1 = require("../../../utils/openai");
// Helper function to highlight search terms in text
function highlightTerms(text, terms) {
    var highlighted = text;
    terms.forEach(function (term) {
        var regex = new RegExp("(".concat(term, ")"), 'gi');
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    return highlighted;
}
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var searchParams, query_1, platform, category, queryEmbedding_1, baseQuery, articles, results, sortedResults, error_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    searchParams = new URL(request.url).searchParams;
                    query_1 = searchParams.get('q') || '';
                    platform = searchParams.get('platform');
                    category = searchParams.get("category");
                    if (!query_1) {
                        return [2 /*return*/, server_1.NextResponse.json({ articles: [] })];
                    }
                    return [4 /*yield*/, (0, openai_1.getEmbedding)(query_1)];
                case 1:
                    queryEmbedding_1 = _a.sent();
                    baseQuery = {
                        where: __assign({}, (platform ? { platform: platform } : {})),
                        select: {
                            id: true,
                            url: true,
                            question: true,
                            platform: true,
                            category: true,
                            paragraphs: true,
                        },
                        take: 3,
                    };
                    return [4 /*yield*/, prisma_1.default.article.findMany(baseQuery)];
                case 2:
                    articles = _a.sent();
                    return [4 /*yield*/, Promise.all(articles.map(function (article) { return __awaiter(_this, void 0, void 0, function () {
                            var paragraphs, relevantParagraphs, score, snippets;
                            return __generator(this, function (_a) {
                                paragraphs = article.paragraphs.map(function (p) { return ({
                                    text: p.text,
                                    embedding: p.embedding,
                                }); });
                                relevantParagraphs = paragraphs
                                    .map(function (para) { return ({
                                    text: para.text,
                                    similarity: cosineSimilarity(queryEmbedding_1, para.embedding),
                                }); })
                                    .sort(function (a, b) { return b.similarity - a.similarity; })
                                    .slice(0, 2);
                                score = relevantParagraphs.length > 0
                                    ? relevantParagraphs[0].similarity
                                    : 0;
                                snippets = relevantParagraphs.map(function (p) {
                                    return highlightTerms(p.text, query_1.split(' '));
                                });
                                return [2 /*return*/, {
                                        id: article.id,
                                        url: article.url,
                                        question: article.question,
                                        platform: article.platform,
                                        category: article.category,
                                        snippets: snippets,
                                        score: score,
                                    }];
                            });
                        }); }))];
                case 3:
                    results = _a.sent();
                    sortedResults = results
                        .sort(function (a, b) { return b.score - a.score; })
                        .filter(function (r) { return r.score > 0.7; });
                    return [2 /*return*/, server_1.NextResponse.json({ articles: sortedResults })];
                case 4:
                    error_1 = _a.sent();
                    console.error('Search error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: 'Failed to perform search' }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Helper function for cosine similarity
function cosineSimilarity(vecA, vecB) {
    var dotProduct = vecA.reduce(function (acc, val, i) { return acc + val * vecB[i]; }, 0);
    var normA = Math.sqrt(vecA.reduce(function (acc, val) { return acc + val * val; }, 0));
    var normB = Math.sqrt(vecB.reduce(function (acc, val) { return acc + val * val; }, 0));
    return dotProduct / (normA * normB);
}
