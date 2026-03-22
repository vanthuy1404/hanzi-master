"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getMe } from "@/lib/auth-api";
import { getAuthToken, getStoredUser, saveUser } from "@/lib/auth-storage";
import {
  createExperiencePoint,
  getRandomVocabulariesByTopic,
  getTopics,
  type Topic,
  type Vocabulary,
} from "@/lib/topic-api";

type MatchWord = {
  key: string;
  hanzi: string;
  pinyin: string;
  nghia_vi: string;
};

const WORD_COUNT_OPTIONS = [10, 20, 30];
const PAGE_SIZE = 5;
const EMPTY_WORDS: MatchWord[] = [];

function shuffleArray<T>(arr: T[]) {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function chunkArray<T>(arr: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

export default function GhepTuLamBaiPage() {
  const [userId, setUserId] = useState<number | undefined>();
  const userIdRef = useRef<number | undefined>(undefined);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [wordCount, setWordCount] = useState<number>(10);
  const [words, setWords] = useState<MatchWord[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedLeftKey, setSelectedLeftKey] = useState<string | null>(null);
  const [selectedRightKey, setSelectedRightKey] = useState<string | null>(null);
  const [wrongLeftKey, setWrongLeftKey] = useState<string | null>(null);
  const [wrongRightKey, setWrongRightKey] = useState<string | null>(null);
  const [matchedKeys, setMatchedKeys] = useState<Set<string>>(new Set());
  const [leftOrder, setLeftOrder] = useState<string[]>([]);
  const [rightOrder, setRightOrder] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const localUser = getStoredUser();
    const token = getAuthToken();
    const resolvedUserIdPromise = localUser?.id
      ? Promise.resolve(localUser.id)
      : token
        ? getMe(token).then((me) => {
            saveUser(me.user);
            return me.user.id;
          })
        : Promise.resolve(undefined);

    resolvedUserIdPromise
      .then((resolvedUserId) => {
        setUserId(resolvedUserId);
        return getTopics(resolvedUserId);
      })
      .then((topicList) => {
        setTopics(topicList);
        if (topicList.length) {
          setSelectedTopicId(topicList[0].id);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không thể tải dữ liệu"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const pages = useMemo(() => chunkArray(words, PAGE_SIZE), [words]);
  const currentPageWords = useMemo(
    () => pages[currentPageIndex] ?? EMPTY_WORDS,
    [pages, currentPageIndex],
  );
  const currentPageKeys = useMemo(() => new Set(currentPageWords.map((item) => item.key)), [currentPageWords]);
  const wordMap = useMemo(() => {
    const map = new Map<string, MatchWord>();
    words.forEach((item) => map.set(item.key, item));
    return map;
  }, [words]);

  useEffect(() => {
    const pageWords = pages[currentPageIndex] ?? EMPTY_WORDS;
    const keys = pageWords.map((item) => item.key);
    setLeftOrder(shuffleArray(keys));
    setRightOrder(shuffleArray(keys));
    setSelectedLeftKey(null);
    setSelectedRightKey(null);
    setWrongLeftKey(null);
    setWrongRightKey(null);
    setMatchedKeys(new Set());
  }, [currentPageIndex, pages]);

  useEffect(() => {
    if (!currentPageWords.length || !matchedKeys.size) return;
    if (matchedKeys.size !== currentPageWords.length) return;

    const timer = setTimeout(() => {
      if (currentPageIndex < pages.length - 1) {
        setCurrentPageIndex((prev) => prev + 1);
      } else {
        setIsDone(true);
        const currentUserId = userIdRef.current;
        if (currentUserId) {
          createExperiencePoint({ user_id: currentUserId, exp: 5 })
            .then(() => setMessage("Bạn đã hoàn thành bài tập. Đã cộng +5 điểm kinh nghiệm."))
            .catch(() => setMessage("Bạn đã hoàn thành bài tập."));
        } else {
          setMessage("Bạn đã hoàn thành bài tập.");
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [matchedKeys, currentPageWords.length, currentPageIndex, pages.length]);

  function resetSession() {
    setWords([]);
    setCurrentPageIndex(0);
    setSelectedLeftKey(null);
    setSelectedRightKey(null);
    setWrongLeftKey(null);
    setWrongRightKey(null);
    setMatchedKeys(new Set());
    setLeftOrder([]);
    setRightOrder([]);
      setIsDone(false);
  }

  async function onStart() {
    if (!selectedTopicId) {
      setError("Vui lòng chọn chủ đề.");
      return;
    }

    try {
      setStarting(true);
      setError("");
      setMessage("");
      resetSession();

      const response = await getRandomVocabulariesByTopic({
        chu_de_id: selectedTopicId,
        so_luong: wordCount,
        user_id: userId,
      });

      const normalized: MatchWord[] = response
        .map((item: Vocabulary, index) => ({
          key: `${item.id}-${index}`,
          hanzi: (item.hanzi ?? "").trim(),
          pinyin: (item.pinyin ?? item.pinyin_plain ?? "").trim(),
          nghia_vi: (item.nghia_vi ?? "").trim(),
        }))
        .filter((item) => item.hanzi.length > 0 && item.nghia_vi.length > 0);

      if (!normalized.length) {
        setMessage("Chủ đề này chưa có đủ từ vựng hợp lệ để ghép.");
        return;
      }

      setWords(normalized);
      setCurrentPageIndex(0);
      setMessage(`Đã tải ${normalized.length} từ. Mỗi trang 5 từ, tự động chuyển trang khi ghép xong.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể bắt đầu bài tập");
    } finally {
      setStarting(false);
    }
  }

  function resolveSelection(nextLeft: string | null, nextRight: string | null) {
    if (!nextLeft || !nextRight) return;

    if (nextLeft === nextRight) {
      setMatchedKeys((prev) => new Set(prev).add(nextLeft));
      setSelectedLeftKey(null);
      setSelectedRightKey(null);
      return;
    }

    setWrongLeftKey(nextLeft);
    setWrongRightKey(nextRight);
    setSelectedLeftKey(null);
    setSelectedRightKey(null);
    setTimeout(() => {
      setWrongLeftKey(null);
      setWrongRightKey(null);
    }, 500);
  }

  function onPickLeft(key: string) {
    if (matchedKeys.has(key)) return;
    const next = selectedLeftKey === key ? null : key;
    setSelectedLeftKey(next);
    resolveSelection(next, selectedRightKey);
  }

  function onPickRight(key: string) {
    if (matchedKeys.has(key)) return;
    const next = selectedRightKey === key ? null : key;
    setSelectedRightKey(next);
    resolveSelection(selectedLeftKey, next);
  }

  if (loading) {
    return <main className="mx-auto w-full max-w-[1200px] px-6 py-8 md:px-10">Đang tải...</main>;
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-6 py-8 md:px-10">
      <section>
        <h1 className="text-3xl font-black tracking-tight">Bài Tập Ghép Từ</h1>
        <p className="mt-1 text-muted">Chọn chủ đề, chọn số từ và bắt đầu. Ghép đúng sẽ ẩn cặp từ.</p>
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      )}

      <section className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-sm font-semibold">Chủ đề</span>
            <select
              value={selectedTopicId ?? ""}
              onChange={(event) => setSelectedTopicId(Number(event.target.value) || null)}
              className="h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Chọn chủ đề</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.ten_chu_de ?? `Chủ đề #${topic.id}`}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold">Số từ luyện tập</span>
            <select
              value={wordCount}
              onChange={(event) => setWordCount(Number(event.target.value))}
              className="h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
            >
              {WORD_COUNT_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count} từ
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={onStart}
              disabled={starting}
              className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-bold text-slate-900 disabled:opacity-60"
            >
              {starting ? "Đang tải..." : "Bắt đầu"}
            </button>
          </div>
        </div>
      </section>

      {!!words.length && (
        <section className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              Trang {Math.min(currentPageIndex + 1, pages.length)}/{pages.length}
            </span>
            <span>
              Đã ghép đúng {currentPageWords.length ? matchedKeys.size : 0}/{currentPageWords.length} cặp
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              {leftOrder
                .filter((key) => currentPageKeys.has(key) && !matchedKeys.has(key))
                .map((key) => {
                  const item = wordMap.get(key);
                  if (!item) return null;
                  const isSelected = selectedLeftKey === key;
                  const isWrong = wrongLeftKey === key;
                  return (
                    <button
                      key={`left-${key}`}
                      type="button"
                      onClick={() => onPickLeft(key)}
                      className={`h-20 w-full rounded-lg border px-4 py-3 text-left transition ${
                        isWrong
                          ? "border-red-500 bg-red-50"
                          : isSelected
                            ? "border-primary bg-primary/10"
                            : "border-primary/20 bg-background hover:bg-primary/5"
                      }`}
                      style={isWrong ? { animation: "match-shake 0.5s ease" } : undefined}
                    >
                      <p className="text-lg font-bold">{item.hanzi}</p>
                      <p className="text-xs text-muted">{item.pinyin || "-"}</p>
                    </button>
                  );
                })}
            </div>

            <div className="space-y-2">
              {rightOrder
                .filter((key) => currentPageKeys.has(key) && !matchedKeys.has(key))
                .map((key) => {
                  const item = wordMap.get(key);
                  if (!item) return null;
                  const isSelected = selectedRightKey === key;
                  const isWrong = wrongRightKey === key;
                  return (
                    <button
                      key={`right-${key}`}
                      type="button"
                      onClick={() => onPickRight(key)}
                      className={`h-20 w-full rounded-lg border px-4 py-3 text-left transition ${
                        isWrong
                          ? "border-red-500 bg-red-50"
                          : isSelected
                            ? "border-primary bg-primary/10"
                            : "border-primary/20 bg-background hover:bg-primary/5"
                      }`}
                      style={isWrong ? { animation: "match-shake 0.5s ease" } : undefined}
                    >
                      <p className="font-semibold">{item.nghia_vi}</p>
                    </button>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      <style jsx>{`
        @keyframes match-shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-3px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </main>
  );
}
