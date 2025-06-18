"use strict";
"use client";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SearchPage;
var react_1 = require("react");
var use_debounce_1 = require("use-debounce");
function SearchPage() {
    var _this = this;
    var _a = (0, react_1.useState)(""), searchQuery = _a[0], setSearchQuery = _a[1];
    var _b = (0, react_1.useState)("all"), selectedPlatform = _b[0], setSelectedPlatform = _b[1];
    var _c = (0, react_1.useState)([]), results = _c[0], setResults = _c[1];
    var _d = (0, react_1.useState)(false), isLoading = _d[0], setIsLoading = _d[1];
    var _e = (0, react_1.useState)({}), expandedArticles = _e[0], setExpandedArticles = _e[1];
    var debouncedSearchQuery = (0, use_debounce_1.useDebounce)(searchQuery, 300)[0];
    (0, react_1.useEffect)(function () {
        function performSearch() {
            return __awaiter(this, void 0, void 0, function () {
                var params, response, data, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!debouncedSearchQuery) {
                                setResults([]);
                                return [2 /*return*/];
                            }
                            setIsLoading(true);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, 5, 6]);
                            params = new URLSearchParams(__assign({ q: debouncedSearchQuery }, (selectedPlatform !== "all" && { platform: selectedPlatform })));
                            return [4 /*yield*/, fetch("/api/search?".concat(params))];
                        case 2:
                            response = _a.sent();
                            return [4 /*yield*/, response.json()];
                        case 3:
                            data = _a.sent();
                            setResults(data.hits || []);
                            return [3 /*break*/, 6];
                        case 4:
                            error_1 = _a.sent();
                            console.error("Search failed:", error_1);
                            return [3 /*break*/, 6];
                        case 5:
                            setIsLoading(false);
                            return [7 /*endfinally*/];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        }
        performSearch();
    }, [debouncedSearchQuery, selectedPlatform]);
    var toggleArticle = function (articleId) { return __awaiter(_this, void 0, void 0, function () {
        var response, article_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (expandedArticles[articleId]) {
                        setExpandedArticles(function (prev) {
                            var _a;
                            return (__assign(__assign({}, prev), (_a = {}, _a[articleId] = false, _a)));
                        });
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("/api/articles/".concat(articleId))];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    article_1 = _a.sent();
                    // Update the article in results with full content
                    setResults(function (prev) {
                        return prev.map(function (a) {
                            return a.id === articleId
                                ? __assign(__assign({}, a), { answer: article_1.answer }) : a;
                        });
                    });
                    setExpandedArticles(function (prev) {
                        var _a;
                        return (__assign(__assign({}, prev), (_a = {}, _a[articleId] = true, _a)));
                    });
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    console.error("Failed to fetch article:", error_2);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Search Knowledge Base</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        <input type="text" placeholder="Search for answers..." className="px-4 py-2 border rounded-lg flex-grow" value={searchQuery} onChange={function (e) { return setSearchQuery(e.target.value); }}/>

        <select className="px-4 py-2 border rounded-lg" value={selectedPlatform} onChange={function (e) { return setSelectedPlatform(e.target.value); }}>
          <option value="all">All Platforms</option>
          <option value="Airbnb">Airbnb</option>
          <option value="GetYourGuide">GetYourGuide</option>
        </select>
      </div>

      {isLoading ? (<div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]"/>
          <p className="mt-2 text-sm text-gray-500">Searching...</p>
        </div>) : results.length > 0 ? (<div className="space-y-6">
          {results.map(function (article) { return (<div key={article.id} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  {article.platform}
                </span>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                  {article.category}
                </span>
              </div>
              <h2 className="text-xl font-semibold mb-4">{article.question}</h2>
              <div className="prose max-w-none mb-4">
                {expandedArticles[article.id] ? (<div dangerouslySetInnerHTML={{ __html: article.answer || "" }}/>) : (<div dangerouslySetInnerHTML={{ __html: article.snippet }}/>)}
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="space-x-4">
                  <button onClick={function () { return toggleArticle(article.id); }} className="text-blue-500 hover:text-blue-600">
                    {expandedArticles[article.id] ? "Show Less" : "View Full Article"}
                  </button>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
                    View Source →
                  </a>
                </div>
                <span className="text-gray-500">
                  Last updated: {new Date(article.lastUpdated).toLocaleDateString()}
                </span>
              </div>
            </div>); })}
        </div>) : searchQuery ? (<div className="text-center py-8">
          <p className="text-gray-500">No results found</p>
        </div>) : null}
    </div>);
}
