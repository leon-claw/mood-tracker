import React, { FormEvent, useState } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';

type AssistantMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

const QUICK_PROMPTS = ['总结今天', '看看我的趋势', '回顾最近情绪'];

const INITIAL_MESSAGES: AssistantMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content: '先从今天的状态开始聊聊吧。你可以告诉我此刻的心情，或者问问最近的记录。',
  },
];

export const AssistantPage: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>(INITIAL_MESSAGES);

  const submitMessage = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const messageId = Date.now();
    setMessages((current) => [
      ...current,
      { id: `user-${messageId}`, role: 'user', content: trimmed },
      {
        id: `placeholder-${messageId}`,
        role: 'assistant',
        content: 'AI 功能接入后会在这里回复。',
      },
    ]);
    setInput('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitMessage(input);
  };

  return (
    <div id="assistant-view-pane" className="flex min-h-full flex-col gap-4 pb-4">
      <section className="rounded-3xl border border-[#F2EDE9] bg-white p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E6F0E6] text-[#8FA88B]">
            <Sparkles size={21} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#4A4540]">AI 助手</h2>
              <span className="rounded-full bg-[#E6F0E6] px-2 py-1 text-[10px] font-bold text-[#6E876B]">
                即将接入
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              先从今天的状态开始聊聊
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-1 flex-col gap-3" aria-live="polite" aria-label="AI 对话内容">
        <div className="flex flex-wrap gap-2 px-1">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              className="rounded-full border border-[#F2EDE9] bg-white px-3 py-2 text-[11px] font-semibold text-gray-500 shadow-xs transition-colors hover:border-[#D8E7D6] hover:bg-[#E6F0E6]/40 hover:text-[#6E876B] active:scale-95"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E6F0E6] text-[#8FA88B]">
                  <MessageCircle size={14} />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-3xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                  message.role === 'user'
                    ? 'rounded-br-lg bg-[#8FA88B] text-white'
                    : 'rounded-bl-lg border border-[#D8E7D6] bg-[#E6F0E6] text-[#4A4540]'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-1 bg-[#F9F8F6]/95 py-1 backdrop-blur-sm">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[#F2EDE9] bg-white p-3 shadow-sm"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="和 AI 聊聊今天..."
              rows={2}
              className="min-h-12 flex-1 resize-none bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-[#4A4540] outline-none placeholder:text-gray-400 focus:bg-white"
              aria-label="输入消息"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="发送消息"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8FA88B] text-white shadow-md transition-all hover:bg-[#7D9779] active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
            >
              <Send size={17} />
            </button>
          </div>
          <p className="mt-2 px-1 text-[10px] leading-relaxed text-gray-400">
            当前为界面预览，AI 服务尚未连接。
          </p>
        </form>
      </div>
    </div>
  );
};
