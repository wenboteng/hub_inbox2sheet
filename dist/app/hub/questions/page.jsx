"use strict";
"use client";
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
exports.default = QuestionsPage;
var react_1 = require("react");
function QuestionsPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), questions = _a[0], setQuestions = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(""), searchQuery = _c[0], setSearchQuery = _c[1];
    var _d = (0, react_1.useState)("all"), selectedPlatform = _d[0], setSelectedPlatform = _d[1];
    (0, react_1.useEffect)(function () {
        fetchQuestions();
    }, []);
    var fetchQuestions = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, fetch("/api/hub/questions")];
                case 1:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error("Failed to fetch questions");
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    setQuestions(data);
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    console.error("Error fetching questions:", error_1);
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var filteredQuestions = questions.filter(function (q) {
        var matchesSearch = q.question
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        var matchesPlatform = selectedPlatform === "all" || q.platform === selectedPlatform;
        return matchesSearch && matchesPlatform;
    });
    return (<div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Knowledge Base</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        <input type="text" placeholder="Search questions..." className="px-4 py-2 border rounded-lg flex-grow" value={searchQuery} onChange={function (e) { return setSearchQuery(e.target.value); }}/>

        <select className="px-4 py-2 border rounded-lg" value={selectedPlatform} onChange={function (e) { return setSelectedPlatform(e.target.value); }}>
          <option value="all">All Platforms</option>
          <option value="airbnb">Airbnb</option>
          <option value="viator">Viator</option>
          <option value="getyourguide">GetYourGuide</option>
          <option value="tripadvisor">TripAdvisor</option>
        </select>
      </div>

      {loading ? (<div className="text-center py-8">Loading...</div>) : (<div className="space-y-6">
          {filteredQuestions.map(function (question) {
                var _a;
                return (<div key={question.id} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  {question.platform}
                </span>
                {(_a = question.tags) === null || _a === void 0 ? void 0 : _a.map(function (tag) { return (<span key={tag} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                    {tag}
                  </span>); })}
              </div>
              <h2 className="text-xl font-semibold mb-2">{question.question}</h2>
              {question.manualAnswer && (<div className="prose max-w-none mb-4">
                  <p>{question.manualAnswer}</p>
                </div>)}
              {question.sourceUrl && (<a href={question.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 text-sm">
                  View Source
                </a>)}
            </div>);
            })}
        </div>)}
    </div>);
}
