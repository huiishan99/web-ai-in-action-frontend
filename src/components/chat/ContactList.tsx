// src/components/chat/ContactList.tsx
import ContactCard from './ContactCard';

interface Contact {
  name: string;
  avatar: string;
}

export default function ContactList({
  contacts,
  current,
  onSelect,
}: {
  contacts: Contact[];
  current: string;
  onSelect: (name: string) => void;
}) {
  return (
    <aside className="w-60 bg-white border-r p-4 space-y-2">
      <h3 className="text-lg font-bold mb-2">Contact</h3>
      {contacts.map((contact) => (
        <ContactCard
          key={contact.name}
          name={contact.name}
          avatar={contact.avatar}
          selected={contact.name === current}
          onClick={() => onSelect(contact.name)}
        />
      ))}
    </aside>
  );
}
