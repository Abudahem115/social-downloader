from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from yt_dlp import YoutubeDL
import uuid
import os
import threading

app = FastAPI()

DOWNLOAD_DIR = "downloads"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # عدّلها لاحقاً للدومين حقك
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======= تخزين حالات التحميل (للـ progress) =======
tasks: dict[str, dict] = {}
tasks_lock = threading.Lock()


def update_task(task_id: str, **kwargs):
    with tasks_lock:
        if task_id not in tasks:
            tasks[task_id] = {}
        tasks[task_id].update(kwargs)


# ========= 1) /info — Preview =========
@app.get("/info")
def get_info(url: str):
    try:
        ydl_opts = {
            "quiet": True,
            "skip_download": True,
        }
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        title = info.get("title")
        thumbnail = info.get("thumbnail")
        duration = info.get("duration")

        formats = info.get("formats", [])
        video_qualities = []
        audio_formats = []

        for f in formats:
            if f.get("vcodec") != "none":
                h = f.get("height")
                if h and h not in video_qualities:
                    video_qualities.append(h)

            if f.get("acodec") != "none" and f.get("vcodec") == "none":
                ac = f.get("acodec")
                if ac and ac not in audio_formats:
                    audio_formats.append(ac)

        video_qualities.sort(reverse=True)

        return {
            "title": title,
            "thumbnail": thumbnail,
            "duration": duration,
            "video_qualities": video_qualities,
            "audio_formats": audio_formats,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========= 2) وظيفة داخلية: تنزيل مع hooks =========
def run_download(task_id: str, url: str, type_: str, quality: str):
    try:
        file_id = str(uuid.uuid4())
        outtmpl = os.path.join(DOWNLOAD_DIR, f"{file_id}.%(ext)s")

        def progress_hook(d):
            status = d.get("status")
            if status == "downloading":
                downloaded = d.get("downloaded_bytes") or 0
                total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                if total > 0:
                    progress = (downloaded / total) * 100.0
                else:
                    progress = 0.0
                # نخلي السيرفر يوصل إلى 80% فقط (الباقي fake)
                update_task(task_id, status="downloading", progress=min(progress, 80.0))
            elif status == "finished":
                update_task(task_id, status="processing", progress=85.0)

        common_opts = {
            "outtmpl": outtmpl,
            "progress_hooks": [progress_hook],
        }

        if type_ == "audio":
            ydl_opts = {
                **common_opts,
                "format": "bestaudio/best",
                "postprocessors": [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": "192",
                    }
                ],
            }
        else:
            ydl_opts = {
                **common_opts,
                "format": f"bestvideo[height<={quality}][ext=mp4]+bestaudio[ext=m4a]/best",
                "merge_output_format": "mp4",
            }

        update_task(task_id, status="starting", progress=5.0)

        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # البحث عن الملف الناتج
        file_path = None
        for f in os.listdir(DOWNLOAD_DIR):
            if f.startswith(file_id):
                file_path = os.path.join(DOWNLOAD_DIR, f)
                break

        if not file_path:
            update_task(task_id, status="error", error="File not found")
            return

        update_task(task_id, status="done", progress=90.0, file_path=file_path)

    except Exception as e:
        update_task(task_id, status="error", error=str(e))


# ========= 3) /start-download — بدء التحميل (يرجع task_id) =========
@app.post("/start-download")
def start_download(url: str, type: str = "video", quality: str = "1080"):
    task_id = str(uuid.uuid4())
    update_task(task_id, status="queued", progress=0.0, file_path=None)

    t = threading.Thread(target=run_download, args=(task_id, url, type, quality), daemon=True)
    t.start()

    return {"task_id": task_id}


# ========= 4) /progress/{task_id} — نسبة التحميل =========
@app.get("/progress/{task_id}")
def get_progress(task_id: str):
    with tasks_lock:
        task = tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "status": task.get("status", "unknown"),
        "progress": float(task.get("progress", 0.0)),
        "error": task.get("error"),
    }


# ========= 5) /download-file/{task_id} — تحميل الملف النهائي =========
@app.get("/download-file/{task_id}")
def download_file(task_id: str):
    with tasks_lock:
        task = tasks.get(task_id)
    if not task or task.get("status") != "done" or not task.get("file_path"):
        raise HTTPException(status_code=404, detail="File not ready")

    file_path = task["file_path"]
    filename = os.path.basename(file_path)
    return FileResponse(file_path, filename=filename)
