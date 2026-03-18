"use client";

import { useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/auth-api";
import { getAuthToken, getStoredUser, saveUser } from "@/lib/auth-storage";
import {
  getTopics,
  getTranslationPractices,
  submitTranslationPractice,
  type Topic,
  type TranslationPractice,
  type TranslationPracticeSubmitResult,
} from "@/lib/topic-api";

const LEVEL_LABEL: Record<string, string> = {
  de: "Dễ",
  trung_binh: "Trung bình",
  kho: "Khó",
};

export default function LamBaiLuyenTapDichPage() {
  const [userId, setUserId] = useState<number | undefined>();
  const [danhSachChuDe, setDanhSachChuDe] = useState<Topic[]>([]);
  const [danhSachBaiTap, setDanhSachBaiTap] = useState<TranslationPractice[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangNop, setDangNop] = useState(false);
  const [loi, setLoi] = useState("");
  const [thongBao, setThongBao] = useState("");

  const [topicFilter, setTopicFilter] = useState<number | "tat_ca">("tat_ca");
  const [selectedPracticeId, setSelectedPracticeId] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<TranslationPracticeSubmitResult | null>(null);

  async function taiDuLieu(currentUserId?: number) {
    setDangTai(true);
    setLoi("");
    setThongBao("");
    try {
      const [topics, practices] = await Promise.all([
        getTopics(currentUserId),
        getTranslationPractices(currentUserId),
      ]);
      setDanhSachChuDe(topics);
      setDanhSachBaiTap(practices);
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

  const danhSachBaiTapLoc = useMemo(() => {
    if (topicFilter === "tat_ca") {
      return danhSachBaiTap;
    }
    return danhSachBaiTap.filter((item) => item.topic_ids.includes(topicFilter));
  }, [danhSachBaiTap, topicFilter]);

  const baiTapDangLam = useMemo(
    () => danhSachBaiTapLoc.find((item) => item.id === selectedPracticeId) ?? null,
    [danhSachBaiTapLoc, selectedPracticeId],
  );

  const cauDangLam = baiTapDangLam?.items[currentIndex] ?? null;

  function chonBaiTap(id: number) {
    setSelectedPracticeId(id);
    setCurrentIndex(0);
    const selected = danhSachBaiTapLoc.find((item) => item.id === id);
    setAnswers(selected ? new Array(selected.items.length).fill("") : []);
    setResult(null);
    setThongBao("");
    setLoi("");
  }

  function lamLaiBai() {
    if (!baiTapDangLam) return;
    setCurrentIndex(0);
    setAnswers(new Array(baiTapDangLam.items.length).fill(""));
    setResult(null);
    setThongBao("Đã làm mới bài. Bạn có thể làm lại từ đầu.");
    setLoi("");
  }

  function capNhatDapAn(value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = value;
      return next;
    });
  }

  async function onNopBai() {
    if (!userId) {
      setLoi("Bạn cần đăng nhập để nộp bài");
      return;
    }
    if (!baiTapDangLam) {
      setLoi("Vui lòng chọn bài luyện tập");
      return;
    }

    try {
      setDangNop(true);
      setLoi("");
      setThongBao("");
      const ketQua = await submitTranslationPractice(baiTapDangLam.id, {
        user_id: userId,
        answers,
      });
      setResult(ketQua);
      setThongBao("Đã nộp bài và lưu lịch sử học thành công");
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Không thể nộp bài");
    } finally {
      setDangNop(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-6 py-8 md:px-10">
      <section>
        <h1 className="text-3xl font-black tracking-tight">Làm Bài Luyện Tập Dịch</h1>
        <p className="mt-1 text-muted">Chọn đề, nhập đáp án từng câu, rồi bấm Nộp để chấm điểm.</p>
      </section>

      {loi && (
        <div className="rounded-lg border border-red-200 bg-red-50/85 px-4 py-3 text-sm text-red-600">{loi}</div>
      )}
      {thongBao && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/85 px-4 py-3 text-sm text-emerald-700">
          {thongBao}
        </div>
      )}

      <section className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm backdrop-blur-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold">Lọc theo chủ đề</span>
            <select
              value={topicFilter}
              onChange={(event) =>
                setTopicFilter(event.target.value === "tat_ca" ? "tat_ca" : Number(event.target.value))
              }
              className="h-11 w-full rounded-lg border border-primary/20 bg-background/70 px-3 outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="tat_ca">Tất cả chủ đề</option>
              {danhSachChuDe.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.ten_chu_de ?? `Chủ đề #${item.id}`}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold">Chọn bài luyện tập</span>
            <select
              value={selectedPracticeId ?? ""}
              onChange={(event) => chonBaiTap(Number(event.target.value))}
              disabled={dangTai || !danhSachBaiTapLoc.length}
              className="h-11 w-full rounded-lg border border-primary/20 bg-background/70 px-3 outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
            >
              <option value="" disabled>
                {dangTai ? "Đang tải..." : "Chọn 1 bài"}
              </option>
              {danhSachBaiTapLoc.map((item) => (
                <option key={item.id} value={item.id}>
                  Bài #{item.id} - {LEVEL_LABEL[item.level] ?? item.level} - {item.so_cau} câu
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {baiTapDangLam && cauDangLam && (
        <section className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-primary">
              Câu {currentIndex + 1}/{baiTapDangLam.items.length}
            </p>
            <p className="text-xs text-muted">Mức độ: {LEVEL_LABEL[baiTapDangLam.level] ?? baiTapDangLam.level}</p>
          </div>

          <div className="mb-4 rounded-xl border border-primary/10 bg-background/70 p-4">
            <p className="text-base font-semibold">{cauDangLam.question}</p>
          </div>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-semibold">Nhập đáp án (pinyin plain)</span>
            <input
              value={answers[currentIndex] ?? ""}
              onChange={(event) => capNhatDapAn(event.target.value)}
              className="h-11 w-full rounded-lg border border-primary/20 bg-background/70 px-3 outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Ví dụ: wo jintian qu xuexiao"
            />
          </label>

          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Câu trước
              </button>
              <button
                type="button"
                disabled={currentIndex === baiTapDangLam.items.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(baiTapDangLam.items.length - 1, prev + 1))}
                className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Câu sau
              </button>
            </div>

            <button
              type="button"
              onClick={onNopBai}
              disabled={dangNop}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-slate-900 disabled:opacity-60"
            >
              {dangNop ? "Đang nộp..." : "Nộp bài"}
            </button>
          </div>
        </section>
      )}

      {result && (
        <section className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm backdrop-blur-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Kết quả</h2>
            <button
              type="button"
              onClick={lamLaiBai}
              className="rounded-lg border border-primary/25 bg-background/70 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              Làm lại bài
            </button>
          </div>

          <p className="mb-4 text-sm text-muted">
            Đúng {result.so_cau_dung}/{result.tong_so_cau} câu - Điểm:{" "}
            <span className="font-bold text-primary">{result.diem}</span>
          </p>

          <div className="space-y-2">
            {result.details.map((item) => (
              <article
                key={item.index}
                className={`rounded-lg border px-3 py-2 ${
                  item.is_correct ? "border-emerald-200 bg-emerald-50/80" : "border-rose-200 bg-rose-50/80"
                }`}
              >
                <p className="text-sm font-semibold">
                  Câu {item.index}: {item.question}
                </p>
                <p className="text-sm">Bạn trả lời: {item.user_answer || "(trống)"}</p>
                <p className="text-sm">Đáp án hệ thống: {item.system_answer}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
