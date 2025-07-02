"use client";

import { useState, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UserProfile {
  sentiment: number;
  hobbies: [number, number, number];
  conversationCount: number;
}

type ChatPhase = "greeting" | "caring" | "matching" | "free";

interface AIChatBoxProps {
  geminiApiKey: string;
}

export default function AIChatBox({ geminiApiKey }: AIChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatPhase, setChatPhase] = useState<ChatPhase>("greeting");
  const [userProfile, setUserProfile] = useState<UserProfile>({
    sentiment: 0,
    hobbies: [0, 0, 0],
    conversationCount: 0,
  });

  useEffect(() => {
    const initialMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content:
        "Hello! I'm your personal chat assistant. How are you feeling today? Is there anything you'd like to share with me? 😊",
      timestamp: new Date(),
    };
    setMessages([initialMessage]);
  }, []);

  const callGeminiAPI = async (
    prompt: string,
    systemPrompt: string
  ): Promise<string> => {
    try {
      const fullPrompt = `${systemPrompt}\n\nUser says: ${prompt}`;
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
      const requestBody = {
        contents: [{ parts: [{ text: fullPrompt }] }],
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      const resultText = data.candidates[0]?.content?.parts[0]?.text;
      return resultText || "Sorry, I could not generate a response.";
    } catch (error) {
      const err = error as Error;
      console.error("❌ Gemini API Error:", err.message);
      return "Sorry, I encountered some technical issues. Please try again later.";
    }
  };

  const callRoomMatchingAPI = async (
    sentiment: number,
    hobbies: [number, number, number]
  ) => {
    const vector = [sentiment, ...hobbies];
    if (vector.every((v) => Math.abs(v) < 0.001)) return null;

    try {
      const response = await fetch("/api/room-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentiment, hobbies }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("Room matching API failed: " + errorText);
      }

      return await response.json();
    } catch (error) {
      const err = error as Error;
      console.error("❌ Room matching error:", err.message);
      return null;
    }
  };

  const analyzeUserInput = async (
    userInput: string
  ): Promise<Partial<UserProfile>> => {
    const analysisPrompt = `
IMPORTANT: Return ONLY a valid JSON object, no markdown formatting, no backticks, no explanation text.
{
  "sentiment": 0.5,
  "musicInterest": 0.3,
  "sportsInterest": 0.2,
  "socialInterest": 0.4
}
User input: "${userInput}"
Return only the JSON object:`;

    try {
      const result = await callGeminiAPI(
        analysisPrompt,
        "You are a professional emotion and interest analyst."
      );
      let cleaned = result.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[^}]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];

      const parsed = JSON.parse(cleaned);

      return {
        sentiment: parsed.sentiment ?? 0.1,
        hobbies: [
          parsed.musicInterest ?? 0.1,
          parsed.sportsInterest ?? 0.1,
          parsed.socialInterest ?? 0.1,
        ],
      };
    } catch (error) {
      const err = error as Error;
      console.error("❌ Analysis error:", err.message);
      return {
        sentiment: 0.1,
        hobbies: [0.1, 0.1, 0.1],
      };
    }
  };

  const getSystemPrompt = (phase: ChatPhase) => {
    const prompts = {
      greeting: "You are a warm and caring chat assistant.",
      caring: "Continue caring and ask about hobbies.",
      matching: "Prepare to recommend a room.",
      free: "Chat freely with a friendly tone.",
    };
    return prompts[phase] || "You are a helpful assistant.";
  };

  const shouldRecommendRoom = (text: string): boolean => {
    const keywords = ["recommend", "room", "where", "suggest"];
    return keywords.some((word) => text.toLowerCase().includes(word));
  };

  const handleRoomRecommendation = async (): Promise<string> => {
    const room = await callRoomMatchingAPI(
      userProfile.sentiment,
      userProfile.hobbies
    );
    if (room) {
      const {
        roomName,
        roomType,
        description,
        currentUsers,
        maxCapacity,
        matchScore,
      } = room;
      return `🏠 ${roomName} (${roomType})\n${description}\n👥 ${currentUsers}/${maxCapacity}\n🎯 Match: ${(
        matchScore * 100
      ).toFixed(1)}%`;
    } else {
      return "Sorry, no suitable room found now.";
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    setInput("");
    setIsLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: currentInput,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const analysis = await analyzeUserInput(currentInput);

      const updatedProfile = {
        sentiment: (userProfile.sentiment + (analysis.sentiment ?? 0)) / 2,
        hobbies: userProfile.hobbies.map(
          (h, i) => (h + (analysis.hobbies?.[i] ?? 0)) / 2
        ) as [number, number, number],
        conversationCount: userProfile.conversationCount + 1,
      };

      setUserProfile(updatedProfile);

      const needsRecommendation =
        shouldRecommendRoom(currentInput) ||
        (updatedProfile.conversationCount >= 2 && chatPhase === "caring");

      let aiResponse = "";
      if (needsRecommendation && chatPhase !== "free") {
        setChatPhase("matching");
        aiResponse = await handleRoomRecommendation();
        setChatPhase("free");
      } else {
        const systemPrompt = getSystemPrompt(chatPhase);
        aiResponse = await callGeminiAPI(currentInput, systemPrompt);
        if (chatPhase === "greeting" && updatedProfile.conversationCount >= 1)
          setChatPhase("caring");
        else if (
          chatPhase === "caring" &&
          updatedProfile.conversationCount >= 3
        )
          setChatPhase("matching");
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      const err = error as Error;
      console.error("❌ Error in sendMessage:", err.message);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an issue. Try again later.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      <div className="bg-blue-500 text-white p-4 rounded-t-lg">
        <h3 className="font-semibold">AI Chat Assistant</h3>
        <div className="text-xs opacity-80">
          Phase: {chatPhase} | Conversations: {userProfile.conversationCount}{" "}
          rounds
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              <div className="text-xs opacity-70 mt-1">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
              <div className="text-sm">AI is thinking...</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm resize-none"
            placeholder="Type your message..."
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Sentiment: {userProfile.sentiment.toFixed(2)} | Interests: [
          {userProfile.hobbies.map((h) => h.toFixed(2)).join(", ")}]
        </div>
      </div>
    </div>
  );
}
