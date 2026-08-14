import React, { FormEvent, useState } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { isLlmConfigured, LlmProfile } from '../../shared/appPreferences';
import { LlmChatMessage, requestLlmChat } from '../llmClient';

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

interface AssistantPageProps {
  llmSettings: LlmProfile | null;
}

export const AssistantPage: React.FC<AssistantPageProps> = ({ llmSettings }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>(INITIAL_MESSAGES);
  const [isSending, setIsSending] = useState(false);

  const llmConfigured = isLlmConfigured(llmSettings);

  const submitMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    const messageId = Date.now();
    const userMessage: AssistantMessage = { id: `user-${messageId}`, role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');

    if (!llmSettings || !llmConfigured) {
      setMessages([
        ...nextMessages,
        {
          id: `setup-${messageId}`,
          role: 'assistant',
          content: '还没有配置 LLM，请先到“我的”里的 LLM 设置填写服务信息。',
        },
      ]);
      return;
    }

    setIsSending(true);
    try {
      const conversation: LlmChatMessage[] = nextMessages.map(({ role, content: messageContent }) => ({
        role,
        content: messageContent,
      }));
      const response = await requestLlmChat(llmSettings, conversation);
      setMessages((current) => [
        ...current,
        { id: `assistant-${messageId}`, role: 'assistant', content: response },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法连接 LLM，请检查设置后重试。';
      setMessages((current) => [
        ...current,
        { id: `error-${messageId}`, role: 'assistant', content: `连接失败：${message}` },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitMessage(input);
  };

  return (
    <div id="assistant-view-pane" className="flex h-full min-h-0 flex-col gap-4">
      <section className="rounded-3xl border border-[#F2EDE9] bg-white p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E6F0E6] text-[#8FA88B]">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#4A4540]">AI 助手</h2>
              <span className="rounded-full bg-[#E6F0E6] px-2 py-0.5 text-[10px] font-bold text-[#6E876B]">
                {llmConfigured ? '已配置' : '未配置 LLM'}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400">
              先从今天的状态开始聊聊
            </p>
          </div>
        </div>
      </section>

      <section
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-none"
        aria-live="polite"
        aria-label="AI 对话内容"
      >
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

      <div className="shrink-0 -mx-1 bg-[#F9F8F6] py-1">
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
              disabled={isSending}
              className="min-h-12 flex-1 resize-none rounded-2xl bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-[#4A4540] outline-none placeholder:text-gray-400 focus:bg-white"
              aria-label="输入消息"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              aria-label="发送消息"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8FA88B] text-white shadow-md transition-all hover:bg-[#7D9779] active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
            >
              <Send size={17} />
            </button>
          </div>
          {(!llmConfigured || isSending) && (
            <p className="mt-2 px-1 text-[10px] leading-relaxed text-gray-400" aria-live="polite">
              {isSending ? '正在请求 LLM，请稍候…' : '未配置 LLM，配置后即可开始对话。'}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
