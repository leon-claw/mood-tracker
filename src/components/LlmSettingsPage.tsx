import React, { FormEvent, useState } from 'react';
import { Check, ChevronLeft, Cpu, KeyRound, Link2, Plus, Save } from 'lucide-react';
import {
  createLlmProfileId,
  LlmPreferences,
  LlmProfile,
} from '../../shared/appPreferences';

export interface LlmSettingsPageProps {
  settings: LlmPreferences;
  onBack: () => void;
  onSave: (profile: LlmProfile) => void;
  onSelectProfile: (profileId: string) => void;
}

const inputClassName =
  'mt-2 w-full rounded-2xl border border-[#F2EDE9] bg-gray-50 px-4 py-3 text-xs text-[#4A4540] outline-none transition-colors placeholder:text-gray-400 focus:border-[#A9C2A5] focus:bg-white';

const createEmptyProfile = (): LlmProfile => ({
  id: '',
  name: '',
  baseUrl: '',
  model: '',
  apiKey: '',
});

export const LlmSettingsPage: React.FC<LlmSettingsPageProps> = ({
  settings,
  onBack,
  onSave,
  onSelectProfile,
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(settings.activeProfileId);
  const [draft, setDraft] = useState<LlmProfile>(() =>
    settings.profiles.find((profile) => profile.id === settings.activeProfileId) || createEmptyProfile()
  );
  const [isSaved, setIsSaved] = useState(false);

  const updateDraft = (key: keyof LlmProfile, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setIsSaved(false);
  };

  const handleSelectProfile = (profile: LlmProfile) => {
    setSelectedProfileId(profile.id);
    setDraft(profile);
    setIsSaved(false);
    onSelectProfile(profile.id);
  };

  const handleCreateProfile = () => {
    setSelectedProfileId(null);
    setDraft(createEmptyProfile());
    setIsSaved(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const profile = {
      ...draft,
      id: draft.id || createLlmProfileId(),
      name: draft.name.trim() || draft.model.trim() || '未命名配置',
      baseUrl: draft.baseUrl.trim(),
      model: draft.model.trim(),
      apiKey: draft.apiKey.trim(),
    };
    setSelectedProfileId(profile.id);
    setDraft(profile);
    onSave(profile);
    setIsSaved(true);
  };

  return (
    <div id="llm-settings-pane" className="flex flex-col gap-4 pb-12">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#F2EDE9] bg-white text-gray-500 shadow-xs transition-all hover:text-[#8FA88B] active:scale-95"
          aria-label="返回我的"
        >
          <ChevronLeft size={19} />
        </button>
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#4A4540]">
            <span>LLM 设置</span>
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">配置后即可在 AI 页面开始对话</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-[#F2EDE9] bg-white shadow-xs">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-[#4A4540]">已保存配置</h3>
            <p className="mt-1 text-[10px] text-gray-400">点击配置即可切换 AI 服务</p>
          </div>
          <button
            type="button"
            onClick={handleCreateProfile}
            className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-[#D8E7D6] bg-[#E6F0E6]/50 px-3 text-[10px] font-bold text-[#6E876B] transition-colors hover:bg-[#E6F0E6] active:scale-95"
          >
            <Plus size={13} />
            <span>新建配置</span>
          </button>
        </div>
        {settings.profiles.length > 0 ? (
          <div className="border-t border-[#F2EDE9]">
            {settings.profiles.map((profile) => {
              const isActive = profile.id === selectedProfileId;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleSelectProfile(profile)}
                  aria-pressed={isActive}
                  className={`flex min-h-[72px] w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors active:bg-[#E6F0E6]/60 ${
                    isActive ? 'bg-[#E6F0E6]/45' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                      isActive ? 'bg-[#8FA88B] text-white' : 'bg-gray-50 text-[#8FA88B]'
                    }`}>
                      <Cpu size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-[#4A4540]">{profile.name}</span>
                      <span className="mt-1 block truncate font-mono text-[10px] text-gray-400">{profile.model || '未填写模型'}</span>
                    </span>
                  </span>
                  {isActive && (
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#6E876B]">
                      当前
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="border-t border-[#F2EDE9] px-5 py-4 text-xs text-gray-400">还没有保存的配置。</p>
        )}
      </section>

      <div className="rounded-2xl border border-[#D8E7D6] bg-[#E6F0E6]/55 px-4 py-3 text-xs leading-relaxed text-[#6E876B]">
        支持 OpenAI-compatible 接口。配置只保存在当前设备，不会上传到 Mood Tracker 服务。
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-3xl border border-[#F2EDE9] bg-white p-5 shadow-xs"
      >
        <label className="text-xs font-semibold text-[#4A4540]">
          <span className="flex items-center gap-1.5">
            <Cpu size={15} className="text-[#8FA88B]" />
            配置名称
          </span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => updateDraft('name', event.target.value)}
            placeholder="例如：本地 DeepSeek"
            className={inputClassName}
            autoComplete="off"
            aria-label="配置名称"
          />
        </label>

        <label className="text-xs font-semibold text-[#4A4540]">
          <span className="flex items-center gap-1.5">
            <Link2 size={15} className="text-[#8FA88B]" />
            API 地址
          </span>
          <input
            type="url"
            value={draft.baseUrl}
            onChange={(event) => updateDraft('baseUrl', event.target.value)}
            placeholder="例如 https://api.example.com/v1"
            className={inputClassName}
            autoComplete="url"
            aria-label="API 地址"
          />
        </label>

        <label className="text-xs font-semibold text-[#4A4540]">
          <span className="flex items-center gap-1.5">
            <Cpu size={15} className="text-[#8FA88B]" />
            模型名称
          </span>
          <input
            type="text"
            value={draft.model}
            onChange={(event) => updateDraft('model', event.target.value)}
            placeholder="例如 DeepSeek-V4-Flash"
            className={inputClassName}
            autoComplete="off"
            aria-label="模型名称"
          />
        </label>

        <label className="text-xs font-semibold text-[#4A4540]">
          <span className="flex items-center gap-1.5">
            <KeyRound size={15} className="text-[#D48166]" />
            API Key
          </span>
          <input
            type="password"
            value={draft.apiKey}
            onChange={(event) => updateDraft('apiKey', event.target.value)}
            placeholder="sk-......"
            className={inputClassName}
            autoComplete="off"
            aria-label="API Key"
          />
        </label>

        <button
          type="submit"
          className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#8FA88B] text-xs font-bold text-white shadow-md transition-all hover:bg-[#7D9779] active:scale-95"
        >
          {isSaved ? <Check size={15} /> : <Save size={15} />}
          <span>{isSaved ? '已保存' : '保存配置'}</span>
        </button>
      </form>
    </div>
  );
};
