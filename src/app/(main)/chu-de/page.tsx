"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/auth-api";
import { getAuthToken, getStoredUser, saveUser } from "@/lib/auth-storage";
import {
  createTopic,
  createVocabulary,
  createVocabularyBulk,
  deleteTopic,
  getTopics,
  getVocabularies,
  importVocabulariesFromExcel,
  type Topic,
  type Vocabulary,
  updateTopic,
} from "@/lib/topic-api";

type BoLocChuDe = "tat_ca" | "ca_nhan" | "he_thong";

const BIEU_TUONG_CHU_DE = ["restaurant", "schedule", "business_center", "school", "travel"];

export default function ChuDePage() {
  const [danhSachChuDe, setDanhSachChuDe] = useState<Topic[]>([]);
  const [danhSachTuVung, setDanhSachTuVung] = useState<Vocabulary[]>([]);
  const [chuDeDangChonId, setChuDeDangChonId] = useState<number | null>(null);
  const [boLoc, setBoLoc] = useState<BoLocChuDe>("tat_ca");
  const [tuKhoaTimKiem, setTuKhoaTimKiem] = useState("");
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [thongBao, setThongBao] = useState("");
  const [userId, setUserId] = useState<number | undefined>();

  const [hienModalTaoChuDe, setHienModalTaoChuDe] = useState(false);
  const [tenChuDeMoi, setTenChuDeMoi] = useState("");
  const [moTaChuDeMoi, setMoTaChuDeMoi] = useState("");
  const [taoChuDeHeThong, setTaoChuDeHeThong] = useState(false);

  const [hienModalSuaChuDe, setHienModalSuaChuDe] = useState(false);
  const [chuDeDangSuaId, setChuDeDangSuaId] = useState<number | null>(null);
  const [tenChuDeSua, setTenChuDeSua] = useState("");
  const [moTaChuDeSua, setMoTaChuDeSua] = useState("");

  const [hienModalThemTu, setHienModalThemTu] = useState(false);
  const [chuDeThemTuId, setChuDeThemTuId] = useState<number | null>(null);
  const [hanzi, setHanzi] = useState("");
  const [pinyin, setPinyin] = useState("");
  const [pinyinPlain, setPinyinPlain] = useState("");
  const [nghiaVi, setNghiaVi] = useState("");
  const [nghiaEn, setNghiaEn] = useState("");
  const [exampleCn, setExampleCn] = useState("");
  const [exampleVi, setExampleVi] = useState("");
  const [cheDoThemTu, setCheDoThemTu] = useState<"don" | "nhieu">("don");
  const [noiDungThemNhieu, setNoiDungThemNhieu] = useState("");

  const [hienModalImport, setHienModalImport] = useState(false);
  const [chuDeImportId, setChuDeImportId] = useState<number | null>(null);
  const [tepExcel, setTepExcel] = useState<File | null>(null);
  const [dangKeoTha, setDangKeoTha] = useState(false);
  const [dangImport, setDangImport] = useState(false);

  async function taiDuLieu(currentUserId?: number) {
    setDangTai(true);
    setLoi("");
    setThongBao("");
    try {
      const [chuDe, tuVung] = await Promise.all([
        getTopics(currentUserId),
        getVocabularies(currentUserId),
      ]);
      setDanhSachChuDe(chuDe);
      setDanhSachTuVung(tuVung);
      setChuDeDangChonId((giaTriCu) => {
        if (giaTriCu && chuDe.some((item) => item.id === giaTriCu)) {
          return giaTriCu;
        }
        return null;
      });
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Không thể tải dữ liệu chủ đề");
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

  const danhSachChuDeHienThi = useMemo(() => {
    const tuKhoa = tuKhoaTimKiem.trim().toLowerCase();
    return danhSachChuDe.filter((chuDe) => {
      const laChuDeHeThong = chuDe.user_id === null;
      const laChuDeCaNhan = userId !== undefined && chuDe.user_id === userId;

      if (boLoc === "ca_nhan" && !laChuDeCaNhan) {
        return false;
      }
      if (boLoc === "he_thong" && !laChuDeHeThong) {
        return false;
      }

      if (!tuKhoa) {
        return true;
      }

      const noiDung = `${chuDe.ten_chu_de ?? ""} ${chuDe.mo_ta ?? ""}`.toLowerCase();
      return noiDung.includes(tuKhoa);
    });
  }, [danhSachChuDe, boLoc, tuKhoaTimKiem, userId]);

  const soTuTheoChuDe = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of danhSachTuVung) {
      if (!item.chu_de_id) {
        continue;
      }
      map.set(item.chu_de_id, (map.get(item.chu_de_id) ?? 0) + 1);
    }
    return map;
  }, [danhSachTuVung]);

  const chuDeDangChon = useMemo(
    () => danhSachChuDe.find((item) => item.id === chuDeDangChonId) ?? null,
    [danhSachChuDe, chuDeDangChonId],
  );

  const danhSachTuTheoChuDe = useMemo(
    () => danhSachTuVung.filter((item) => item.chu_de_id === chuDeDangChonId),
    [danhSachTuVung, chuDeDangChonId],
  );

  useEffect(() => {
    if (!hienModalThemTu) {
      return;
    }
    if (chuDeDangChonId && danhSachChuDe.some((item) => item.id === chuDeDangChonId)) {
      setChuDeThemTuId(chuDeDangChonId);
      return;
    }
    setChuDeThemTuId(danhSachChuDe[0]?.id ?? null);
  }, [hienModalThemTu, chuDeDangChonId, danhSachChuDe]);

  function moModalImport() {
    setChuDeImportId(chuDeDangChonId ?? danhSachChuDe[0]?.id ?? null);
    setTepExcel(null);
    setDangKeoTha(false);
    setHienModalImport(true);
  }

  async function onTaoChuDe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenChuDeMoi.trim()) {
      return;
    }
    if (!taoChuDeHeThong && !userId) {
      setLoi("Bạn cần đăng nhập để tạo chủ đề cá nhân");
      return;
    }

    try {
      const ketQua = await createTopic({
        ten_chu_de: tenChuDeMoi.trim(),
        mo_ta: moTaChuDeMoi.trim() || undefined,
        user_id: taoChuDeHeThong ? null : userId,
      });
      setDanhSachChuDe((prev) => [ketQua, ...prev]);
      setChuDeDangChonId(ketQua.id);
      setHienModalTaoChuDe(false);
      setTenChuDeMoi("");
      setMoTaChuDeMoi("");
      setTaoChuDeHeThong(false);
      setThongBao("Tạo chủ đề thành công");
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Không thể tạo chủ đề");
    }
  }

  function moModalSuaChuDe(chuDe: Topic) {
    if (!userId || chuDe.user_id !== userId) {
      setLoi("Bạn chỉ được sửa chủ đề do bạn tạo");
      return;
    }
    setChuDeDangSuaId(chuDe.id);
    setTenChuDeSua(chuDe.ten_chu_de ?? "");
    setMoTaChuDeSua(chuDe.mo_ta ?? "");
    setHienModalSuaChuDe(true);
  }

  async function onSuaChuDe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !chuDeDangSuaId || !tenChuDeSua.trim()) {
      return;
    }

    try {
      const ketQua = await updateTopic(
        chuDeDangSuaId,
        {
          ten_chu_de: tenChuDeSua.trim(),
          mo_ta: moTaChuDeSua.trim() || undefined,
        },
        userId,
      );
      setDanhSachChuDe((prev) => prev.map((item) => (item.id === chuDeDangSuaId ? ketQua : item)));
      setHienModalSuaChuDe(false);
      setChuDeDangSuaId(null);
      setTenChuDeSua("");
      setMoTaChuDeSua("");
      setThongBao("Cập nhật chủ đề thành công");
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Không thể cập nhật chủ đề");
    }
  }

  async function onXoaChuDe(chuDe: Topic) {
    if (!userId || chuDe.user_id !== userId) {
      setLoi("Bạn chỉ được xoá chủ đề do bạn tạo");
      return;
    }

    const xacNhan = window.confirm(`Bạn có chắc muốn xoá chủ đề "${chuDe.ten_chu_de ?? "Chưa đặt tên"}"?`);
    if (!xacNhan) {
      return;
    }

    try {
      await deleteTopic(chuDe.id, userId);
      setDanhSachChuDe((prev) => prev.filter((item) => item.id !== chuDe.id));
      setDanhSachTuVung((prev) => prev.filter((item) => item.chu_de_id !== chuDe.id));
      setChuDeDangChonId((id) => (id === chuDe.id ? null : id));
      setThongBao("Đã xoá chủ đề");
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Không thể xoá chủ đề");
    }
  }

  async function onThemTuVung(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chuDeThemTuId) {
      return;
    }

    try {
      if (cheDoThemTu === "nhieu") {
        const lines = noiDungThemNhieu
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (!lines.length) {
          setLoi("Vui lòng nhập dữ liệu theo từng dòng.");
          return;
        }

        const items = lines
          .map((line) => line.split("|").map((item) => item.trim()))
          .map((parts) => ({
            hanzi: parts[0] ?? "",
            pinyin: parts[1] || undefined,
            pinyin_plain: parts[2] || undefined,
            nghia_vi: parts[3] || undefined,
            nghia_en: parts[4] || undefined,
            example_cn: parts[5] || undefined,
            example_vi: parts[6] || undefined,
          }))
          .filter((item) => item.hanzi.length > 0);

        if (!items.length) {
          setLoi("Không có dòng hợp lệ. Mỗi dòng cần có ít nhất hanzi.");
          return;
        }

        const ketQuaBulk = await createVocabularyBulk({
          chu_de_id: chuDeThemTuId,
          user_id: userId,
          items,
        });

        const danhSachMoi = await getVocabularies(userId);
        setDanhSachTuVung(danhSachMoi);
        setChuDeDangChonId(chuDeThemTuId);
        setHienModalThemTu(false);
        setNoiDungThemNhieu("");
        setThongBao(
          `Thêm bulk thành công: ${ketQuaBulk.count} từ, bỏ qua ${ketQuaBulk.skipped} từ`,
        );
        return;
      }

      if (!hanzi.trim()) {
        setLoi("Trường hanzi là bắt buộc.");
        return;
      }

      const ketQua = await createVocabulary({
        hanzi: hanzi.trim(),
        pinyin: pinyin.trim() || undefined,
        pinyin_plain: pinyinPlain.trim() || undefined,
        nghia_vi: nghiaVi.trim() || undefined,
        nghia_en: nghiaEn.trim() || undefined,
        example_cn: exampleCn.trim() || undefined,
        example_vi: exampleVi.trim() || undefined,
        chu_de_id: chuDeThemTuId,
        user_id: userId,
      });

      if ("inserted" in ketQua && ketQua.inserted === false) {
        setLoi(ketQua.message);
        return;
      }

      if (!("id" in ketQua)) {
        setLoi("Dữ liệu trả về không hợp lệ");
        return;
      }

      setDanhSachTuVung((prev) => [ketQua, ...prev]);
      setChuDeDangChonId(chuDeThemTuId);
      setHienModalThemTu(false);
      setHanzi("");
      setPinyin("");
      setPinyinPlain("");
      setNghiaVi("");
      setNghiaEn("");
      setExampleCn("");
      setExampleVi("");
      setNoiDungThemNhieu("");
      setThongBao("Thêm từ vựng thành công");
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Không thể thêm từ vựng");
    }
  }

  function onChonFileExcel(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setTepExcel(file);
  }

  function onKeoVao(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDangKeoTha(true);
  }

  function onRoiKhoi(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDangKeoTha(false);
  }

  function onThaFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDangKeoTha(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) {
      setTepExcel(file);
    }
  }

  async function onImportExcel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tepExcel || !chuDeImportId) {
      return;
    }

    try {
      setDangImport(true);
      const ketQua = await importVocabulariesFromExcel({
        file: tepExcel,
        chuDeId: chuDeImportId,
        userId,
      });

      const danhSachMoi = await getVocabularies(userId);
      setDanhSachTuVung(danhSachMoi);
      setChuDeDangChonId(chuDeImportId);
      setHienModalImport(false);
      setTepExcel(null);
      setThongBao(`Import thành công: ${ketQua.count} từ, bỏ qua ${ketQua.skipped} từ`);
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Không thể import file Excel");
    } finally {
      setDangImport(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-8 px-6 py-8 md:px-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Quản Lý Chủ Đề</h1>
          <p className="mt-1 text-muted">Tổ chức và tuỳ chỉnh lộ trình học từ vựng của bạn.</p>
        </div>
        <button
          type="button"
          onClick={() => setHienModalTaoChuDe(true)}
          className="flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-slate-900 shadow-lg transition hover:brightness-110"
        >
          <span className="material-symbols-outlined">add</span>
          <span>Thêm Chủ Đề Mới</span>
        </button>
      </section>

      <section className="rounded-2xl border border-primary/10 bg-surface p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2 border-b border-primary/10 pb-3">
          {[
            { key: "tat_ca", label: "Tất cả" },
            { key: "ca_nhan", label: "Cá nhân" },
            { key: "he_thong", label: "Hệ thống" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setBoLoc(tab.key as BoLocChuDe)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                boLoc === tab.key
                  ? "bg-primary text-slate-900"
                  : "text-muted hover:bg-primary/10 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="mb-5 flex h-11 items-center overflow-hidden rounded-xl border border-primary/10 bg-background">
          <span className="material-symbols-outlined px-3 text-muted">search</span>
          <input
            value={tuKhoaTimKiem}
            onChange={(event) => setTuKhoaTimKiem(event.target.value)}
            placeholder="Tìm kiếm chủ đề..."
            className="h-full w-full bg-transparent pr-3 text-sm outline-none"
          />
        </label>

        {loi && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {loi}
          </div>
        )}
        {thongBao && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {thongBao}
          </div>
        )}

        {dangTai ? (
          <div className="py-12 text-center text-sm text-muted">Đang tải danh sách chủ đề...</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {danhSachChuDeHienThi.map((chuDe, index) => {
              const dangChon = chuDe.id === chuDeDangChonId;
              const duocQuanLy = userId !== undefined && chuDe.user_id === userId;
              return (
                <article
                  key={chuDe.id}
                  className={`group rounded-xl border p-5 shadow-sm transition ${
                    dangChon
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-primary/10 bg-surface hover:border-primary/30 hover:shadow-lg"
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setChuDeDangChonId(chuDe.id)}
                      className="flex items-center gap-3 text-left"
                    >
                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                          dangChon ? "bg-primary text-slate-900" : "bg-primary/10 text-primary"
                        }`}
                      >
                        <span className="material-symbols-outlined">
                          {BIEU_TUONG_CHU_DE[index % BIEU_TUONG_CHU_DE.length]}
                        </span>
                      </span>
                      <span>
                        <strong className="block text-base">{chuDe.ten_chu_de ?? "Chưa đặt tên"}</strong>
                        <span className="text-xs text-muted">
                          {chuDe.user_id === null ? "Chủ đề hệ thống" : "Chủ đề cá nhân"}
                        </span>
                      </span>
                    </button>

                    {duocQuanLy && (
                      <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => moModalSuaChuDe(chuDe)}
                          className="rounded-lg bg-background p-2 text-muted hover:text-primary"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onXoaChuDe(chuDe)}
                          className="rounded-lg bg-background p-2 text-muted hover:text-red-500"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mb-4 line-clamp-2 min-h-10 text-sm text-muted">
                    {chuDe.mo_ta ?? "Không có mô tả"}
                  </p>
                  <div className="flex items-center justify-between text-xs font-semibold text-muted">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">menu_book</span>
                      {soTuTheoChuDe.get(chuDe.id) ?? 0} từ
                    </span>
                    <span className="rounded bg-primary/15 px-2 py-1 text-primary">
                      {dangChon ? "Đang xem" : "Sẵn sàng"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {chuDeDangChon && (
        <section className="overflow-hidden rounded-2xl border border-primary/10 bg-surface shadow-xl">
          <div className="flex flex-col gap-4 border-b border-primary/10 bg-background p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Từ Vựng Trong <span className="text-primary">{chuDeDangChon.ten_chu_de ?? "Chưa đặt tên"}</span>
              </h2>
              <p className="text-sm text-muted">Quản lý {danhSachTuTheoChuDe.length} từ trong chủ đề này</p>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
              <select
                value={chuDeDangChonId ?? ""}
                onChange={(event) => setChuDeDangChonId(Number(event.target.value) || null)}
                className="h-10 rounded-lg border border-primary/20 bg-surface px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30"
              >
                {danhSachChuDe.map((chuDe) => (
                  <option key={chuDe.id} value={chuDe.id}>
                    {chuDe.ten_chu_de ?? "Chưa đặt tên"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={moModalImport}
                className="flex-1 rounded-lg border border-primary/20 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5 md:flex-none"
              >
                Import Excel
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheDoThemTu("don");
                  setNoiDungThemNhieu("");
                  setHienModalThemTu(true);
                }}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900 shadow-md hover:brightness-110 md:flex-none"
              >
                Thêm Từ Mới
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-primary/5 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">Hanzi</th>
                  <th className="px-6 py-4">Pinyin</th>
                  <th className="px-6 py-4">Pinyin Plain</th>
                  <th className="px-6 py-4">Nghĩa Việt</th>
                  <th className="px-6 py-4">Nghĩa Anh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {danhSachTuTheoChuDe.map((tu) => (
                  <tr key={tu.id} className="hover:bg-primary/5">
                    <td className="px-6 py-4 text-xl font-bold">{tu.hanzi ?? "-"}</td>
                    <td className="px-6 py-4 text-muted">{tu.pinyin ?? "-"}</td>
                    <td className="px-6 py-4 text-muted">{tu.pinyin_plain ?? "-"}</td>
                    <td className="px-6 py-4">{tu.nghia_vi ?? "-"}</td>
                    <td className="px-6 py-4">{tu.nghia_en ?? "-"}</td>
                  </tr>
                ))}
                {!danhSachTuTheoChuDe.length && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted">
                      Chưa có từ vựng nào trong chủ đề này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!chuDeDangChon && danhSachChuDe.length > 0 && (
        <section className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-bold">Chọn chủ đề để xem từ vựng</h2>
          <p className="mb-4 text-sm text-muted">Bạn cần chọn 1 chủ đề để tải danh sách từ.</p>
          <select
            value={chuDeDangChonId ?? ""}
            onChange={(event) => setChuDeDangChonId(Number(event.target.value) || null)}
            className="h-11 w-full max-w-md rounded-lg border border-primary/20 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Chọn chủ đề</option>
            {danhSachChuDe.map((chuDe) => (
              <option key={chuDe.id} value={chuDe.id}>
                {chuDe.ten_chu_de ?? "Chưa đặt tên"}
              </option>
            ))}
          </select>
        </section>
      )}

      {hienModalTaoChuDe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={onTaoChuDe}
            className="w-full max-w-lg rounded-2xl border border-primary/10 bg-surface p-6 shadow-2xl"
          >
            <h3 className="mb-4 text-xl font-bold">Tạo Chủ Đề Mới</h3>
            <div className="space-y-4">
              <input
                value={tenChuDeMoi}
                onChange={(event) => setTenChuDeMoi(event.target.value)}
                placeholder="Tên chủ đề"
                className="h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
              />
              <textarea
                value={moTaChuDeMoi}
                onChange={(event) => setMoTaChuDeMoi(event.target.value)}
                placeholder="Mô tả chủ đề"
                rows={3}
                className="w-full rounded-lg border border-primary/20 bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={taoChuDeHeThong}
                  onChange={(event) => setTaoChuDeHeThong(event.target.checked)}
                  className="rounded border-primary/30"
                />
                Tạo chủ đề hệ thống (user_id = null)
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setHienModalTaoChuDe(false)}
                className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-bold"
              >
                Huỷ
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900"
              >
                Lưu Chủ Đề
              </button>
            </div>
          </form>
        </div>
      )}

      {hienModalSuaChuDe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={onSuaChuDe}
            className="w-full max-w-lg rounded-2xl border border-primary/10 bg-surface p-6 shadow-2xl"
          >
            <h3 className="mb-4 text-xl font-bold">Chỉnh Sửa Chủ Đề</h3>
            <div className="space-y-4">
              <input
                value={tenChuDeSua}
                onChange={(event) => setTenChuDeSua(event.target.value)}
                placeholder="Tên chủ đề"
                className="h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
              />
              <textarea
                value={moTaChuDeSua}
                onChange={(event) => setMoTaChuDeSua(event.target.value)}
                placeholder="Mô tả chủ đề"
                rows={3}
                className="w-full rounded-lg border border-primary/20 bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setHienModalSuaChuDe(false);
                  setChuDeDangSuaId(null);
                }}
                className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-bold"
              >
                Huỷ
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {hienModalThemTu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={onThemTuVung}
            className="w-full max-w-xl rounded-2xl border border-primary/10 bg-surface p-6 shadow-2xl"
          >
            <h3 className="mb-1 text-xl font-bold">Thêm Từ Vựng</h3>
            <p className="mb-3 text-sm text-muted">Chọn chế độ thêm một từ hoặc thêm hàng loạt.</p>

            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setCheDoThemTu("don")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  cheDoThemTu === "don"
                    ? "bg-primary text-slate-900"
                    : "border border-primary/20 text-muted hover:bg-primary/5"
                }`}
              >
                Thêm một từ
              </button>
              <button
                type="button"
                onClick={() => setCheDoThemTu("nhieu")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  cheDoThemTu === "nhieu"
                    ? "bg-primary text-slate-900"
                    : "border border-primary/20 text-muted hover:bg-primary/5"
                }`}
              >
                Thêm bulk
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                value={chuDeThemTuId ?? ""}
                onChange={(event) => setChuDeThemTuId(Number(event.target.value) || null)}
                className="h-11 rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40 md:col-span-2"
              >
                <option value="">Chọn chủ đề</option>
                {danhSachChuDe.map((chuDe) => (
                  <option key={chuDe.id} value={chuDe.id}>
                    {chuDe.ten_chu_de ?? "Chưa đặt tên"}
                  </option>
                ))}
              </select>

              {cheDoThemTu === "don" ? (
                <>
                  <input value={hanzi} onChange={(e) => setHanzi(e.target.value)} placeholder="hanzi (bắt buộc)" className="h-11 rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40" />
                  <input value={pinyin} onChange={(e) => setPinyin(e.target.value)} placeholder="pinyin" className="h-11 rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40" />
                  <input value={pinyinPlain} onChange={(e) => setPinyinPlain(e.target.value)} placeholder="pinyin_plain" className="h-11 rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40" />
                  <input value={nghiaVi} onChange={(e) => setNghiaVi(e.target.value)} placeholder="nghia_vi" className="h-11 rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40" />
                  <input value={nghiaEn} onChange={(e) => setNghiaEn(e.target.value)} placeholder="nghia_en" className="h-11 rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40" />
                  <input value={exampleCn} onChange={(e) => setExampleCn(e.target.value)} placeholder="example_cn" className="h-11 rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40" />
                  <input value={exampleVi} onChange={(e) => setExampleVi(e.target.value)} placeholder="example_vi" className="h-11 rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40 md:col-span-2" />
                </>
              ) : (
                <div className="md:col-span-2">
                  <p className="mb-2 text-xs text-muted">
                    Mỗi dòng 1 từ, format: hanzi|pinyin|pinyin_plain|nghia_vi|nghia_en|example_cn|example_vi
                  </p>
                  <textarea
                    value={noiDungThemNhieu}
                    onChange={(e) => setNoiDungThemNhieu(e.target.value)}
                    rows={8}
                    placeholder={`今天|jīntiān|jintian|hôm nay|today||
明天|míngtiān|mingtian|ngày mai|tomorrow||`}
                    className="w-full rounded-lg border border-primary/20 bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setHienModalThemTu(false);
                  setNoiDungThemNhieu("");
                }}
                className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-bold"
              >
                Huỷ
              </button>
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900">
                {cheDoThemTu === "nhieu" ? "Thêm Bulk" : "Lưu Từ Vựng"}
              </button>
            </div>
          </form>
        </div>
      )}

      {hienModalImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={onImportExcel} className="w-full max-w-xl rounded-2xl border border-primary/10 bg-surface p-6 shadow-2xl">
            <h3 className="mb-2 text-xl font-bold">Import Từ Vựng Từ Excel</h3>
            <p className="mb-4 text-sm text-muted">Kéo thả file `.xlsx` hoặc chọn file để import theo chủ đề.</p>

            <select
              value={chuDeImportId ?? ""}
              onChange={(event) => setChuDeImportId(Number(event.target.value) || null)}
              className="mb-4 h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Chọn chủ đề import</option>
              {danhSachChuDe.map((chuDe) => (
                <option key={chuDe.id} value={chuDe.id}>
                  {chuDe.ten_chu_de ?? "Chưa đặt tên"}
                </option>
              ))}
            </select>

            <div
              onDragOver={onKeoVao}
              onDragEnter={onKeoVao}
              onDragLeave={onRoiKhoi}
              onDrop={onThaFile}
              className={`mb-4 rounded-xl border-2 border-dashed p-6 text-center transition ${
                dangKeoTha ? "border-primary bg-primary/5" : "border-primary/30 bg-background"
              }`}
            >
              <p className="mb-2 text-sm font-semibold">Kéo thả file Excel vào đây</p>
              <p className="mb-3 text-xs text-muted">Chấp nhận `.xlsx` hoặc `.xls`</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={onChonFileExcel}
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:font-semibold file:text-slate-900 hover:file:brightness-110"
              />
              {tepExcel && <p className="mt-3 text-xs text-emerald-700">Đã chọn: {tepExcel.name}</p>}
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Link href="/mau-tu-vung-import.xlsx" download className="inline-flex items-center gap-1 rounded-lg border border-primary/20 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
                <span className="material-symbols-outlined text-base">download</span>
                Tải File Excel Mẫu
              </Link>
              <span className="text-xs text-muted">
                Header: hanzi, pinyin, pinyin_plain, nghia_vi, nghia_en, example_cn, example_vi
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setHienModalImport(false)} className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-bold">
                Huỷ
              </button>
              <button type="submit" disabled={dangImport || !tepExcel || !chuDeImportId} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60">
                {dangImport ? "Đang import..." : "Import Ngay"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
