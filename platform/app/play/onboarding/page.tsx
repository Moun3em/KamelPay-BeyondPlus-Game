"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface SessionData {
  deviceId: string;
  tableNo: number;
  role: string;
  phase: string;
}

const QUESTIONS = [
  {
    id: 1,
    question: "What is the primary goal of UAE tax compliance?",
    options: ["Minimize taxes", "Ensure accurate reporting to FTA", "Hide transactions", "Speed up payments"],
    correct: 1,
  },
  {
    id: 2,
    question: "Which document is essential for tax filing?",
    options: ["Email", "Tax invoice", "Phone call log", "Business card"],
    correct: 1,
  },
  {
    id: 3,
    question: "What does TRN stand for?",
    options: ["Tax Return Number", "Tax Registration Number", "Trade Regulation Notice", "Transaction Record Notice"],
    correct: 1,
  },
  {
    id: 4,
    question: "How should sensitive financial data be handled?",
    options: ["Public posting", "Encrypted & secure", "Printed sheets", "Text messages"],
    correct: 1,
  },
  {
    id: 5,
    question: "What is XML in the context of compliance?",
    options: ["Email markup", "Structured data format", "Web browser", "Database query"],
    correct: 1,
  },
  {
    id: 6,
    question: "Who should approve financial transactions?",
    options: ["Any employee", "Authorized signatories", "Customers", "Random staff"],
    correct: 1,
  },
  {
    id: 7,
    question: "What is the purpose of an audit trail?",
    options: ["Marketing", "Track all transaction changes", "Social media", "Email management"],
    correct: 1,
  },
  {
    id: 8,
    question: "How often should compliance reviews occur?",
    options: ["Never", "Annually", "Every 5 years", "As needed + regular intervals"],
    correct: 3,
  },
  {
    id: 9,
    question: "What is a key indicator of financial fraud?",
    options: ["High revenue", "Unusual patterns", "New hires", "Office expansion"],
    correct: 1,
  },
  {
    id: 10,
    question: "Which role typically oversees tax compliance?",
    options: ["Marketing", "Tax & Compliance Officer", "Reception", "Security"],
    correct: 1,
  },
];

export default function OnboardingPage() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/state");
        if (!res.ok) {
          setError("Not in a session");
          return;
        }
        const data = await res.json();
        setSession(data.session);
        if (data.phase !== "TUTORIAL") {
          setError("Onboarding only available during TUTORIAL phase");
        }
      } catch (e) {
        setError("Failed to load session");
      }
    })();
  }, []);

  const q = QUESTIONS[currentQ];
  const answered = currentQ < answers.length;

  const handleAnswer = (optionIdx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = optionIdx;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (!answered) return;
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const correct = QUESTIONS.reduce((sum, q, idx) => sum + (answers[idx] === q.correct ? 1 : 0), 0);
    setScore(correct);
    setSubmitted(true);
  };

  const passed = score >= 7;

  if (!session) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-red-600">{error || "Loading..."}</p>
        <Link href="/" className="tap text-blue-600">
          Back to lobby
        </Link>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
        <div className={`rounded-lg p-6 text-center ${passed ? "bg-green-900/30" : "bg-red-900/30"}`}>
          <p className="mb-2 text-sm font-semibold">{passed ? "✓ PASSED" : "✗ NEEDS REVIEW"}</p>
          <p className="text-4xl font-bold">{score}/10</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{passed ? "Great! You're ready to play." : "Review the basics and try again."}</p>
        </div>

        {!passed && (
          <button
            type="button"
            className="tap rounded-lg border-2 border-[var(--fg)] bg-transparent px-4 py-2"
            onClick={() => {
              setCurrentQ(0);
              setAnswers([]);
              setSubmitted(false);
            }}
          >
            Retake Quiz
          </button>
        )}

        <Link href="/play/cfo" className="tap rounded-lg border-2 border-[var(--fg)] bg-[var(--fg)] py-3 text-center font-bold text-[var(--bg)]">
          {passed ? "Start Playing" : "Back to Lobby"}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-4 py-6">
      <div>
        <p className="mb-2 text-xs font-semibold text-[var(--muted)]">COMPLIANCE ONBOARDING</p>
        <h1 className="text-2xl font-bold">Question {currentQ + 1} of {QUESTIONS.length}</h1>
        <div className="mt-4 h-1 w-full rounded-full bg-[var(--fg)]/10">
          <div
            className="h-full rounded-full bg-[var(--primary)]"
            style={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">{q.question}</h2>
        <div className="space-y-2">
          {q.options.map((option, idx) => (
            <button
              key={idx}
              type="button"
              className={`tap w-full rounded-lg border-2 p-3 text-left transition ${
                answers[currentQ] === idx
                  ? "border-[var(--primary)] bg-[var(--primary)]/10"
                  : "border-[var(--fg)]/30 hover:border-[var(--fg)]/60"
              }`}
              onClick={() => handleAnswer(idx)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={!answered}
        className="tap rounded-lg border-2 border-[var(--fg)] bg-[var(--fg)] py-3 font-bold text-[var(--bg)] disabled:opacity-50"
        onClick={handleNext}
      >
        {currentQ === QUESTIONS.length - 1 ? "Submit" : "Next"}
      </button>
    </main>
  );
}
