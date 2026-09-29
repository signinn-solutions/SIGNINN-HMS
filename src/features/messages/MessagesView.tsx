import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  Search,
  CheckCheck,
  Zap,
  Sparkles,
  Bot,
  Wifi,
  Star,
  Settings,
} from 'lucide-react';
import { MessageThread } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../stores/useAppStore';

export interface MessagesViewProps {
  threads: MessageThread[];
  onSendMessage: (threadId: string, content: string) => Promise<void>;
}

export const MessagesView: React.FC<MessagesViewProps> = ({ threads, onSendMessage }) => {
  const { showToast } = useToast();
  const property = useAppStore((state) => state.currentProperty);
  const [selectedThreadId, setSelectedThreadId] = useState<string>(threads[0]?.id || '');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoWelcome, setAutoWelcome] = useState(true);
  const [autoWifi, setAutoWifi] = useState(true);
  const [autoReview, setAutoReview] = useState(true);

  const selectedThread = threads.find((t) => t.id === selectedThreadId) || threads[0];

  const filteredThreads = threads.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.guestName.toLowerCase().includes(q) ||
      t.guestPhone.includes(q) ||
      (t.roomNumber && t.roomNumber.includes(q))
    );
  });

  const handleSend = async () => {
    if (!inputText.trim() || !selectedThread) return;
    const text = inputText;
    setInputText('');
    await onSendMessage(selectedThread.id, text);
    showToast({
      title: 'WhatsApp Dispatched',
      description: `Message sent to ${selectedThread.guestName} (${selectedThread.guestPhone}).`,
      type: 'success',
    });
  };

  const applyTemplate = (tmpl: string) => {
    setInputText(tmpl);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-bold tracking-tight text-gray-950 font-sans">
              Guest WhatsApp & Omnichannel Inbox
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              WhatsApp Business API
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Automated pre-arrival guides, WiFi credentials, mid-stay feedback, and instant front desk chat.
          </p>
        </div>

        {/* Automation Status Strip */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <label className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={autoWifi}
              onChange={(e) => setAutoWifi(e.target.checked)}
              className="rounded text-emerald-600"
            />
            <span className="text-gray-700 font-medium">Auto-WiFi on Check-in</span>
          </label>

          <label className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={autoReview}
              onChange={(e) => setAutoReview(e.target.checked)}
              className="rounded text-emerald-600"
            />
            <span className="text-gray-700 font-medium">Post-Checkout Review Link</span>
          </label>
        </div>
      </div>

      {/* Chat Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[620px]">
        {/* Left Column: Guest Threads List */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 shadow-2xs flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredThreads.map((thread) => {
              const isSelected = thread.id === selectedThread?.id;
              const lastMsg = thread.messages[thread.messages.length - 1];

              return (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`p-3.5 hover:bg-gray-50 transition-colors cursor-pointer text-left ${
                    isSelected ? 'bg-blue-50/60 border-l-3 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-950 truncate">{thread.guestName}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {lastMsg?.timestamp.slice(11, 16)}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-500 mt-0.5 flex items-center justify-between">
                    <span>
                      {thread.roomNumber ? `Room ${thread.roomNumber}` : 'Upcoming Guest'} •{' '}
                      {thread.channel}
                    </span>
                    {thread.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 mt-1 truncate">{lastMsg?.content}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chat History & Composer */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 shadow-2xs flex flex-col overflow-hidden">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-950 flex items-center gap-2">
                    {selectedThread.guestName}
                    <span className="text-[10px] font-normal text-gray-500 font-mono">
                      ({selectedThread.guestPhone})
                    </span>
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    {selectedThread.roomNumber
                      ? `In-House • Room ${selectedThread.roomNumber}`
                      : 'Arriving Today'}{' '}
                    • Ref: {selectedThread.reservationRef}
                  </span>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> WhatsApp Live
                </span>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f2f5]/40">
                {selectedThread.messages.map((msg) => {
                  const isGuest = msg.sender === 'guest';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isGuest ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-md p-3 rounded-2xl text-xs shadow-2xs ${
                          isGuest
                            ? 'bg-white text-gray-900 rounded-tl-xs border border-gray-200'
                            : 'bg-emerald-600 text-white rounded-tr-xs'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div
                          className={`mt-1 text-[9px] flex items-center justify-end gap-1 ${
                            isGuest ? 'text-gray-400' : 'text-emerald-100'
                          }`}
                        >
                          <span>{msg.timestamp.slice(11, 16)}</span>
                          {!isGuest && <CheckCheck className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Reply Template Chips */}
              <div className="p-2 bg-gray-50 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1 shrink-0">
                  Quick Reply:
                </span>
                <button
                  onClick={() =>
                    applyTemplate(
                      `Welcome to ${property?.name || 'our property'}! Please contact reception for the current WiFi network and password.`
                    )
                  }
                  className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-[11px] text-gray-700 hover:bg-gray-100 shrink-0 cursor-pointer"
                >
                  <Wifi className="w-3 h-3 inline mr-1 text-blue-600" /> Send WiFi Credentials
                </button>
                <button
                  onClick={() =>
                    applyTemplate(
                      'Complimentary buffet breakfast is served at our Ground Floor Cafe from 7:30 AM to 10:30 AM.'
                    )
                  }
                  className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-[11px] text-gray-700 hover:bg-gray-100 shrink-0 cursor-pointer"
                >
                  Breakfast Timings
                </button>
                <button
                  onClick={() =>
                    applyTemplate(
                      'Standard checkout is at 11:00 AM. If you require late checkout or luggage storage, please notify us.'
                    )
                  }
                  className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-[11px] text-gray-700 hover:bg-gray-100 shrink-0 cursor-pointer"
                >
                  Checkout Notice
                </button>
                <button
                  onClick={() =>
                    applyTemplate(
                      `Thank you for staying with ${property?.name || 'our property'}! We hope you enjoyed your visit.`
                    )
                  }
                  className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-[11px] text-gray-700 hover:bg-gray-100 shrink-0 cursor-pointer"
                >
                  <Star className="w-3 h-3 inline mr-1 text-amber-500" /> Google Review Link
                </button>
              </div>

              {/* Message Composer */}
              <div className="p-3 border-t border-gray-200 flex items-center gap-2 bg-white">
                <input
                  type="text"
                  placeholder="Type a WhatsApp message to guest..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-600 font-medium"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSend}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                  className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                >
                  Send
                </Button>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-gray-500">Select a conversation thread.</div>
          )}
        </div>
      </div>
    </div>
  );
};
