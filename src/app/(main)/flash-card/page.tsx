"use client";

import { useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/auth-api";
import { getAuthToken, getStoredUser, saveUser } from "@/lib/auth-storage";
import { getTopics, getVocabularyFlashCards, type Topic, type Vocabulary } from "@/lib/topic-api";

type PaginationState = {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
};

const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  page_size: 9,
  total_items: 0,
  total_pages: 1,
};

export default function FlashCardPage() {
  const [userId, setUserId] = useState<number | undefined>();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | "all">("all");
  const [cards, setCards] = useState<Vocabulary[]>([]);
  const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTopics(currentUserId?: number) {
    const topicList = await getTopics(currentUserId);
    setTopics(topicList);
  }

  async function loadCards(options?: {
    currentUserId?: number;
    page?: number;
    topicId?: number | "all";
  }) {
    setLoading(true);
    setError("");
    try {
      const page = options?.page ?? pagination.page ?? 1;
      const topicId = options?.topicId ?? selectedTopicId;
      const response = await getVocabularyFlashCards({
        user_id: options?.currentUserId ?? userId,
        chu_de_id: topicId === "all" ? undefined : topicId,
        page,
        page_size: 9,
      });
      setCards(response.items);
      setPagination(response.pagination);
      setFlippedIds([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải flash cards");
      setCards([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const localUser = getStoredUser();
    if (localUser?.id) {
      setUserId(localUser.id);
      Promise.all([loadTopics(localUser.id), loadCards({ currentUserId: localUser.id, page: 1 })]).catch(() => {});
      return;
    }

    const token = getAuthToken();
    if (!token) {
      Promise.all([loadTopics(undefined), loadCards({ currentUserId: undefined, page: 1 })]).catch(() => {});
      return;
    }

    getMe(token)
      .then((response) => {
        saveUser(response.user);
        setUserId(response.user.id);
        return Promise.all([
          loadTopics(response.user.id),
          loadCards({ currentUserId: response.user.id, page: 1 }),
        ]);
      })
      .catch(() => Promise.all([loadTopics(undefined), loadCards({ currentUserId: undefined, page: 1 })]));
  }, []);

  const topicNameMap = useMemo(() => {
    const map = new Map<number, string>();
    topics.forEach((topic) => {
      map.set(topic.id, topic.ten_chu_de ?? `Chủ đề #${topic.id}`);
    });
    return map;
  }, [topics]);

  function toggleFlip(cardId: number) {
    setFlippedIds((prev) => (prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]));
  }

  function changeTopic(nextTopicId: number | "all") {
    setSelectedTopicId(nextTopicId);
    loadCards({
      currentUserId: userId,
      page: 1,
      topicId: nextTopicId,
    }).catch(() => {});
  }

  function goPage(nextPage: number) {
    if (nextPage < 1 || nextPage > pagination.total_pages) {
      return;
    }
    loadCards({
      currentUserId: userId,
      page: nextPage,
      topicId: selectedTopicId,
    }).catch(() => {});
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-6 py-8 md:px-10">
      <section className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Học Bằng Flash Card</h1>
          <p className="text-muted">Bấm vào thẻ để lật mặt trước/sau. Mỗi trang 9 từ.</p>
        </div>

        <label className="w-full max-w-sm space-y-1">
          <span className="text-sm font-semibold">Chọn chủ đề</span>
          <select
            value={selectedTopicId}
            onChange={(event) =>
              changeTopic(event.target.value === "all" ? "all" : Number(event.target.value))
            }
            className="h-11 w-full rounded-lg border border-primary/20 bg-surface px-3 outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Tất cả chủ đề</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.ten_chu_de ?? `Chủ đề #${topic.id}`}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-primary/10 bg-surface p-10 text-center text-sm text-muted">
          Đang tải flash cards...
        </div>
      ) : !cards.length ? (
        <div className="rounded-2xl border border-primary/10 bg-surface p-10 text-center text-sm text-muted">
          Không có từ vựng trong bộ lọc hiện tại.
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const flipped = flippedIds.includes(card.id);
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => toggleFlip(card.id)}
                className="h-56 [perspective:1000px]"
              >
                <div
                  className={`relative h-full w-full rounded-2xl border border-primary/15 shadow-sm transition-transform duration-500 [transform-style:preserve-3d] ${
                    flipped ? "[transform:rotateY(180deg)]" : ""
                  }`}
                >
                  <div className="absolute inset-0 flex h-full w-full flex-col rounded-2xl bg-surface p-4 [backface-visibility:hidden]">
                    <div className="mb-2 text-xs font-semibold text-primary">
                      {card.chu_de_id ? topicNameMap.get(card.chu_de_id) ?? `#${card.chu_de_id}` : "Không chủ đề"}
                    </div>
                    <div className="mt-auto mb-auto text-center">
                      <p className="text-5xl font-black tracking-wide">{card.hanzi ?? "-"}</p>
                      {card.pinyin && <p className="mt-3 text-sm text-muted">{card.pinyin}</p>}
                      {card.pinyin_plain && <p className="text-xs text-muted">{card.pinyin_plain}</p>}
                    </div>
                    <p className="text-xs text-muted">Bấm để xem nghĩa</p>
                  </div>

                  <div className="absolute inset-0 flex h-full w-full flex-col rounded-2xl bg-primary/10 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    {card.nghia_vi && (
                      <p className="text-sm">
                        <strong>Nghĩa Việt:</strong> {card.nghia_vi}
                      </p>
                    )}
                    {card.nghia_en && (
                      <p className="mt-1 text-sm">
                        <strong>English:</strong> {card.nghia_en}
                      </p>
                    )}
                    {card.example_cn && (
                      <p className="mt-2 text-sm">
                        <strong>Ví dụ CN:</strong> {card.example_cn}
                      </p>
                    )}
                    {card.example_vi && (
                      <p className="mt-1 text-sm">
                        <strong>Ví dụ VI:</strong> {card.example_vi}
                      </p>
                    )}
                    <p className="mt-auto text-xs text-muted">Bấm để lật lại</p>
                  </div>
                </div>
              </button>
            );
          })}
        </section>
      )}

      <section className="flex items-center justify-between rounded-xl border border-primary/10 bg-surface px-4 py-3">
        <p className="text-sm text-muted">
          Trang {pagination.page}/{pagination.total_pages} • Tổng {pagination.total_items} từ
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
            className="rounded-lg border border-primary/20 px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Trước
          </button>
          <button
            type="button"
            onClick={() => goPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages || loading}
            className="rounded-lg border border-primary/20 px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      </section>
    </main>
  );
}
