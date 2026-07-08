<p align="center">
  <img src="public/app-icon-concept.svg" alt="Mood Tracker" width="96" height="96" />
</p>

<h1 align="center">Mood Tracker</h1>

<p align="center">
  一个本地优先、可选云端同步的心情与日常状态记录应用。
</p>

<p align="center">
  <a href="https://github.com/leon-claw/mood-tracker"><img alt="repo" src="https://img.shields.io/badge/repo-private-111827" /></a>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white" />
  <img alt="platform" src="https://img.shields.io/badge/platform-Web%20%7C%20Android-111827" />
</p>

## 它是什么

**Mood Tracker** 是一个围绕“心情、睡眠质量、日常活动和个人记录”设计的轻量健康日志应用。它默认使用本地数据，不强制登录；当配置后端 API 后，可以开启邮箱密码账号、图形验证码注册、云端同步、修改密码和退出登录。

当前支持：

- 本地优先记录，未登录时数据保存在当前设备
- 邮箱 + 密码账号，注册时使用简单图形验证码
- 登录后在本地数据和云端数据之间二选一，避免两处数据混用
- 日志、趋势、日历、我的四个主页面
- 月视图日历，点击某日可新建或编辑当天记录
- 趋势报告图表，基于真实记录展示心情流、心情分布、睡眠质量与心情关系
- JSON 数据导入导出
- Capacitor Android 壳，支持构建 debug / release APK

记录字段采用可扩展模板，目前包含：

- 量表：睡眠质量、心情等级、精力、饮食健康、工作效率
- 枚举：今日日常活动、天气、社交、达成成就
- 文本：随笔日志、成就

## 快速开始

本项目可以只跑前端，本地数据会直接保存在浏览器 `localStorage` 中。

准备环境：

- Node.js 20 或更新版本
- pnpm

安装依赖并启动前端：

```bash
pnpm install
npm run dev
```

默认访问地址：

```text
http://localhost:3000/
```

## 后端与云端同步

后端是 Node.js + Express + Prisma + PostgreSQL。它提供账号、验证码、会话、记录同步、JSON 导入导出等 API。

准备环境：

- Docker Desktop
- PostgreSQL，推荐直接使用 `docker-compose.yml`

创建本地 `.env`：

```bash
DATABASE_URL="postgresql://mood_tracker:mood_tracker@localhost:5432/mood_tracker"
JWT_SECRET="change-this-development-secret"
CLIENT_ORIGIN="http://localhost:3000"
PORT=4000
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

前端需要显式配置 API 地址后才会显示云端账号入口：

```bash
VITE_API_BASE_URL=http://localhost:4000 npm run dev
```

## Android APK

Android 端使用 Capacitor 包装同一套 Web 应用。默认构建保持本地优先；只有在构建时提供 `VITE_API_BASE_URL`，账号和云端同步入口才会显示。

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
VITE_ANDROID_APP_VERSION=1.0.0
VITE_ANDROID_UPDATE_URL=https://example.com/latest.json
VITE_API_BASE_URL=https://api.example.com
```

构建 release APK 前，需要在本机配置并妥善备份 release keystore，然后运行：

```bash
npm run android:apk:release
```

## 常用命令

```bash
npm run dev
npm run build
npm run lint
npm run server:dev
npm run server:test
npm run android:apk:debug
```

## 项目结构

```text
src/                  Web 应用源码
src/components/       页面组件、弹窗、图表组件
src/fieldSchema.ts    记录字段模板
server/               Node.js 后端
server/prisma/        Prisma 数据库模型
android/              Capacitor Android 项目
public/               图标、字体和静态资源
```

## 数据格式

JSON 导出格式使用应用级 envelope，便于后续扩展：

```json
{
  "app": "mood-tracker",
  "version": 1,
  "exportedAt": "2026-07-08T00:00:00.000Z",
  "data": {
    "entries": [],
    "points": 0,
    "unlockedItems": [],
    "isPremiumUnlocked": false
  }
}
```

导入时会校验并规范化字段，非法日期、未知枚举和越界量表值不会直接污染应用数据。

## License

暂未添加 License 文件。
