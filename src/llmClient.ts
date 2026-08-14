import { LlmProfile } from '../shared/appPreferences';

export type LlmChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type LlmChatResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  error?: {
    message?: unknown;
  };
};

const getErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as LlmChatResponse;
    if (typeof payload.error?.message === 'string' && payload.error.message.trim()) {
      return payload.error.message.trim();
    }
  } catch {
    // Fall back to the HTTP status when the service does not return JSON.
  }

  return `LLM 请求失败（HTTP ${response.status}）。`;
};

export const requestLlmChat = async (
  settings: LlmProfile,
  messages: LlmChatMessage[],
  fetchImpl: typeof fetch = fetch
) => {
  const baseUrl = settings.baseUrl.trim().replace(/\/+$/, '');
  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.apiKey.trim() ? { Authorization: `Bearer ${settings.apiKey.trim()}` } : {}),
    },
    body: JSON.stringify({
      model: settings.model.trim(),
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload = (await response.json()) as LlmChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('LLM 返回内容为空。');
  }

  return content.trim();
};
