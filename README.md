1) Run the Backend (FastAPI + yt-dlp)

Requirements:
Python 3.10+
pip installed

Steps
1) Go to the backend folder:
cd social-downloader-backend

2) Create and activate a virtual environment:

Windows:
python -m venv venv
venv\Scripts\activate

Mac / Linux:
python3 -m venv venv
source venv/bin/activate

3) Install dependencies:
pip install -r requirements.txt

4) Run the FastAPI server:
uvicorn main:app --reload

🔗 Backend is now running at:
http://127.0.0.1:8000

2) Run the Frontend (Next.js)
Requirements

Node.js (latest version)

npm

Steps
1) Go to the frontend folder:
cd social-downloader-frontend

2) Install dependencies:
npm install

3) Start the development server:
npm run dev

🔗 Frontend is now running at:
http://localhost:3000


And it will connect to your backend if you set:

const backendBaseUrl = "http://127.0.0.1:8000";

3) Run the Whole Project
1. Open Terminal #1 → Run Backend:
uvicorn main:app --reload

2. Open Terminal #2 → Run Frontend:
npm run dev

3. Open browser:
http://localhost:300