"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { PrismaClient } from "@prisma/client";

type SubmittedQuestion = {
  id: string;
  question: string;
  platform: string;
  email: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  manualAnswer: string | null;
  isPublic: boolean;
  sourceUrl: string | null;
  tags: string[];
  aiGenerated: boolean;
  tone: string | null;
};

export default function AdminPage() {
  const [questions, setQuestions] = useState<SubmittedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [editingAnswer, setEditingAnswer] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [crawlMessage, setCrawlMessage] = useState<string | null>(null);

  const platforms = ["All", "Airbnb", "Viator", "Booking.com", "GetYourGuide", "Expedia", "TripAdvisor"];
  const statuses = ["All", "pending", "answered", "rejected"];

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch("/api/admin/questions");
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuestionStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      const updatedQuestion = await response.json();
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? updatedQuestion : q))
      );
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const updateQuestionAnswer = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          manualAnswer: answerText,
          status: "answered"
        }),
      });

      if (!response.ok) throw new Error("Failed to update answer");

      const updatedQuestion = await response.json();
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? updatedQuestion : q))
      );
      setEditingAnswer(null);
      setAnswerText("");
    } catch (error) {
      console.error("Error updating answer:", error);
      alert("Failed to update answer");
    }
  };

  const togglePublicKB = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !currentStatus }),
      });

      if (!response.ok) throw new Error("Failed to update public status");

      const updatedQuestion = await response.json();
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? updatedQuestion : q))
      );
    } catch (error) {
      console.error("Error updating public status:", error);
      alert("Failed to update public status");
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete question");
      }

      // Refresh questions list
      fetchQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
      alert("Failed to delete question");
    }
  };

  const triggerCrawl = async () => {
    setCrawlLoading(true);
    setCrawlMessage(null);
    try {
      const response = await fetch("/api/crawl", { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        setCrawlMessage(data.message || "Crawl completed successfully!");
      } else {
        setCrawlMessage(data.error || "Crawl failed");
      }
    } catch (error) {
      setCrawlMessage("Crawl failed: " + (error as Error).message);
    } finally {
      setCrawlLoading(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.question
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesPlatform =
      selectedPlatform === "all" || q.platform === selectedPlatform;
    const matchesStatus = selectedStatus === "all" || q.status === selectedStatus;
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        {/* Crawl Trigger Button */}
        <button
          className={`px-4 py-2 rounded text-white ${crawlLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          onClick={triggerCrawl}
          disabled={crawlLoading}
        >
          {crawlLoading ? 'Crawling...' : 'Trigger Manual Crawl'}
        </button>
        {crawlMessage && (
          <span className="ml-4 text-sm font-medium text-green-600">{crawlMessage}</span>
        )}
        <input
          type="text"
          placeholder="Search questions..."
          className="px-4 py-2 border rounded-lg flex-grow"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          className="px-4 py-2 border rounded-lg"
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
        >
          <option value="all">All Platforms</option>
          <option value="airbnb">Airbnb</option>
          <option value="viator">Viator</option>
          <option value="getyourguide">GetYourGuide</option>
          <option value="tripadvisor">TripAdvisor</option>
        </select>

        <select
          className="px-4 py-2 border rounded-lg"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="answered">Answered</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
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
              {filteredQuestions.map((question) => (
                <tr key={question.id}>
                  <td className="px-6 py-4 whitespace-normal">
                    {question.question}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {question.platform}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="px-2 py-1 border rounded"
                      value={question.status}
                      onChange={(e) =>
                        updateQuestionStatus(question.id, e.target.value)
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="answered">Answered</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-normal">
                    {editingAnswer === question.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full px-2 py-1 border rounded"
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            onClick={() => updateQuestionAnswer(question.id)}
                          >
                            Save
                          </button>
                          <button
                            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                            onClick={() => {
                              setEditingAnswer(null);
                              setAnswerText("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {question.manualAnswer ? (
                          <div className="space-y-2">
                            <p className="text-sm">{question.manualAnswer}</p>
                            <button
                              className="text-blue-500 hover:text-blue-600"
                              onClick={() => {
                                setEditingAnswer(question.id);
                                setAnswerText(question.manualAnswer || "");
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <button
                            className="text-blue-500 hover:text-blue-600"
                            onClick={() => {
                              setEditingAnswer(question.id);
                              setAnswerText("");
                            }}
                          >
                            Add Answer
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      className={`px-3 py-1 rounded ${
                        question.isPublic
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                      onClick={() => togglePublicKB(question.id, question.isPublic)}
                    >
                      {question.isPublic ? "Public" : "Private"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      className="text-red-500 hover:text-red-600"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 