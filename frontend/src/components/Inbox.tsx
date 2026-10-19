import { useState, useEffect } from 'react';
import { inboxService, type InboxMessage } from '../services/api';

type InboxProps = {
  searchQuery: string;
  setSearchQuery?: (q: string) => void;
  activeTeam?: string | null;
};

export const Inbox = ({ searchQuery, activeTeam }: InboxProps) => {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        // Pass searchQuery to the API call
        const response = await inboxService.getMessages(searchQuery);
        let currentMessages: InboxMessage[] = response.data.items;
        setIsConnected(response.data.connected);

        if (activeTeam) {
            currentMessages = currentMessages.filter((m: InboxMessage) => 
                (m.team || m.user || '').toLowerCase().includes(activeTeam.toLowerCase())
            );
        }
        setMessages(currentMessages);
        setError(null);
      } catch (err) {
        setError('Failed to fetch messages.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [searchQuery, activeTeam]);

  return (
    <div className="flex flex-col h-full min-h-0 max-h-full overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] text-muted mb-1">Inbox</div>
          <div className="text-[17px] font-semibold">All Messages</div>
        </div>
        <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] ${isConnected ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`} />
                <span>{isConnected ? 'Slack Connected' : 'Demo Mode'}</span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-primary/10 text-[10px] text-primary">
            {messages.length}
            </div>
        </div>
      </div>

      {/* MESSAGE LIST */}
      <div className="flex-1 min-h-0 max-h-full space-y-3 overflow-auto">
        {loading ? (
          <div className="text-center py-8 text-muted text-sm animate-pulse">
            Loading messages...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-400 text-sm">
            {error}
          </div>
        ) : messages.length > 0 ? (
          messages.map((m) => (
            <div
              key={m._id || m.id || m.ts} // Handle all ID styles
              className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-3.5 py-3 flex gap-3 text-[11px] hover:-translate-y-0.5 transition-transform duration-200"
            >
              <div className="w-9 h-9 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#FACC15,#F97316_40%,#A855F7_75%)] flex-shrink-0" />
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="text-[12px] font-semibold truncate pr-2">
                    {m.name || m.user}
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-[9px] text-primary flex-shrink-0">
                    {m.tag || (m.team ? m.team : 'General')}
                  </span>
                </div>
                <div className="text-[10px] text-muted mb-1 truncate">
                  Topic: {m.topic || 'No Topic'}
                </div>
                <div className="text-[10px] text-muted line-clamp-2">
                  {m.preview || m.text}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted text-sm">
            {searchQuery
              ? `No messages found for "${searchQuery}"`
              : 'Your inbox is empty.'}
          </div>
        )}
      </div>
    </div>
  );
};