// src/components/home/QuickMatch.tsx
import { Send } from 'lucide-react';

export default function QuickMatch() {
  return (
    <aside className="w-48 bg-white p-4 rounded-xl shadow space-y-4 h-fit">
      <h3 className="text-lg font-bold mb-2 text-gray-900">Quick match</h3>

      {/* QuickMatch三个按钮 */}
      <div className="bg-gray-100 p-3 rounded-md flex justify-center">
        <Send />
      </div>
      <div className="bg-red-100 p-3 rounded-md flex justify-center">
        <Send />
      </div>
      <div className="bg-green-100 p-3 rounded-md flex justify-center">
        <Send />
      </div>
    </aside>
  );
}
