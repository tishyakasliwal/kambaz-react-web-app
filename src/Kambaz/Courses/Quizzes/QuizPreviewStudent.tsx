// src/Kambaz/Courses/Quizzes/QuizPreviewStudent.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  findQuizById,
  findQuestionsForQuiz,
  submitQuizAttempt,
} from "./client";
import { Button, Form, Spinner } from "react-bootstrap";

export default function QuizPreviewStudent() {
  const { cid, quizId } = useParams<{ cid: string; quizId: string }>();
  const navigate = useNavigate();
  const studentId = useSelector((s: any) => s.accountReducer.currentUser._id);

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // load quiz + questions
  useEffect(() => {
    (async () => {
      if (!quizId) return;
      try {
        const q = await findQuizById(quizId);
        setQuiz(q);
        const { mcqQuestions, fillInQuestions, tfQuestions } =
          await findQuestionsForQuiz(quizId);
        setQuestions([
          ...mcqQuestions.map((q: any) => ({ ...q, type: "MCQ" as const })),
          ...fillInQuestions.map((q: any) => ({
            ...q,
            type: "FILL_IN_THE_BLANK" as const,
          })),
          ...tfQuestions.map((q: any) => ({
            ...q,
            type: "TRUE_FALSE" as const,
          })),
        ]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

  const handleAnswer = (key: string, val: any) => {
    setAnswers((a) => ({ ...a, [key]: val }));
  };

  const handleSubmit = async () => {
    if (!quizId) return;
    setSubmitting(true);

    // build payload
    const payloadAnswers = questions.map((q) => {
      const key = `${q.type}-${q._id}`;
      const sel = answers[key];
      let correct = false;
      if (q.type === "MCQ") {
        const c = q.choices.find((c: any) => c.isCorrect);
        correct = c?.text === sel;
      } else if (q.type === "TRUE_FALSE") {
        correct = q.correctAnswer === (sel === "True" || sel === true);
      } else {
        correct = q.correctChoices
          .map((c: string) => c.toLowerCase())
          .includes(String(sel).toLowerCase());
      }
      return { question: q._id, selectedAnswer: sel, correct, points: q.points };
    });

    const score = payloadAnswers
    .filter((a) => a.correct)
    .reduce((total, a) => total + a.points, 0);

    try {
      await submitQuizAttempt(quizId, {
        student: studentId,
        answers: payloadAnswers,
        score,
      });
      // go back to the student detail page, so it re‑fetches attempts
      navigate(`/Kambaz/Courses/${cid}/Quizzes/${quizId}/start`);
    } catch (err) {
      console.error("Failed to save attempt", err);
      alert("Could not save your attempt.  Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" />
      </div>
    );
  }

  const q = questions[currentIdx];
  const key = `${q.type}-${q._id}`;

  return (
    <div className="m-4">
      <h2>{quiz?.title}</h2>
      <h4 className="mt-3">{q.question}</h4>
      <p>Points: {q.points}</p>

      {q.type === "MCQ" && (
        <div>
          {q.choices.map((c: any) => (
            <Form.Check
              key={c.text}
              type="radio"
              name={key}
              label={c.text}
              value={c.text}
              checked={answers[key] === c.text}
              onChange={() => handleAnswer(key, c.text)}
            />
          ))}
        </div>
      )}

      {q.type === "TRUE_FALSE" && (
        <>
          <Form.Check
            type="radio"
            name={key}
            label="True"
            checked={answers[key] === "True"}
            onChange={() => handleAnswer(key, "True")}
          />
          <Form.Check
            type="radio"
            name={key}
            label="False"
            checked={answers[key] === "False"}
            onChange={() => handleAnswer(key, "False")}
          />
        </>
      )}

      {q.type === "FILL_IN_THE_BLANK" && (
        <Form.Control
          type="text"
          value={answers[key] || ""}
          onChange={(e) => handleAnswer(key, e.target.value)}
        />
      )}

      <div className="d-flex justify-content-between mt-3">
        <Button
          variant="secondary"
          onClick={() => setCurrentIdx((i) => Math.max(i - 1, 0))}
          disabled={currentIdx === 0}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            setCurrentIdx((i) => Math.min(i + 1, questions.length - 1))
          }
          disabled={currentIdx === questions.length - 1}
        >
          Next
        </Button>
      </div>

      {currentIdx === questions.length - 1 && (
        <Button
          variant="primary"
          className="mt-3"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "Submit"}
        </Button>
      )}
    </div>
  );
}