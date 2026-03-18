"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/auth-api";
import { getAuthToken, getStoredUser, saveUser } from "@/lib/auth-storage";
import {
  deleteTranslationPractice,
  generateTranslationPractice,
  getTopics,
  getTranslationPractices,
  saveTranslationPractice,
  updateTranslationPractice,
  type GeneratedTranslationPractice,
  type Topic,
  type TranslationPractice,
  type TranslationPracticeItem,
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

function parseItemsFromTextarea(value: string): TranslationPracticeItem[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [question, answer] = line.split("|").map((part) => part.trim());
      return {
        question: question ?? "",
        answer: answer ?? "",
      };
    })
    .filter((item) => item.question.length > 0 && item.answer.length > 0);
}

function itemsToTextarea(items: TranslationPracticeItem[]) {
  return items.map((item) => `${item.question} | ${item.answer}`).join("\n");
}

export default function LuyenTapDichPage() {
  const [userId, setUserId] = useState<number | undefined>();
  const [danhSachChuDe, setDanhSachChuDe] = useState<Topic[]>([]);
  const [danhSachBaiTap, setDanhSachBaiTap] = useState<TranslationPractice[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangGenerate, setDangGenerate] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");
  const [thongBao, setThongBao] = useState("");

  const [topicIdsDaChon, setTopicIdsDaChon] = useState<number[]>([]);
  const [soCau, setSoCau] = useState(10);
  const [level, setLevel] = useState<Level>("trung_binh");
  const [taoBaiChung, setTaoBaiChung] = useState(false);
  const [preview, setPreview] = useState<GeneratedTranslationPractice | null>(null);

  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [hienModalThem, setHienModalThem] = useState(false);
  const [hienModalSua, setHienModalSua] = useState(false);
  const [dangXuLyCrud, setDangXuLyCrud] = useState(false);

  const [themTopicIds, setThemTopicIds] = useState<number[]>([]);
  const [themSoCau, setThemSoCau] = useState(5);
  const [themLevel, setThemLevel] = useState<Level>("trung_binh");
  const [themBaiChung, setThemBaiChung] = useState(false);
  const [themItemsText, setThemItemsText] = useState("");

  const [suaPracticeId, setSuaPracticeId] = useState<number | null>(null);
  const [suaTopicIds, setSuaTopicIds] = useState<number[]>([]);
  const [suaSoCau, setSuaSoCau] = useState(5);
  const [suaLevel, setSuaLevel] = useState<Level>("trung_binh");
  const [suaItemsText, setSuaItemsText] = useState("");
  const [suaUserId, setSuaUserId] = useState<number | null>(null);

  async function taiDuLieu(currentUserId?: number) {
    setDangTai(true);
    setLoi("");
    setThongBao("");
    try {
      const [topicsResult, practicesResult] = await Promise.allSettled([
        getTopics(currentUserId),
        getTranslationPractices(currentUserId),
      ]);

      if (topicsResult.status === "fulfilled") {
        setDanhSachChuDe(topicsResult.value);
        setTopicIdsDaChon((prev) =>
          prev.filter((id) => topicsResult.value.some((topic) => topic.id === id)),
        );
      } else {
        setDanhSachChuDe([]);
        setLoi(topicsResult.reason instanceof Error ? topicsResult.reason.message : "Không thể tải chủ đề");
      }

      if (practicesResult.status === "fulfilled") {
        setDanhSachBaiTap(practicesResult.value);
      } else {
        setDanhSachBaiTap([]);
        setThongBao("Chưa tải được danh sách bài đã lưu. Bạn vẫn có thể tạo bài mới.");
      }
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Không thể tải dữ liệu");
    } finally {
      setDangTai(false);
    }
  }

  useEffect(() => {
    const localUser = getStoredUser();
    if (localUser?.id) {
      setUserId(localUser.id);
      taiDuLieu(localUser.id);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      taiDuLieu(undefined);
      return;
    }

    getMe(token)
      .then((response) => {
        saveUser(response.user);
        setUserId(response.user.id);
        return taiDuLieu(response.user.id);
      })
      .catch(() => taiDuLieu(undefined));
  }, []);

  const thongTinChuDe = useMemo(() => {
    const map = new Map<number, string>();
    for (const topic of danhSachChuDe) {
      map.set(topic.id, topic.ten_chu_de ?? `Chủ đề #${topic.id}`);
    }
    return map;
  }, [danhSachChuDe]);

  function toggleTopic(topicId: number) {
    setTopicIdsDaChon((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId],
    );
  }

  function toggleExpanded(practiceId: number) {
    setExpandedIds((prev) =>
      prev.includes(practiceId) ? prev.filter((id) => id !== practiceId) : [...prev, practiceId],
    );
  }

  function toggleThemTopic(topicId: number) {
    setThemTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId],
    );
  }

  function toggleSuaTopic(topicId: number) {
    setSuaTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId],
    );
  }

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoi("");
    setThongBao("");

    if (!topicIdsDaChon.length) {
      setLoi("Vui lòng chọn ít nhất 1 chủ đề");
      return;
    }

    if (!taoBaiChung && !userId) {
      setLoi("Bạn cần đăng nhập để tạo bài tập cá nhân");
      return;
    }

    try {
      setDangGenerate(true);
      const ketQua = await generateTranslationPractice({
        topic_ids: topicIdsDaChon,
        so_cau: soCau,
        level,
        user_id: taoBaiChung ? null : userId,
      });
      setPreview(ketQua);
      setThongBao("Đã generate bài tập, vui lòng kiểm tra và bấm Lưu");
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Không thể generate bài tập");
    } finally {
      setDangGenerate(false);
    }
  }

  async function onSavePreview() {
    if (!preview) return;

    setLoi("");
    setThongBao("");
    try {
      setDangLuu(true);
      const ketQua = await saveTranslationPractice({
        topic_ids: preview.topic_ids,
        so_cau: preview.so_cau,
        level: preview.level,
        user_id: preview.user_id,
        items: preview.items,
      });
      setDanhSachBaiTap((prev) => [ketQua, ...prev]);
      setPreview(null);
      setThongBao("Đã lưu toàn bộ bài tập thành công");
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Không thể lưu bài tập");
    } finally {
      setDangLuu(false);
    }
  }

  async function onThemThuCong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoi("");
    setThongBao("");

    const items = parseItemsFromTextarea(themItemsText);
    if (!themTopicIds.length) {
      setLoi("Bạn cần chọn ít nhất 1 chủ đề cho bài thêm mới");
      return;
    }
    if (!items.length) {
      setLoi("Dữ liệu câu hỏi không hợp lệ. Mỗi dòng cần theo mẫu: question | answer");
      return;
    }

    try {
      setDangXuLyCrud(true);
      const ketQua = await saveTranslationPractice({
        topic_ids: themTopicIds,
        so_cau: themSoCau,
        level: themLevel,
        user_id: themBaiChung ? null : userId,
        items,
      });
      setDanhSachBaiTap((prev) => [ketQua, ...prev]);
      setHienModalThem(false);
      setThemTopicIds([]);
      setThemSoCau(5);
      setThemLevel("trung_binh");
      setThemBaiChung(false);
      setThemItemsText("");
      setThongBao("Đã thêm bài luyện tập mới");
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Không thể thêm bài tập");
    } finally {
      setDangXuLyCrud(false);
    }
  }

  function moModalSua(baiTap: TranslationPractice) {
    setSuaPracticeId(baiTap.id);
    setSuaTopicIds([...baiTap.topic_ids]);
    setSuaSoCau(baiTap.so_cau);
    setSuaLevel(baiTap.level);
    setSuaItemsText(itemsToTextarea(baiTap.items));
    setSuaUserId(baiTap.user_id);
    setHienModalSua(true);
  }

  async function onSuaBaiTap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!suaPracticeId) return;

    const items = parseItemsFromTextarea(suaItemsText);
    if (!suaTopicIds.length) {
      setLoi("Bạn cần chọn ít nhất 1 chủ đề");
      return;
    }
    if (!items.length) {
      setLoi("Nội dung bài tập không hợp lệ");
      return;
    }

    setLoi("");
    setThongBao("");
    try {
      setDangXuLyCrud(true);
      const ketQua = await updateTranslationPractice(suaPracticeId, {
        topic_ids: suaTopicIds,
        so_cau: suaSoCau,
        level: suaLevel,
        items,
        user_id: suaUserId,
      });
      setDanhSachBaiTap((prev) => prev.map((item) => (item.id === suaPracticeId ? ketQua : item)));
      setHienModalSua(false);
      setSuaPracticeId(null);
      setThongBao("Đã cập nhật bài luyện tập");
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Không thể cập nhật bài tập");
    } finally {
      setDangXuLyCrud(false);
    }
  }

  async function onXoaBaiTap(baiTap: TranslationPractice) {
    const xacNhan = window.confirm(`Bạn có chắc muốn xóa bài #${baiTap.id}?`);
    if (!xacNhan) return;

    setLoi("");
    setThongBao("");
    try {
      setDangXuLyCrud(true);
      await deleteTranslationPractice(baiTap.id, baiTap.user_id);
      setDanhSachBaiTap((prev) => prev.filter((item) => item.id !== baiTap.id));
      setExpandedIds((prev) => prev.filter((id) => id !== baiTap.id));
      setThongBao("Đã xóa bài luyện tập");
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Không thể xóa bài tập");
    } finally {
      setDangXuLyCrud(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-8 px-6 py-8 md:px-10">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight">Luyện Tập Dịch</h1>
        <p className="text-muted">
          Chọn chủ đề, chọn mức độ, generate bài Việt - pinyin plain, xem preview rồi lưu.
        </p>
      </section>

      {loi && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {loi}
        </div>
      )}
      {thongBao && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {thongBao}
        </div>
      )}

      <section className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold">Tạo bài luyện tập</h2>
        {!danhSachChuDe.length && !dangTai && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Chưa có chủ đề nào khả dụng. Hãy tạo chủ đề ở trang Chủ đề hoặc kiểm tra quyền truy cập.
          </div>
        )}

        <form onSubmit={onGenerate} className="space-y-4">
          <div className="rounded-xl border border-primary/10 bg-background p-3">
            <p className="mb-2 text-sm font-semibold">Chủ đề đã chọn: {topicIdsDaChon.length}</p>
            <div className="flex flex-wrap gap-2">
              {topicIdsDaChon.length ? (
                topicIdsDaChon.map((topicId) => (
                  <span
                    key={topicId}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    {thongTinChuDe.get(topicId) ?? `#${topicId}`}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted">Bạn chưa chọn chủ đề nào.</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {danhSachChuDe.map((chuDe) => (
              <label
                key={chuDe.id}
                className="flex items-start gap-3 rounded-xl border border-primary/10 bg-background px-3 py-3"
              >
                <input
                  type="checkbox"
                  checked={topicIdsDaChon.includes(chuDe.id)}
                  onChange={() => toggleTopic(chuDe.id)}
                  className="mt-1"
                />
                <span>
                  <strong className="block text-sm">{chuDe.ten_chu_de ?? `Chủ đề #${chuDe.id}`}</strong>
                  <span className="text-xs text-muted">
                    {chuDe.user_id === null ? "Chủ đề hệ thống" : "Chủ đề cá nhân"}
                  </span>
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
              <input
                type="checkbox"
                checked={taoBaiChung}
                onChange={(event) => setTaoBaiChung(event.target.checked)}
              />
              <span className="text-sm">Tạo bài chung (user_id = null)</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={dangGenerate || dangTai}
            className="flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-slate-900 shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            {dangGenerate ? "Đang generate..." : "Tạo bài luyện tập"}
          </button>
        </form>
      </section>

      {preview && (
        <section className="overflow-hidden rounded-2xl border border-primary/10 bg-surface shadow-sm">
          <div className="flex flex-col gap-3 border-b border-primary/10 bg-background p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Preview bài vừa generate</h2>
              <p className="text-sm text-muted">
                {preview.items.length} câu | {getLevelLabel(preview.level)} |{" "}
                {preview.user_id === null ? "Bài chung" : "Bài cá nhân"}
              </p>
            </div>
            <button
              type="button"
              onClick={onSavePreview}
              disabled={dangLuu}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {dangLuu ? "Đang lưu..." : "Lưu toàn bộ bài tập"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-primary/5 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Question (VI)</th>
                  <th className="px-6 py-4">Answer (pinyin plain)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {preview.items.map((item, index) => (
                  <tr key={`${item.question}-${index}`} className="hover:bg-primary/5">
                    <td className="px-6 py-4 text-sm font-bold">{index + 1}</td>
                    <td className="px-6 py-4">{item.question}</td>
                    <td className="px-6 py-4 text-muted">{item.answer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Danh sách bài luyện tập đã lưu</h2>
          <button
            type="button"
            onClick={() => setHienModalThem(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900"
          >
            Thêm bài thủ công
          </button>
        </div>

        {dangTai ? (
          <p className="text-sm text-muted">Đang tải danh sách bài tập...</p>
        ) : !danhSachBaiTap.length ? (
          <p className="text-sm text-muted">Chưa có bài luyện tập nào.</p>
        ) : (
          <div className="space-y-3">
            {danhSachBaiTap.map((baiTap) => {
              const isExpanded = expandedIds.includes(baiTap.id);
              return (
                <article key={baiTap.id} className="rounded-xl border border-primary/10 bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <strong>Bài #{baiTap.id}</strong>
                      <span className="rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                        {baiTap.user_id === null ? "Chung" : "Cá nhân"}
                      </span>
                      <span className="rounded bg-slate-200/70 px-2 py-1 text-xs font-semibold text-slate-700">
                        {getLevelLabel(baiTap.level)}
                      </span>
                      <span className="text-muted">{baiTap.so_cau} câu</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(baiTap.id)}
                        title={isExpanded ? "Thu gọn" : "Xổ xuống"}
                        aria-label={isExpanded ? "Thu gọn" : "Xổ xuống"}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 text-primary hover:bg-primary/5"
                      >
                        <span className="material-symbols-outlined text-base">
                          {isExpanded ? "expand_more" : "chevron_right"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moModalSua(baiTap)}
                        className="rounded-lg border border-primary/20 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/5"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => onXoaBaiTap(baiTap)}
                        disabled={dangXuLyCrud}
                        className="rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-muted">
                    Chủ đề:{" "}
                    {baiTap.topic_ids.map((topicId) => thongTinChuDe.get(topicId) ?? `#${topicId}`).join(", ")}
                  </p>

                  {isExpanded && (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-primary/10">
                      <table className="w-full min-w-[640px] text-left">
                        <thead className="bg-primary/5 text-xs uppercase tracking-wider text-muted">
                          <tr>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Question</th>
                            <th className="px-4 py-3">Answer</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/10">
                          {baiTap.items.map((item, index) => (
                            <tr key={`${baiTap.id}-${index}`} className="hover:bg-primary/5">
                              <td className="px-4 py-3 text-sm font-semibold">{index + 1}</td>
                              <td className="px-4 py-3">{item.question}</td>
                              <td className="px-4 py-3 text-muted">{item.answer}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {hienModalThem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={onThemThuCong}
            className="w-full max-w-3xl rounded-2xl border border-primary/10 bg-surface p-6 shadow-2xl"
          >
            <h3 className="mb-4 text-xl font-bold">Thêm bài luyện tập thủ công</h3>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {danhSachChuDe.map((chuDe) => (
                <label
                  key={`them-${chuDe.id}`}
                  className="flex items-start gap-2 rounded-lg border border-primary/10 bg-background px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={themTopicIds.includes(chuDe.id)}
                    onChange={() => toggleThemTopic(chuDe.id)}
                    className="mt-1"
                  />
                  <span>{chuDe.ten_chu_de ?? `Chủ đề #${chuDe.id}`}</span>
                </label>
              ))}
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-sm font-semibold">Số câu</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={themSoCau}
                  onChange={(event) => setThemSoCau(Number(event.target.value) || 1)}
                  className="h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-semibold">Mức độ</span>
                <select
                  value={themLevel}
                  onChange={(event) => setThemLevel(event.target.value as Level)}
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
                <input
                  type="checkbox"
                  checked={themBaiChung}
                  onChange={(event) => setThemBaiChung(event.target.checked)}
                />
                <span className="text-sm">Lưu thành bài chung (user_id = null)</span>
              </label>
            </div>

            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-semibold">
                Dữ liệu câu hỏi (mỗi dòng: question | answer)
              </span>
              <textarea
                rows={8}
                value={themItemsText}
                onChange={(event) => setThemItemsText(event.target.value)}
                className="w-full rounded-lg border border-primary/20 bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                placeholder={"Tôi đi học lúc 7 giờ | wo qi shangxue qi dian\nBạn đang làm gì? | ni zai zuo shenme"}
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setHienModalThem(false)}
                className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={dangXuLyCrud}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {dangXuLyCrud ? "Đang thêm..." : "Thêm bài"}
              </button>
            </div>
          </form>
        </div>
      )}

      {hienModalSua && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={onSuaBaiTap}
            className="w-full max-w-3xl rounded-2xl border border-primary/10 bg-surface p-6 shadow-2xl"
          >
            <h3 className="mb-4 text-xl font-bold">Sửa bài luyện tập #{suaPracticeId}</h3>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {danhSachChuDe.map((chuDe) => (
                <label
                  key={`sua-${chuDe.id}`}
                  className="flex items-start gap-2 rounded-lg border border-primary/10 bg-background px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={suaTopicIds.includes(chuDe.id)}
                    onChange={() => toggleSuaTopic(chuDe.id)}
                    className="mt-1"
                  />
                  <span>{chuDe.ten_chu_de ?? `Chủ đề #${chuDe.id}`}</span>
                </label>
              ))}
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-semibold">Số câu</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={suaSoCau}
                  onChange={(event) => setSuaSoCau(Number(event.target.value) || 1)}
                  className="h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-semibold">Mức độ</span>
                <select
                  value={suaLevel}
                  onChange={(event) => setSuaLevel(event.target.value as Level)}
                  className="h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {LEVEL_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-semibold">
                Dữ liệu câu hỏi (mỗi dòng: question | answer)
              </span>
              <textarea
                rows={8}
                value={suaItemsText}
                onChange={(event) => setSuaItemsText(event.target.value)}
                className="w-full rounded-lg border border-primary/20 bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setHienModalSua(false)}
                className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={dangXuLyCrud}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {dangXuLyCrud ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
