"use client";

import { useState, useEffect } from "react";

interface PreviewData {
  title: string;
  thumbnail: string;
  duration: number;
  video_qualities?: number[];
  audio_formats?: string[];
}

type Theme = "light" | "dark";

export default function Home() {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [type, setType] = useState<"video" | "audio">("video");
  const [quality, setQuality] = useState("1080");
  const [loadingInfo, setLoadingInfo] = useState(false);

  const [theme, setTheme] = useState<Theme>("light");

  // تحميل
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const backendBaseUrl = "http://127.0.0.1:8000";

  const isDark = theme === "dark";

  // --------- Preview ----------
  const fetchInfo = async () => {
    if (!url) return alert("أدخل رابط الفيديو أولاً");

    setLoadingInfo(true);
    setPreview(null);
    try {
      const res = await fetch(
        `${backendBaseUrl}/info?url=${encodeURIComponent(url)}`
      );
      const data = await res.json();
      if (data.detail) {
        alert("تعذّر جلب التفاصيل، تأكد من الرابط.");
      } else {
        const previewData: PreviewData = {
          title: data.title,
          thumbnail: data.thumbnail,
          duration: data.duration,
          video_qualities: data.video_qualities,
          audio_formats: data.audio_formats,
        };
        setPreview(previewData);

        if (data.video_qualities?.length > 0) {
          setQuality(String(data.video_qualities[0]));
        }
      }
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء جلب البيانات.");
    } finally {
      setLoadingInfo(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")} دقيقة`;
  };

  // --------- بدء التحميل (Hybrid) ----------
  const handleDownload = async () => {
    if (!url) return alert("أدخل رابط قبل التحميل!");

    setIsDownloading(true);
    setDownloadProgress(5);

    try {
      const res = await fetch(
        `${backendBaseUrl}/start-download?url=${encodeURIComponent(
          url
        )}&type=${type}&quality=${quality}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!data.task_id) {
        throw new Error("No task id");
      }
      setCurrentTaskId(data.task_id);
    } catch (e) {
      console.error(e);
      alert("تعذّر بدء التحميل");
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // --------- Poll progress from backend ----------
  useEffect(() => {
    if (!currentTaskId) return;

    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      try {
        const res = await fetch(
          `${backendBaseUrl}/progress/${currentTaskId}`
        );
        if (!res.ok) {
          throw new Error("progress error");
        }
        const data = await res.json();
        const status = data.status as string;
        const serverProgress = Number(data.progress ?? 0); // 0–80 تقريباً

        // Hybrid: نأخذ من السيرفر حتى 80%
        if (status === "downloading" || status === "processing") {
          const hybrid = Math.min(80, serverProgress);
          setDownloadProgress((prev) =>
            hybrid > prev ? hybrid : prev
          );
          setTimeout(poll, 800);
        } else if (status === "done") {
          // السيرفر خلص، نبدأ الجزء الـ Fake + تحميل الملف
          setDownloadProgress((prev) => (prev < 90 ? 90 : prev));
          const downloadUrl = `${backendBaseUrl}/download-file/${currentTaskId}`;
          window.location.href = downloadUrl;

          // Fake 90 → 100 داخل المتصفح
          let current = 90;
          const interval = setInterval(() => {
            current += 2.5;
            setDownloadProgress(current);
            if (current >= 100) {
              clearInterval(interval);
              setIsDownloading(false);
              setCurrentTaskId(null);
              setTimeout(() => setDownloadProgress(0), 1000);
            }
          }, 150);
        } else if (status === "error") {
          alert("حدث خطأ أثناء التحميل");
          setIsDownloading(false);
          setDownloadProgress(0);
          setCurrentTaskId(null);
        } else {
          setTimeout(poll, 800);
        }
      } catch (e) {
        console.error(e);
        setIsDownloading(false);
        setCurrentTaskId(null);
      }
    };

    poll();

    return () => {
      stopped = true;
    };
  }, [currentTaskId, backendBaseUrl]);

  // --------- UI ---------
  return (
    <main
      className={`min-h-screen flex items-center justify-center px-4 py-10 transition-colors ${
        isDark
          ? "bg-slate-900 text-slate-50"
          : "bg-gradient-to-b from-slate-100 to-slate-200 text-slate-900"
      }`}
    >
      <div
        className={`w-full max-w-xl rounded-3xl px-6 py-8 sm:px-8 sm:py-9 shadow-2xl border transition-colors ${
          isDark
            ? "bg-slate-900/80 border-slate-700"
            : "bg-white/90 border-slate-100"
        }`}
      >
        {/* Header */}
        <header className="mb-7 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Social Downloader
            </h1>
            <p
              className={`mt-2 text-sm leading-relaxed ${
                isDark ? "text-slate-300" : "text-slate-500"
              }`}
            >
              نزِّل فيديو أو صوت من منصات السوشيال ميديا بسهولة .
            </p>
          </div>

          <button
            onClick={() =>
              setTheme((prev) => (prev === "dark" ? "light" : "dark"))
            }
            className={`w-10 h-10 rounded-full flex items-center justify-center border text-lg transition ${
              isDark
                ? "bg-slate-800 border-slate-600"
                : "bg-slate-100 border-slate-300"
            }`}
            aria-label="toggle theme"
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </header>

        {/* URL Input */}
        <section>
          <label className="block mb-2 text-sm font-medium">
            رابط الفيديو
          </label>
          <input
            type="text"
            placeholder="مثال: https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={`w-full rounded-2xl px-3.5 py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-sky-400/70 focus:border-sky-400/70 transition border ${
              isDark
                ? "bg-slate-900 border-slate-700 placeholder:text-slate-500 text-slate-50"
                : "bg-slate-50 border-slate-200 placeholder:text-slate-400 text-slate-900"
            }`}
          />

          <button
            onClick={fetchInfo}
            disabled={loadingInfo}
            className={`mt-4 w-full rounded-2xl font-semibold text-sm sm:text-base py-3.5 flex items-center justify-center gap-2 transition ${
              isDark
                ? "bg-sky-500 hover:bg-sky-600 disabled:bg-sky-700"
                : "bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300"
            } text-white`}
          >
            {loadingInfo ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white border-b-transparent animate-spin" />
                جاري جلب التفاصيل...
              </>
            ) : (
              <>
                عرض التفاصيل
                <span>🎬</span>
              </>
            )}
          </button>
        </section>

        {/* Preview Card */}
        {preview && (
          <section
            className={`mt-6 rounded-2xl p-4 sm:p-5 border ${
              isDark
                ? "bg-slate-900/60 border-slate-700"
                : "bg-slate-50/80 border-slate-100"
            }`}
          >
            {preview.thumbnail && (
              <div className="overflow-hidden rounded-xl mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.thumbnail}
                  alt={preview.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            <h2 className="text-base sm:text-lg font-semibold mb-1 line-clamp-2">
              {preview.title}
            </h2>

            <p
              className={`text-xs sm:text-sm mb-3 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              المدة: {formatDuration(preview.duration)}
            </p>

            {/* Qualities */}
            {(preview.video_qualities ?? []).length > 0 && type === "video" && (
              <div className="mt-1">
                <p className="text-xs font-medium mb-2">اختر الجودة:</p>
                <div className="flex flex-wrap gap-2">
                  {(preview.video_qualities ?? []).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(String(q))}
                      className={`px-3 py-1.5 rounded-full text-xs sm:text-sm border transition ${
                        Number(quality) === q
                          ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                          : isDark
                          ? "bg-slate-900 text-slate-200 border-slate-600 hover:bg-slate-800"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {q}p
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* نوع الملف + زر التحميل */}
        <section className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-medium mb-2">نوع الملف:</p>
            <div
              className={`inline-flex rounded-2xl p-1 ${
                isDark ? "bg-slate-800" : "bg-slate-100"
              }`}
            >
              <button
                type="button"
                onClick={() => setType("video")}
                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-medium transition ${
                  type === "video"
                    ? isDark
                      ? "bg-slate-900 text-slate-50 shadow-sm"
                      : "bg-white text-slate-900 shadow-sm"
                    : isDark
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              >
                🎬 فيديو (MP4)
              </button>
              <button
                type="button"
                onClick={() => setType("audio")}
                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-medium transition ${
                  type === "audio"
                    ? isDark
                      ? "bg-slate-900 text-slate-50 shadow-sm"
                      : "bg-white text-slate-900 shadow-sm"
                    : isDark
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              >
                🎵 صوت (MP3)
              </button>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`w-full rounded-2xl font-semibold text-sm sm:text-base py-3.5 flex items-center justify-center gap-2 transition ${
              isDark
                ? "bg-slate-50 text-slate-900 hover:bg-slate-200 disabled:bg-slate-500 disabled:text-slate-100"
                : "bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400"
            }`}
          >
            {isDownloading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-current border-b-transparent animate-spin" />
                جاري التحميل...
              </>
            ) : (
              <>
                تحميل
                <span>⬇️</span>
              </>
            )}
          </button>
        </section>

        {/* شريط التقدم */}
        {downloadProgress > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] mb-1 text-slate-400">
              <span>حالة التحميل</span>
              <span>{Math.round(downloadProgress)}%</span>
            </div>
            <div
              className={`w-full h-2 rounded-full ${
                isDark ? "bg-slate-800" : "bg-slate-200"
              }`}
            >
              <div
                className="h-2 rounded-full bg-sky-500 transition-[width]"
                style={{ width: `${Math.min(downloadProgress, 100)}%` }}
              />
            </div>
          </div>
        )}

        <p
          className={`mt-4 text-[11px] text-center leading-relaxed ${
            isDark ? "text-slate-500" : "text-slate-400"
          }`}
        >
          تمّ التطوير بواسطة عبودي ماجي. كل الحقوق محفوظة © 2024
        </p>
      </div>
    </main>
  );
}
