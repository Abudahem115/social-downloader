export default function Loading() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-slate-400 border-b-transparent animate-spin" />
          <p className="text-sm text-slate-500">جاري تحميل التطبيق...</p>
        </div>
      </div>
    );
  }
  