import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Cloud,
  Database,
  Download,
  FileJson,
  Leaf,
  LockKeyhole,
  Moon,
  PencilLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { siteContent } from './content';

const webAppUrl = 'https://mood-tracker.jianghong.site/app/';
const androidDownloadUrl = 'https://github.com/leon-claw/mood-tracker/releases';

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (!element) return;
  window.scrollTo({
    top: element.getBoundingClientRect().top + window.scrollY - 78,
    behavior: 'smooth',
  });
};

const SectionHeading = ({
  badge,
  title,
  desc,
  align = 'center',
}: {
  badge: string;
  title: string;
  desc: string;
  align?: 'center' | 'left';
}) => (
  <div className={`section-heading ${align === 'left' ? 'section-heading-left' : ''}`}>
    <span className="eyebrow">{badge}</span>
    <h2>{title}</h2>
    <p>{desc}</p>
  </div>
);

const ProductPreview = () => (
  <div className="product-preview" aria-label="Mood Tracker product preview">
    <div className="preview-shell">
      <div className="preview-topbar">
        <div>
          <span className="preview-kicker">六月报告</span>
          <strong>心情与睡眠</strong>
        </div>
        <div className="preview-date">2026.06</div>
      </div>

      <div className="preview-grid">
        <div className="preview-card preview-card-large">
          <div className="preview-card-title">
            <BarChart3 size={18} />
            <span>心情流</span>
          </div>
          <div className="mood-line">
            {[42, 56, 48, 70, 64, 78, 72].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="preview-caption">7 天平均心情 7.2</div>
        </div>

        <div className="preview-card">
          <div className="preview-card-title">
            <Moon size={18} />
            <span>睡眠质量</span>
          </div>
          <div className="scale-row">
            <b>8</b>
            <span>/10</span>
          </div>
          <div className="soft-track">
            <span />
          </div>
        </div>

        <div className="preview-card">
          <div className="preview-card-title">
            <CalendarDays size={18} />
            <span>日历</span>
          </div>
          <div className="mini-calendar">
            {Array.from({ length: 14 }).map((_, index) => (
              <span key={index} className={index % 3 === 0 || index === 8 ? 'marked' : ''} />
            ))}
          </div>
        </div>
      </div>

      <div className="record-strip">
        <span>🙂 心情 8</span>
        <span>🏃 跑步</span>
        <span>☀️ 晴朗</span>
        <span>🎉 派对</span>
      </div>
    </div>
  </div>
);

const Hero = () => (
  <section id="hero" className="hero-section">
    <div className="hero-backdrop" />
    <div className="site-container hero-content">
      <div className="hero-copy">
        <div className="brand-mark">
          <img src="/app-icon-concept.svg" alt="" />
          <span>Mood Tracker</span>
        </div>
        <h1>
          {siteContent.hero.left}
          <span>{siteContent.hero.accent}</span>
          <em>{siteContent.hero.right}</em>
        </h1>
        <p>{siteContent.hero.subtitle}</p>
        <div className="hero-actions">
          <a className="primary-button" href={webAppUrl}>
            {siteContent.hero.primary}
            <ArrowRight size={18} />
          </a>
          <a className="secondary-button" href={androidDownloadUrl}>
            {siteContent.hero.secondary}
            <Download size={18} />
          </a>
        </div>
        <div className="hero-note">
          <ShieldCheck size={16} />
          <span>默认本地保存，云端同步由你决定。</span>
        </div>
      </div>

      <ProductPreview />
    </div>
  </section>
);

const Navigation = () => (
  <header className="nav-bar">
    <div className="site-container nav-inner">
      <button className="nav-brand" onClick={() => scrollToSection('hero')} aria-label="Mood Tracker 首页">
        <img src="/app-icon-concept.svg" alt="" />
        <span>Mood Tracker</span>
      </button>
      <nav>
        <button onClick={() => scrollToSection('values')}>价值</button>
        <button onClick={() => scrollToSection('method')}>记录模板</button>
        <button onClick={() => scrollToSection('workflow')}>工作流</button>
        <button onClick={() => scrollToSection('platforms')}>下载</button>
      </nav>
    </div>
  </header>
);

const Values = () => (
  <section id="values" className="section section-white">
    <div className="site-container">
      <SectionHeading {...siteContent.values} />
      <div className="value-grid">
        {siteContent.values.list.map((item) => (
          <article className="value-card" key={item.id}>
            <span className="value-id">{item.id}</span>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const Method = () => (
  <section id="method" className="section method-section">
    <div className="site-container method-layout">
      <SectionHeading {...siteContent.method} align="left" />
      <div className="schema-board">
        {siteContent.method.groups.map((group) => (
          <article className={`schema-card schema-${group.id}`} key={group.id}>
            <div className="schema-icon">
              {group.id === 'scale' && <BarChart3 size={22} />}
              {group.id === 'enum' && <Sparkles size={22} />}
              {group.id === 'text' && <PencilLine size={22} />}
            </div>
            <h3>{group.title}</h3>
            <p>{group.desc}</p>
            <div className="tag-list">
              {group.examples.map((example) => (
                <span key={example}>{example}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const Workflow = () => (
  <section id="workflow" className="section section-white">
    <div className="site-container">
      <SectionHeading {...siteContent.workflow} />
      <div className="workflow-grid">
        {siteContent.workflow.steps.map((item) => (
          <article className="workflow-card" key={item.step}>
            <span>{item.step}</span>
            <h3>{item.title}</h3>
            <strong>{item.desc}</strong>
            <p>{item.subText}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const Platforms = () => (
  <section id="platforms" className="section platform-section">
    <div className="site-container">
      <SectionHeading {...siteContent.platforms} />
      <div className="platform-grid">
        {siteContent.platforms.list.map((item, index) => (
          <article className="platform-card" key={item.name}>
            <div className="platform-icon">
              {index === 0 && <Cloud size={24} />}
              {index === 1 && <Download size={24} />}
              {index === 2 && <Database size={24} />}
            </div>
            <div className="platform-title-row">
              <h3>{item.name}</h3>
              <span>{item.badge}</span>
            </div>
            <p>{item.desc}</p>
            {index === 0 && <a href={webAppUrl}>{item.action}</a>}
            {index === 1 && <a href={androidDownloadUrl}>{item.action}</a>}
            {index === 2 && <button disabled>{item.action}</button>}
          </article>
        ))}
      </div>
    </div>
  </section>
);

const Trust = () => (
  <section id="trust" className="section section-white trust-section">
    <div className="site-container trust-layout">
      <div>
        <SectionHeading {...siteContent.trust} align="left" />
        <div className="trust-list">
          {siteContent.trust.list.map((item) => (
            <article key={item.title}>
              <Check size={18} />
              <div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="data-card">
        <div className="data-card-head">
          <FileJson size={22} />
          <span>export.json</span>
        </div>
        <pre>{`{
  "app": "mood-tracker",
  "version": 1,
  "data": {
    "entries": [],
    "points": 0
  }
}`}</pre>
        <div className="data-card-foot">
          <LockKeyhole size={16} />
          <span>导入时自动校验和规范化字段</span>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="footer">
    <div className="site-container footer-inner">
      <div>
        <div className="footer-brand">
          <Leaf size={20} />
          <span>Mood Tracker</span>
        </div>
        <p>把日常状态记录得轻一点，也看得清一点。</p>
      </div>
      <button onClick={() => scrollToSection('hero')}>回到顶部</button>
    </div>
  </footer>
);

export default function App() {
  return (
    <main>
      <Navigation />
      <Hero />
      <Values />
      <Method />
      <Workflow />
      <Platforms />
      <Trust />
      <Footer />
    </main>
  );
}
