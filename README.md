<p align="center">
  <img src="public/app-icon-concept.svg" alt="Mood Tracker" width="96" height="96" />
</p>

<h1 align="center">Mood Tracker</h1>

<p align="center">
  本地优先、可选云端同步的心情与日常状态记录应用。
</p>

<p align="center">
  <a href="https://mood-tracker.jianghong.site/"><img alt="site" src="https://img.shields.io/badge/site-online-8FA88B" /></a>
  <a href="https://github.com/leon-claw/mood-tracker/releases"><img alt="release" src="https://img.shields.io/github/v/release/leon-claw/mood-tracker?label=release" /></a>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white" />
  <img alt="platform" src="https://img.shields.io/badge/platform-Web%20%7C%20Android-111827" />
</p>

## 它是什么

**Mood Tracker** 是一个用于记录心情、睡眠、精力、活动、天气、社交和随笔的轻量健康日志。它默认不要求注册，数据先保存在当前设备；当你配置后端 API 后，可以登录账号并开启云端同步。

当前支持：

- Web 应用
- Android APK
- 本地模式
- 邮箱密码登录
- 注册图形验证码
- 登录后云端同步
- 私有化服务器
- JSON 导入导出
- 每日打卡提醒
- Android 版本更新提示

核心页面：

- 日志：搜索、筛选、编辑和删除历史记录
- 趋势：查看心情流、心情分布、睡眠质量与心情关系、年度概览
- 日历：按月回看记录，点击日期直接编辑
- 我的：账号、数据导入导出、字段显示、提醒和更新

记录字段分为三类：

- 量表：睡眠质量、心情、精力、饮食健康、工作效率
- 枚举：日常活动、天气、社交、达成成就
- 文本：随笔日志、成就

## 快速开始

你可以直接在线使用：

- 官网首页：<https://mood-tracker.jianghong.site/>
- Web 应用：<https://mood-tracker.jianghong.site/app/>
- Android 下载：<https://github.com/leon-claw/mood-tracker/releases>

不想注册也可以直接使用本地模式。记录会保存在当前设备中；登录后如果本地已有数据，应用会让你选择保留本地数据或使用云端数据，避免两边混在一起。

## 如何开发

准备环境：

- Node.js 20 或更新版本
- pnpm
- Docker Desktop

安装依赖：

```bash
pnpm install
```

启动前端：

```bash
npm run dev
```

默认访问地址：

```text
http://localhost:3000/
```

启动数据库并初始化 Prisma：

```bash
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
```

启动后端：

```bash
npm run server:dev
```

后端默认读取这些环境变量：

```bash
DATABASE_URL="postgresql://mood_tracker:mood_tracker@localhost:5432/mood_tracker"
JWT_SECRET="development-secret-change-me"
CLIENT_ORIGIN="http://localhost:3000"
PORT=4000
```

让前端连接指定后端：

```bash
VITE_API_BASE_URL=http://localhost:4000 npm run dev
```

常用验证命令：

```bash
npm run lint
npm run server:test
npm run build
```

官网首页位于 `site/`，与主应用分开构建：

```bash
npm run site:dev
npm run site:build
```

## 部署

推荐线上路径：

- `/`：官网首页，来自 `site` 构建产物
- `/app/`：主应用，来自根目录主应用构建产物
- `/api/`：后端 API 反向代理

构建主应用：

```bash
npm run build
```

部署到 `/app/` 子路径：

```bash
npm run build:prod
```

生产构建默认使用线上 API 根路径 `https://mood-tracker.jianghong.site/api/`。如果要部署到自己的服务器，可以通过 `VITE_API_BASE_URL` 覆盖。

## Android

Android 端使用 Capacitor 包装同一套 Web 应用。默认构建会带上线上 API 地址，也可以在构建时指定自己的后端。

准备环境：

- Android SDK
- JDK 21

同步 Web 资源到 Android 项目：

```bash
npm run android:sync
```

构建 debug APK：

```bash
npm run android:apk:debug
```

生成文件位于：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

可选 Android 构建变量：

```bash
VITE_ANDROID_APP_VERSION=1.0.3
VITE_ANDROID_UPDATE_URL=https://example.com/latest.json
VITE_API_BASE_URL=https://api.example.com
```

构建 release APK：

```bash
npm run android:apk:release
```

## 项目结构

```text
src/                  主应用源码
src/components/       页面、弹窗、图表和设置组件
shared/               前后端共享偏好设置模型
server/               Node.js + Express 后端
server/prisma/        Prisma schema 和迁移
site/                 官网首页
android/              Capacitor Android 项目
public/               图标、字体和静态资源
```

## 数据格式

导出的 JSON 使用应用级 envelope，方便后续扩展：

```json
{
  "app": "mood-tracker",
  "version": 1,
  "exportedAt": "2026-07-08T00:00:00.000Z",
  "data": {
    "entries": [],
    "points": 0,
    "unlockedItems": [],
    "isPremiumUnlocked": false,
    "preferences": {
      "enabledRecordFieldIds": [],
      "reminders": {
        "enabled": false,
        "times": ["21:00"]
      }
    }
  }
}
```

导入时会校验并规范化字段，非法日期、未知枚举和越界量表值不会直接污染应用数据。

## License

暂未添加 License 文件。
