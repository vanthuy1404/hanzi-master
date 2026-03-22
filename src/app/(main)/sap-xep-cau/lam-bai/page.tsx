"use client";

import { useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/auth-api";
import { getAuthToken, getStoredUser, saveUser } from "@/lib/auth-storage";
import {
  getTopics,
  getSentenceOrderingPractices,
  submitSentenceOrderingPractice,
  type SentenceOrderingPractice,
  type SentenceOrderingSubmitResult,
  type Topic,
} from "@/lib/topic-api";

export default function LamBaiSapXepCauPage() {
  const [userId, setUserId] = useState<number | undefined>();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [practices, setPractices] = useState<SentenceOrderingPractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [topicFilter, setTopicFilter] = useState<number | "tat_ca">("tat_ca");
  const [selectedPracticeId, setSelectedPracticeId] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTokenIndexesByQuestion, setSelectedTokenIndexesByQuestion] = useState<number[][]>([]);
  const [result, setResult] = useState<SentenceOrderingSubmitResult | null>(null);

  useEffect(() => {
    const localUser = getStoredUser();
    if (localUser?.id) {
      setUserId(localUser.id);
      loadData(localUser.id);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      loadData(undefined);
      return;
    }

    getMe(token)
      .then((response) => {
        saveUser(response.user);
        setUserId(response.user.id);
        return loadData(response.user.id);
      })
      .catch(() => loadData(undefined));
  }, []);

  async function loadData(currentUserId?: number) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const [topicList, practiceList] = await Promise.all([
        getTopics(currentUserId),
        getSentenceOrderingPractices(currentUserId),
      ]);
      setTopics(topicList);
      setPractices(practiceList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  const filteredPractices = useMemo(() => {
    if (topicFilter === "tat_ca") return practices;
    return practices.filter((item) => item.topic_ids.includes(topicFilter));
  }, [practices, topicFilter]);

  const currentPractice = useMemo(
    () => filteredPractices.find((item) => item.id === selectedPracticeId) ?? null,
    [filteredPractices, selectedPracticeId],
  );
  const currentQuestion = currentPractice?.noi_dung[currentIndex] ?? null;

  function choosePractice(id: number) {
    const selected = filteredPractices.find((item) => item.id === id) ?? null;
    setSelectedPracticeId(selected?.id ?? null);
    setCurrentIndex(0);
    setResult(null);
    setError("");
    setMessage("");
    if (selected) {
      setSelectedTokenIndexesByQuestion(new Array(selected.noi_dung.length).fill(null).map(() => []));
    } else {
      setSelectedTokenIndexesByQuestion([]);
    }
  }

  function addToken(tokenIndex: number) {
    if (!currentQuestion || !currentPractice || !!result) return;
    setSelectedTokenIndexesByQuestion((prev) => {
      const next = [...prev];
      const row = [...(next[currentIndex] ?? [])];
      if (row.includes(tokenIndex)) return prev;
      row.push(tokenIndex);
      next[currentIndex] = row;
      return next;
    });
  }

  function removePickedToken(position: number) {
    if (!!result) return;
    setSelectedTokenIndexesByQuestion((prev) => {
      const next = [...prev];
      const row = [...(next[currentIndex] ?? [])];
      row.splice(position, 1);
      next[currentIndex] = row;
      return next;
    });
  }

  function clearCurrentAnswer() {
    if (!!result) return;
    setSelectedTokenIndexesByQuestion((prev) => {
      const next = [...prev];
      next[currentIndex] = [];
      return next;
    });
  }

  const currentPickedIndexes = selectedTokenIndexesByQuestion[currentIndex] ?? [];
  const currentPickedTokens = currentQuestion
    ? currentPickedIndexes.map((tokenIndex) => currentQuestion.question[tokenIndex]).filter(Boolean)
    : [];

  async function onSubmit() {
    if (!userId) {
      setError("Bạn cần đăng nhập để nộp bài.");
      return;
    }
    if (!currentPractice) {
      setError("Vui lòng chọn bài tập.");
      return;
    }

    const answers = currentPractice.noi_dung.map((item, qIndex) =>
      (selectedTokenIndexesByQuestion[qIndex] ?? [])
        .map((tokenIndex) => item.question[tokenIndex])
        .filter((part) => typeof part === "string" && part.length > 0),
    );

    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      const submitResult = await submitSentenceOrderingPractice(currentPractice.id, {
        user_id: userId,
        answers,
      });
      setResult(submitResult);
      setMessage(`Đã hoàn thành bài tập. Điểm: ${submitResult.diem}. +${submitResult.exp_cong_them} EXP`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể nộp bài");
    } finally {
      setSubmitting(false);
    }
  }

  function onLamLaiBai() {
    if (!currentPractice) return;
    setCurrentIndex(0);
    setSelectedTokenIndexesByQuestion(new Array(currentPractice.noi_dung.length).fill(null).map(() => []));
    setResult(null);
    setError("");
    setMessage("Đã làm lại bài. Bạn có thể bắt đầu lại từ câu 1.");
  }

  if (loading) {
    return <main className="mx-auto w-full max-w-[1200px] px-6 py-8 md:px-10">Đang tải...</main>;
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-6 py-8 md:px-10">
      <section>
        <h1 className="text-3xl font-black tracking-tight">Làm Bài Sắp Xếp Câu</h1>
        <p className="mt-1 text-muted">Chọn bài, sắp xếp các cụm theo đúng thứ tự rồi nộp bài để chấm điểm.</p>
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      )}

      <section className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold">Lọc theo chủ đề</span>
            <select
              value={topicFilter}
              onChange={(event) =>
                setTopicFilter(event.target.value === "tat_ca" ? "tat_ca" : Number(event.target.value))
              }
              className="h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="tat_ca">Tất cả chủ đề</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.ten_chu_de ?? `Chủ đề #${topic.id}`}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold">Chọn bài tập</span>
            <select
              value={selectedPracticeId ?? ""}
              onChange={(event) => choosePractice(Number(event.target.value))}
              className="h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Chọn 1 bài</option>
              {filteredPractices.map((practice) => (
                <option key={practice.id} value={practice.id}>
                  Bài #{practice.id} - {practice.so_cau} câu
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {currentPractice && currentQuestion && (
        <section className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-primary">
              Câu {currentIndex + 1}/{currentPractice.noi_dung.length}
            </p>
            <p className="text-xs text-muted">Nghĩa: {currentQuestion.nghia_vi}</p>
          </div>

          <div className="mb-3 rounded-xl border border-primary/10 bg-background p-4">
            <p className="mb-2 text-sm font-semibold">Các cụm cần sắp xếp</p>
            <div className="flex flex-wrap gap-2">
              {currentQuestion.question.map((token, tokenIndex) => {
                const used = currentPickedIndexes.includes(tokenIndex);
                return (
                  <button
                    key={`token-${tokenIndex}`}
                    type="button"
                    disabled={used || !!result}
                    onClick={() => addToken(tokenIndex)}
                    className="rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm disabled:opacity-40"
                  >
                    {token}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-primary/10 bg-background p-4">
            <p className="mb-2 text-sm font-semibold">Thứ tự bạn chọn</p>
            {!currentPickedTokens.length ? (
              <p className="text-sm text-muted">Chưa chọn cụm nào.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {currentPickedTokens.map((token, position) => (
                  <button
                    key={`picked-${position}`}
                    type="button"
                    onClick={() => removePickedToken(position)}
                    disabled={!!result}
                    className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary disabled:opacity-50"
                  >
                    {position + 1}. {token}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentIndex === 0 || !!result}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Câu trước
              </button>
              <button
                type="button"
                disabled={currentIndex === currentPractice.noi_dung.length - 1 || !!result}
                onClick={() => setCurrentIndex((prev) => Math.min(currentPractice.noi_dung.length - 1, prev + 1))}
                className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Câu sau
              </button>
              <button
                type="button"
                onClick={clearCurrentAnswer}
                disabled={!!result}
                className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Xóa đáp án câu này
              </button>
            </div>

            {result ? (
              <button
                type="button"
                onClick={onLamLaiBai}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-slate-900"
              >
                Làm lại bài
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-slate-900 disabled:opacity-60"
              >
                {submitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            )}
          </div>
        </section>
      )}

      {result && (
        <section className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-bold">Kết quả</h2>
          <p className="mb-4 text-sm text-muted">
            Đúng {result.so_cau_dung}/{result.tong_so_cau} câu - Điểm: <span className="font-bold text-primary">{result.diem}</span>
          </p>
          <div className="space-y-2">
            {result.details.map((item) => (
              <article
                key={item.index}
                className={`rounded-lg border px-3 py-2 ${
                  item.is_correct ? "border-emerald-200 bg-emerald-50/80" : "border-rose-200 bg-rose-50/80"
                }`}
              >
                <p className="text-sm font-semibold">Câu {item.index}</p>
                <p className="text-sm text-muted">Nghĩa: {item.nghia_vi}</p>
                <p className="text-sm">Bạn sắp xếp: {item.user_answer.join(" | ") || "(trống)"}</p>
                <p className="text-sm">Đáp án đúng: {item.system_answer.join(" | ")}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
