"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/auth-api";
import { getAuthToken, getStoredUser, saveUser } from "@/lib/auth-storage";
import {
  generateSentenceOrderingPractice,
  getSentenceOrderingPractices,
  getTopics,
  saveSentenceOrderingPractice,
  type GeneratedSentenceOrderingPractice,
  type SentenceOrderingPractice,
  type Topic,
} from "@/lib/topic-api";

type Level = "de" | "trung_binh" | "kho";

const LEVEL_OPTIONS: Array<{ value: Level; label: string }> = [
  { value: "de", label: "Dễ" },
  { value: "trung_binh", label: "Trung bình" },
  { value: "kho", label: "Khó" },
];

function getLevelLabel(level: Level) {
  return LEVEL_OPTIONS.find((item) => item.value === level)?.label ?? level;
}

export default function SapXepCauPage() {
  const [userId, setUserId] = useState<number | undefined>();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [savedList, setSavedList] = useState<SentenceOrderingPractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [soCau, setSoCau] = useState(10);
  const [level, setLevel] = useState<Level>("trung_binh");
  const [createShared, setCreateShared] = useState(false);
  const [preview, setPreview] = useState<GeneratedSentenceOrderingPractice | null>(null);

  async function loadData(currentUserId?: number) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const [topicList, practices] = await Promise.all([
        getTopics(currentUserId),
        getSentenceOrderingPractices(currentUserId),
      ]);
      setTopics(topicList);
      setSavedList(practices);
      setSelectedTopicIds((prev) => prev.filter((id) => topicList.some((topic) => topic.id === id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

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

  const topicNameMap = useMemo(() => {
    const map = new Map<number, string>();
    topics.forEach((item) => map.set(item.id, item.ten_chu_de ?? `Chủ đề #${item.id}`));
    return map;
  }, [topics]);

  function toggleTopic(topicId: number) {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId],
    );
  }

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedTopicIds.length) {
      setError("Vui lòng chọn ít nhất 1 chủ đề.");
      return;
    }
    if (!createShared && !userId) {
      setError("Bạn cần đăng nhập để tạo bài cá nhân.");
      return;
    }

    try {
      setGenerating(true);
      const result = await generateSentenceOrderingPractice({
        topic_ids: selectedTopicIds,
        so_cau: soCau,
        level,
        user_id: createShared ? null : userId,
      });
      setPreview(result);
      setMessage("Đã generate bài tập. Kiểm tra preview rồi bấm Lưu.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể generate bài tập.");
    } finally {
      setGenerating(false);
    }
  }

  async function onSavePreview() {
    if (!preview) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const saved = await saveSentenceOrderingPractice({
        topic_ids: preview.topic_ids,
        so_cau: preview.so_cau,
        items: preview.items,
        user_id: preview.user_id,
      });
      setSavedList((prev) => [saved, ...prev]);
      setPreview(null);
      setMessage("Đã lưu bài tập sắp xếp câu thành công.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu bài tập.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-8 px-6 py-8 md:px-10">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight">Sắp Xếp Câu</h1>
        <p className="text-muted">Tạo bài tập sắp xếp thứ tự câu theo chủ đề bằng AI, preview rồi lưu.</p>
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <section className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold">Tạo bài tập</h2>
        <form onSubmit={onGenerate} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic) => (
              <label key={topic.id} className="flex items-start gap-3 rounded-xl border border-primary/10 bg-background px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedTopicIds.includes(topic.id)}
                  onChange={() => toggleTopic(topic.id)}
                  className="mt-1"
                />
                <span>
                  <strong className="block text-sm">{topic.ten_chu_de ?? `Chủ đề #${topic.id}`}</strong>
                  <span className="text-xs text-muted">{topic.user_id === null ? "Chủ đề hệ thống" : "Chủ đề cá nhân"}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-sm font-semibold">Số câu</span>
              <input
                type="number"
                min={1}
                max={50}
                value={soCau}
                onChange={(event) => setSoCau(Number(event.target.value) || 1)}
                className="h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-semibold">Mức độ</span>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as Level)}
                className="h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
              >
                {LEVEL_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-primary/10 bg-background px-3">
              <input type="checkbox" checked={createShared} onChange={(event) => setCreateShared(event.target.checked)} />
              <span className="text-sm">Tạo bài chung (user_id = null)</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || generating}
            className="flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-slate-900 shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? "Đang generate..." : "Generate bài tập"}
          </button>
        </form>
      </section>

      {preview && (
        <section className="overflow-hidden rounded-2xl border border-primary/10 bg-surface shadow-sm">
          <div className="flex flex-col gap-3 border-b border-primary/10 bg-background p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Preview bài vừa generate</h2>
              <p className="text-sm text-muted">
                {preview.items.length} câu | {getLevelLabel(preview.level)} | {preview.user_id === null ? "Bài chung" : "Bài cá nhân"}
              </p>
            </div>
            <button
              type="button"
              onClick={onSavePreview}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu bài tập"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-primary/5 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Question (đã đảo)</th>
                  <th className="px-6 py-4">Answer (đúng)</th>
                  <th className="px-6 py-4">Nghĩa Việt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {preview.items.map((item, index) => (
                  <tr key={`preview-${index}`} className="hover:bg-primary/5">
                    <td className="px-6 py-4 text-sm font-bold">{index + 1}</td>
                    <td className="px-6 py-4 text-muted">{item.question.join(" | ")}</td>
                    <td className="px-6 py-4">{item.answer.join(" | ")}</td>
                    <td className="px-6 py-4 text-muted">{item.nghia_vi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold">Danh sách bài đã lưu</h2>
        {!savedList.length ? (
          <p className="text-sm text-muted">Chưa có bài sắp xếp câu nào.</p>
        ) : (
          <div className="space-y-3">
            {savedList.map((practice) => (
              <article key={practice.id} className="rounded-xl border border-primary/10 bg-background p-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <strong>Bài #{practice.id}</strong>
                  <span className="rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {practice.user_id === null ? "Chung" : "Cá nhân"}
                  </span>
                  <span className="text-muted">{practice.so_cau} câu</span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Chủ đề: {practice.topic_ids.map((topicId) => topicNameMap.get(topicId) ?? `#${topicId}`).join(", ")}
                </p>
                <div className="mt-3 text-xs text-muted">
                  {practice.noi_dung.slice(0, 2).map((item, idx) => (
                    <p key={`${practice.id}-${idx}`}>
                      - {item.question.join(" | ")} → {item.nghia_vi}
                    </p>
                  ))}
                  {practice.noi_dung.length > 2 && <p>... và {practice.noi_dung.length - 2} câu nữa</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
