import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  declare props: Readonly<AppErrorBoundaryProps>;
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Mood Tracker render failed', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#EAE7E2] p-5 text-[#4A4540]">
        <main className="w-full max-w-sm rounded-3xl border border-[#F2EDE9] bg-[#F9F8F6] p-6 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF0ED] text-[#D48166]">
            <AlertTriangle size={24} />
          </div>
          <h1 className="mt-4 text-lg font-bold">页面加载遇到问题</h1>
          <p className="mt-2 text-xs leading-relaxed text-gray-400">
            数据没有丢失。请重新加载应用后继续使用。
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#8FA88B] text-xs font-bold text-white shadow-sm transition-all hover:bg-[#7D9779] active:scale-95"
            >
              <RefreshCw size={15} />
              <span>重新加载</span>
            </button>
          </div>
        </main>
      </div>
    );
  }
}
