// src/components/chat/ContactCard.tsx
import Image from 'next/image';

export default function ContactCard({
  name,
  avatar,
  selected,
  onClick,
}: {
  name: string;
  avatar: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3 flex items-center gap-3 rounded-md cursor-pointer border shadow-sm transition ${
        selected ? 'bg-blue-100 font-semibold' : 'hover:bg-gray-100'
      }`}
    >
      <Image src={avatar} alt="avatar" width={32} height={32} className="w-8 h-8 rounded-full" />
      <p className="text-sm">{name}</p>
    </div>
  );
}
