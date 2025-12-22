'use client';
import { useState } from 'react';
import { Wrench, Activity, ThumbsUp, ThumbsDown, Copy, MoreHorizontal } from 'lucide-react';

const LeftComponent = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'user',
      content: 'use only 2 colors black and white',
      timestamp: '3s ago'
    },
    {
      id: 2,
      type: 'assistant',
      content: 'Perfect! I\'ve completely redesigned the simulation to use only black, white, and grayscale. The design now uses contrast, borders, and typography for visual hierarchy instead of colors.',
      status: 'No issues found',
      workTime: '1m 30s',
      actions: ['Thought for 3s', 'Read current styles', 'Read visualization', 'Read timeline', 'Read event log', 'Read explainer']
    }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, {
        id: messages.length + 1,
        type: 'user',
        content: input,
        timestamp: 'Just now'
      }]);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-screen text-white dark:bg-black">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((message) => (
          <div key={message.id} className="space-y-3">
            {message.type === 'user' ? (
              // User Message
              <div className="flex justify-end">
                <div className="bg-[#171717]  text-white px-4 py-2 rounded-2xl max-w-[80%]">
                  {message.content}
                </div>
              </div>
            ) : (
              // Assistant Message
              <div className="space-y-3">
                {/* Status Icons */}
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    <span>{message.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span>Worked for {message.workTime}</span>
                  </div>
                </div>

                {/* Action Icons */}
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-[#0e0e0e] rounded-lg transition-colors">
                    <ThumbsUp className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-[#0e0e0e] rounded-lg transition-colors">
                    <ThumbsDown className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-[#0e0e0e] rounded-lg transition-colors">
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-[#0e0e0e] rounded-lg transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Thinking Process */}
                {message.actions && (
                  <div className="space-y-2 text-sm text-gray-500">
                    {message.actions.map((action, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-gray-600">🔍</span>
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Content */}
                <div className="bg-[#171717]  rounded-xl p-4">
                  <p className="text-white leading-relaxed">{message.content}</p>
                </div>

                {/* Status Footer */}
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    <span>{message.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span>Worked for {message.workTime}</span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-[#0e0e0e] rounded-lg transition-colors">
                    <ThumbsUp className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-[#0e0e0e] rounded-lg transition-colors">
                    <ThumbsDown className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-[#0e0e0e] rounded-lg transition-colors">
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-[#0e0e0e] rounded-lg transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LeftComponent;