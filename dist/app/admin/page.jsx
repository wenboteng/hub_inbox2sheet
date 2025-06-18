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
exports.default = AdminPage;
var react_1 = require("react");
function AdminPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), questions = _a[0], setQuestions = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(""), searchQuery = _c[0], setSearchQuery = _c[1];
    var _d = (0, react_1.useState)("all"), selectedPlatform = _d[0], setSelectedPlatform = _d[1];
    var _e = (0, react_1.useState)("all"), selectedStatus = _e[0], setSelectedStatus = _e[1];
    var _f = (0, react_1.useState)(null), editingAnswer = _f[0], setEditingAnswer = _f[1];
    var _g = (0, react_1.useState)(""), answerText = _g[0], setAnswerText = _g[1];
    var _h = (0, react_1.useState)(false), crawlLoading = _h[0], setCrawlLoading = _h[1];
    var _j = (0, react_1.useState)(null), crawlMessage = _j[0], setCrawlMessage = _j[1];
    var platforms = ["All", "Airbnb", "Viator", "Booking.com", "GetYourGuide", "Expedia", "TripAdvisor"];
    var statuses = ["All", "pending", "answered", "rejected"];
    (0, react_1.useEffect)(function () {
        fetchQuestions();
    }, []);
    var fetchQuestions = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, fetch("/api/admin/questions")];
                case 1:
                    response = _a.sent();
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
    var updateQuestionStatus = function (id, status) { return __awaiter(_this, void 0, void 0, function () {
        var response, updatedQuestion_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch("/api/admin/questions/".concat(id), {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: status }),
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error("Failed to update status");
                    return [4 /*yield*/, response.json()];
                case 2:
                    updatedQuestion_1 = _a.sent();
                    setQuestions(function (prev) {
                        return prev.map(function (q) { return (q.id === id ? updatedQuestion_1 : q); });
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    console.error("Error updating status:", error_2);
                    alert("Failed to update status");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var updateQuestionAnswer = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var response, updatedQuestion_2, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch("/api/admin/questions/".concat(id), {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                manualAnswer: answerText,
                                status: "answered"
                            }),
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error("Failed to update answer");
                    return [4 /*yield*/, response.json()];
                case 2:
                    updatedQuestion_2 = _a.sent();
                    setQuestions(function (prev) {
                        return prev.map(function (q) { return (q.id === id ? updatedQuestion_2 : q); });
                    });
                    setEditingAnswer(null);
                    setAnswerText("");
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _a.sent();
                    console.error("Error updating answer:", error_3);
                    alert("Failed to update answer");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var togglePublicKB = function (id, currentStatus) { return __awaiter(_this, void 0, void 0, function () {
        var response, updatedQuestion_3, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch("/api/admin/questions/".concat(id), {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ isPublic: !currentStatus }),
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error("Failed to update public status");
                    return [4 /*yield*/, response.json()];
                case 2:
                    updatedQuestion_3 = _a.sent();
                    setQuestions(function (prev) {
                        return prev.map(function (q) { return (q.id === id ? updatedQuestion_3 : q); });
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _a.sent();
                    console.error("Error updating public status:", error_4);
                    alert("Failed to update public status");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var deleteQuestion = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var response, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!confirm("Are you sure you want to delete this question?")) {
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch("/api/admin/questions/".concat(id), {
                            method: "DELETE",
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("Failed to delete question");
                    }
                    // Refresh questions list
                    fetchQuestions();
                    return [3 /*break*/, 4];
                case 3:
                    error_5 = _a.sent();
                    console.error("Error deleting question:", error_5);
                    alert("Failed to delete question");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var triggerCrawl = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setCrawlLoading(true);
                    setCrawlMessage(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch("/api/crawl", { method: "POST" })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (response.ok) {
                        setCrawlMessage(data.message || "Crawl completed successfully!");
                    }
                    else {
                        setCrawlMessage(data.error || "Crawl failed");
                    }
                    return [3 /*break*/, 6];
                case 4:
                    error_6 = _a.sent();
                    setCrawlMessage("Crawl failed: " + error_6.message);
                    return [3 /*break*/, 6];
                case 5:
                    setCrawlLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var filteredQuestions = questions.filter(function (q) {
        var matchesSearch = q.question
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        var matchesPlatform = selectedPlatform === "all" || q.platform === selectedPlatform;
        var matchesStatus = selectedStatus === "all" || q.status === selectedStatus;
        return matchesSearch && matchesPlatform && matchesStatus;
    });
    return (<div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        {/* Crawl Trigger Button */}
        <button className={"px-4 py-2 rounded text-white ".concat(crawlLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700')} onClick={triggerCrawl} disabled={crawlLoading}>
          {crawlLoading ? 'Crawling...' : 'Trigger Manual Crawl'}
        </button>
        {crawlMessage && (<span className="ml-4 text-sm font-medium text-green-600">{crawlMessage}</span>)}
        <input type="text" placeholder="Search questions..." className="px-4 py-2 border rounded-lg flex-grow" value={searchQuery} onChange={function (e) { return setSearchQuery(e.target.value); }}/>

        <select className="px-4 py-2 border rounded-lg" value={selectedPlatform} onChange={function (e) { return setSelectedPlatform(e.target.value); }}>
          <option value="all">All Platforms</option>
          <option value="airbnb">Airbnb</option>
          <option value="viator">Viator</option>
          <option value="getyourguide">GetYourGuide</option>
          <option value="tripadvisor">TripAdvisor</option>
        </select>

        <select className="px-4 py-2 border rounded-lg" value={selectedStatus} onChange={function (e) { return setSelectedStatus(e.target.value); }}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="answered">Answered</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (<div className="text-center py-8">Loading...</div>) : (<div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Question
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Answer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Public KB
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredQuestions.map(function (question) { return (<tr key={question.id}>
                  <td className="px-6 py-4 whitespace-normal">
                    {question.question}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {question.platform}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select className="px-2 py-1 border rounded" value={question.status} onChange={function (e) {
                    return updateQuestionStatus(question.id, e.target.value);
                }}>
                      <option value="pending">Pending</option>
                      <option value="answered">Answered</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-normal">
                    {editingAnswer === question.id ? (<div className="space-y-2">
                        <textarea className="w-full px-2 py-1 border rounded" value={answerText} onChange={function (e) { return setAnswerText(e.target.value); }} rows={3}/>
                        <div className="flex gap-2">
                          <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={function () { return updateQuestionAnswer(question.id); }}>
                            Save
                          </button>
                          <button className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600" onClick={function () {
                        setEditingAnswer(null);
                        setAnswerText("");
                    }}>
                            Cancel
                          </button>
                        </div>
                      </div>) : (<div>
                        {question.manualAnswer ? (<div className="space-y-2">
                            <p className="text-sm">{question.manualAnswer}</p>
                            <button className="text-blue-500 hover:text-blue-600" onClick={function () {
                            setEditingAnswer(question.id);
                            setAnswerText(question.manualAnswer || "");
                        }}>
                              Edit
                            </button>
                          </div>) : (<button className="text-blue-500 hover:text-blue-600" onClick={function () {
                            setEditingAnswer(question.id);
                            setAnswerText("");
                        }}>
                            Add Answer
                          </button>)}
                      </div>)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className={"px-3 py-1 rounded ".concat(question.isPublic
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700")} onClick={function () { return togglePublicKB(question.id, question.isPublic); }}>
                      {question.isPublic ? "Public" : "Private"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-red-500 hover:text-red-600" onClick={function () { return deleteQuestion(question.id); }}>
                      Delete
                    </button>
                  </td>
                </tr>); })}
            </tbody>
          </table>
        </div>)}
    </div>);
}
