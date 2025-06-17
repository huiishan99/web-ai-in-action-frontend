// src/app/rooms/page.tsx
import Sidebar from '@/components/Sidebar';
import RoomCard from '@/components/rooms/RoomCard';

const roomList = [
  {
    id: 'neutral',
    title: 'Neutral 茶房',
    description: '来一杯茶，静静说话',
    color: 'bg-gray-100',
  },
  {
    id: 'positive',
    title: 'Positive KTV',
    description: '分享喜悦与快乐 🎤',
    color: 'bg-yellow-100',
  },
  {
    id: 'negative',
    title: 'Negative 冥想室',
    description: '释放压力，听你倾诉',
    color: 'bg-blue-100',
  },
];

export default function RoomsPage() {
  return (
    <main className="flex">
      <Sidebar />
      <section className="flex-1 p-8 bg-[#f9fafb]">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">主题交流房</h1>
        <div className="grid grid-cols-3 gap-6">
          {roomList.map((room) => (
            <RoomCard key={room.id} {...room} />
          ))}
        </div>
      </section>
    </main>
  );
}
