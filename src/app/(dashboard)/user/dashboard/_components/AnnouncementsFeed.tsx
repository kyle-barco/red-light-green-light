import { getAnnouncements } from "@/actions/announcements";
import { Megaphone } from "lucide-react";

export default async function AnnouncementsFeed() {
  const announcements = await getAnnouncements(5);

  if (announcements.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-amber-50/50">
        <Megaphone className="w-4 h-4 text-amber-600" />
        <h3 className="text-sm font-bold text-amber-800">Announcements</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {announcements.map((a) => (
          <div key={a.id} className={`px-5 py-3 ${!a.read ? "bg-blue-50/30" : ""}`}>
            <div className="flex items-start gap-2">
              {!a.read && (
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
              )}
              <div className={`min-w-0 ${a.read ? "ml-4" : ""}`}>
                <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(a.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
