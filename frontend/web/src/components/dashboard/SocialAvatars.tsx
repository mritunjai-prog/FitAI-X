

export default function SocialAvatars() {
  const friends = [
    { id: 1, name: 'David M.', img: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', status: 'online' },
    { id: 2, name: 'Sarah J.', img: 'https://i.pravatar.cc/150?u=a042581f4e29026704e', status: 'online' },
    { id: 3, name: 'Emma', img: 'https://i.pravatar.cc/150?u=a042581f4e29026704f', status: 'offline' },
    { id: 4, name: 'Jessica', img: 'https://i.pravatar.cc/150?u=a042581f4e29026704g', status: 'online' },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3 pt-1 px-2 w-full">
      {friends.map((friend) => (
        <div key={friend.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
          <div className="relative">
            <div className="w-14 h-14 rounded-full p-0.5 border-2 border-gold flex items-center justify-center">
              <img src={friend.img} alt={friend.name} className="w-full h-full rounded-full object-cover border-2 border-card" />
            </div>
            {friend.status === 'online' && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-green border-2 border-card rounded-full"></div>
            )}
            {friend.status === 'offline' && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-gold border-2 border-card rounded-full"></div>
            )}
          </div>
          <span className="text-[10px] font-bold text-text-secondary group-hover:text-text-primary transition-colors">{friend.name}</span>
        </div>
      ))}
    </div>
  );
}
