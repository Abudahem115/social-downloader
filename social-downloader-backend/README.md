# 🎬 Social Downloader — FastAPI Backend

This is the backend API for the **Social Downloader** project.  
It provides endpoints for:

- Fetching video metadata (`/info`)
- Downloading audio/video files (`/download`)
- Proxying YouTube requests using `yt-dlp`
- Using real YouTube account cookies (optional, recommended)

The backend is built using **FastAPI**, deployed on **Render**,  
and communicates with the Next.js frontend.

---

## 🚀 Getting Started

Clone the repository:

```bash
git clone https://github.com/yourname/social-downloader-backend.git
cd social-downloader-backend

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt

to run 
uvicorn main:app --reload

