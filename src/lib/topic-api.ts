export type Topic = {
  id: number;
  ten_chu_de: string | null;
  mo_ta: string | null;
  user_id: number | null;
  created_at?: string | null;
};

export type Vocabulary = {
  id: number;
  hanzi: string | null;
  pinyin: string | null;
  pinyin_plain: string | null;
  nghia_vi: string | null;
  nghia_en: string | null;
  example_cn: string | null;
  example_vi: string | null;
  chu_de_id: number | null;
  created_at?: string | null;
};

export type GeneratedVocabularyItem = {
  hanzi: string;
  pinyin?: string;
  pinyin_plain?: string;
  nghia_vi?: string;
  nghia_en?: string;
  example_cn?: string;
  example_vi?: string;
  chu_de_id: number;
};

export type VocabularyFlashCardPage = {
  items: Vocabulary[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
};

export type TranslationPracticeItem = {
  question: string;
  answer: string;
  answer_hanzi: string;
};

export type TranslationPractice = {
  id: number;
  user_id: number | null;
  topic_ids: number[];
  so_cau: number;
  level: "de" | "trung_binh" | "kho";
  created_at?: string | null;
  items: TranslationPracticeItem[];
};

export type SentenceOrderingItem = {
  question: string[];
  answer: string[];
  nghia_vi: string;
};

export type SentenceOrderingPractice = {
  id: number;
  user_id: number | null;
  topic_ids: number[];
  so_cau: number;
  noi_dung: SentenceOrderingItem[];
};

export type GeneratedSentenceOrderingPractice = {
  user_id: number | null;
  topic_ids: number[];
  so_cau: number;
  level: "de" | "trung_binh" | "kho";
  items: SentenceOrderingItem[];
};

export type SentenceOrderingSubmitDetail = {
  index: number;
  question: string[];
  user_answer: string[];
  system_answer: string[];
  nghia_vi: string;
  is_correct: boolean;
};

export type SentenceOrderingSubmitResult = {
  history_id: number;
  exp_id: number;
  sap_xep_cau_id: number;
  tong_so_cau: number;
  so_cau_dung: number;
  diem: number;
  exp_cong_them: number;
  details: SentenceOrderingSubmitDetail[];
};

export type DeleteTranslationPracticeResponse = {
  message: string;
  id: number;
};

export type GeneratedTranslationPractice = {
  user_id: number | null;
  topic_ids: number[];
  so_cau: number;
  level: "de" | "trung_binh" | "kho";
  items: TranslationPracticeItem[];
};

export type TranslationPracticeSubmitDetail = {
  index: number;
  question: string;
  user_answer: string;
  system_answer: string;
  system_answer_hanzi: string;
  is_correct: boolean;
};

export type TranslationPracticeSubmitResult = {
  history_id: number;
  luyen_tap_dich_id: number;
  tong_so_cau: number;
  so_cau_dung: number;
  diem: number;
  details: TranslationPracticeSubmitDetail[];
};

export type ExperiencePoint = {
  id: number;
  user_id: number;
  exp: number;
};

type VocabularyDuplicateResponse = {
  inserted: false;
  message: string;
  existed: Vocabulary;
};

type BulkImportResponse = {
  count: number;
  skipped: number;
};

type BulkCreateResponse = {
  count: number;
  skipped: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";

type Query = Record<string, string | number | undefined | null>;

function makeUrl(path: string, query?: Query) {
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && `${value}`.length > 0) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(path: string, init?: RequestInit, query?: Query): Promise<T> {
  const response = await fetch(makeUrl(path, query), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      typeof body?.message === "string"
        ? body.message
        : Array.isArray(body?.message)
          ? body.message.join(", ")
          : "Yêu cầu thất bại";
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getTopics(userId?: number) {
  return request<Topic[]>("/chu-de", { method: "GET" }, { user_id: userId });
}

export function createTopic(payload: { ten_chu_de: string; mo_ta?: string; user_id?: number | null }) {
  return request<Topic>("/chu-de", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTopic(
  id: number,
  payload: { ten_chu_de?: string; mo_ta?: string },
  userId: number,
) {
  return request<Topic>(
    `/chu-de/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    { user_id: userId },
  );
}

export function deleteTopic(id: number, userId: number) {
  return request<Topic>(`/chu-de/${id}`, { method: "DELETE" }, { user_id: userId });
}

export function getVocabularies(userId?: number) {
  return request<Vocabulary[]>("/tu-vung", { method: "GET" }, { user_id: userId });
}

export function getVocabularyFlashCards(input?: {
  user_id?: number;
  chu_de_id?: number;
  page?: number;
  page_size?: number;
}) {
  return request<VocabularyFlashCardPage>(
    "/tu-vung/flash-cards",
    { method: "GET" },
    {
      user_id: input?.user_id,
      chu_de_id: input?.chu_de_id,
      page: input?.page,
      page_size: input?.page_size,
    },
  );
}

export function getRandomVocabulariesByTopic(input: {
  chu_de_id: number;
  so_luong: number;
  user_id?: number;
}) {
  return request<Vocabulary[]>(
    "/tu-vung/random",
    { method: "GET" },
    {
      chu_de_id: input.chu_de_id,
      so_luong: input.so_luong,
      user_id: input.user_id,
    },
  );
}

export function createVocabulary(payload: {
  hanzi: string;
  pinyin?: string;
  pinyin_plain?: string;
  nghia_vi?: string;
  nghia_en?: string;
  example_cn?: string;
  example_vi?: string;
  chu_de_id: number;
  user_id?: number;
}) {
  return request<Vocabulary | VocabularyDuplicateResponse>("/tu-vung", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createVocabularyBulk(input: {
  chu_de_id: number;
  user_id?: number;
  items: Array<{
    hanzi: string;
    pinyin?: string;
    pinyin_plain?: string;
    nghia_vi?: string;
    nghia_en?: string;
    example_cn?: string;
    example_vi?: string;
  }>;
}) {
  return request<BulkCreateResponse>("/tu-vung/bulk", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function generateVocabularyByAi(input: {
  chu_de_id: number;
  so_luong: number;
  user_id?: number;
}) {
  return request<GeneratedVocabularyItem[]>("/tu-vung/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function importVocabulariesFromExcel(input: {
  file: File;
  chuDeId: number;
  userId?: number;
}) {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("chu_de_id", String(input.chuDeId));
  if (input.userId) {
    formData.append("user_id", String(input.userId));
  }

  const response = await fetch(makeUrl("/tu-vung/bulk/excel"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      typeof body?.message === "string"
        ? body.message
        : Array.isArray(body?.message)
          ? body.message.join(", ")
          : "Không thể import Excel";
    throw new Error(message);
  }

  return (await response.json()) as BulkImportResponse;
}

export function getTranslationPractices(userId?: number) {
  return request<TranslationPractice[]>("/luyen-tap-dich", { method: "GET" }, { user_id: userId });
}

export function generateTranslationPractice(input: {
  topic_ids: number[];
  so_cau: number;
  level: "de" | "trung_binh" | "kho";
  user_id?: number | null;
}) {
  return request<GeneratedTranslationPractice>("/luyen-tap-dich/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveTranslationPractice(input: {
  topic_ids: number[];
  so_cau: number;
  level: "de" | "trung_binh" | "kho";
  items: TranslationPracticeItem[];
  user_id?: number | null;
}) {
  return request<TranslationPractice>("/luyen-tap-dich/save", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTranslationPractice(
  id: number,
  input: {
    topic_ids: number[];
    so_cau: number;
    level: "de" | "trung_binh" | "kho";
    items: TranslationPracticeItem[];
    user_id?: number | null;
  },
) {
  return request<TranslationPractice>(`/luyen-tap-dich/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteTranslationPractice(id: number, userId?: number | null) {
  return request<DeleteTranslationPracticeResponse>(
    `/luyen-tap-dich/${id}`,
    { method: "DELETE" },
    { user_id: userId },
  );
}

export function submitTranslationPractice(
  id: number,
  input: {
    user_id: number;
    answers: Array<string | { answer: string }>;
  },
) {
  return request<TranslationPracticeSubmitResult>(`/luyen-tap-dich/${id}/submit`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getSentenceOrderingPractices(userId?: number) {
  return request<SentenceOrderingPractice[]>("/sap-xep-cau", { method: "GET" }, { user_id: userId });
}

export function generateSentenceOrderingPractice(input: {
  topic_ids: number[];
  so_cau: number;
  level: "de" | "trung_binh" | "kho";
  user_id?: number | null;
}) {
  return request<GeneratedSentenceOrderingPractice>("/sap-xep-cau/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveSentenceOrderingPractice(input: {
  topic_ids: number[];
  so_cau: number;
  items: SentenceOrderingItem[];
  user_id?: number | null;
}) {
  return request<SentenceOrderingPractice>("/sap-xep-cau/save", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function submitSentenceOrderingPractice(
  id: number,
  input: {
    user_id: number;
    answers: Array<string[] | { answer: string[] }>;
  },
) {
  return request<SentenceOrderingSubmitResult>(`/sap-xep-cau/${id}/submit`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createExperiencePoint(input: { user_id: number; exp: number }) {
  return request<ExperiencePoint>("/diem-kinh-nghiem", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
