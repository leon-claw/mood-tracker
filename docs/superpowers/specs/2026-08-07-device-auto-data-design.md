# 设备自动数据模块设计

## 目标

为 Mood Tracker Android 版本增加三个可选的设备自动数据模块：今日步数、今日天气、设备使用时间。三个模块进入现有“记录模块设置”页面，用户开启某个字段后才采集对应数据；关闭后不显示、不采集、不请求对应权限或 API。

## 已确认的产品规则

- 三个模块的字段 ID 为 `autoSteps`、`autoWeather`、`autoScreenTime`。
- 三个字段使用结构化自动数据保存，不使用字符串作为数据源。
- 界面使用只读字段，并通过格式化器生成中文显示文本。
- 现有 `enabledRecordFieldIds` 是唯一的模块开关来源，不增加第二套采集开关。
- 新增自动字段默认关闭；旧用户升级后也不自动开启。
- 隐藏/关闭模块不会删除历史数据。
- 今日天气使用 Open-Meteo；位置只作为临时请求参数，不展示、不保存。
- 天气每天最多成功采集一次。
- 步数和设备使用时间通过 Android 后台定时任务采集并更新当天累计值。
- Android 后台采集使用 WorkManager；任务实际执行时间允许受系统电池优化和 vivo 后台策略影响。
- 应用重新打开时，会从原生暂存队列合并后台采集结果到 Web 数据层。
- Web 版本不执行 Android 设备采集。

## 数据模型

手动记录与自动数据分离：

```ts
interface LogEntry {
  id: string;
  date: string;
  values: LogValues;
  autoData?: AutoData;
}

interface AutoData {
  steps?: {
    count: number;
    source: 'health-connect' | 'step-sensor';
    collectedAt: string;
    isFinal: boolean;
  };
  weather?: {
    weatherCode: number;
    temperatureC?: number;
    humidityPercent?: number;
    precipitationMm?: number;
    provider: 'open-meteo';
    collectedAt: string;
  };
  screenTime?: {
    minutes: number;
    collectedAt: string;
    isFinal: boolean;
  };
}
```

三个字段定义使用自动字段类型：

```ts
interface AutomaticFieldDefinition extends BaseFieldDefinition {
  type: 'automatic';
  module: 'steps' | 'weather' | 'screenTime';
  valueType: 'number' | 'weather' | 'duration';
  readOnly: true;
}
```

## 采集架构

前端通过 Capacitor 自定义 `AutoData` 插件配置启用模块、读取权限状态、请求模块权限和提取原生暂存结果。

Android 原生层包含：

- `AutoDataPlugin`：WebView 与原生层的桥接；
- `AutoDataWorker`：WorkManager 周期任务；
- `StepsCollector`：Health Connect 优先、步数传感器回退；
- `ScreenTimeCollector`：UsageStatsManager；
- `WeatherCollector`：粗略后台位置 + Open-Meteo，丢弃位置；
- `AutoDataQueue`：SharedPreferences 中的待合并结果队列。

后台任务不直接访问 WebView 的 `localStorage`。它把结果写入原生暂存队列，应用启动或回到前台时由插件取出并合并到本地记录，再走现有云同步机制。

## 开关和权限

`enabledRecordFieldIds` 同时控制：

| 字段状态 | 显示 | 采集 | 权限/API |
|---|---:|---:|---:|
| 关闭 | 否 | 否 | 不请求 |
| 开启且权限缺失 | 是 | 暂停 | 只请求该模块 |
| 开启且权限完整 | 是 | 是 | 按计划执行 |

需要的权限：

- 步数：`ACTIVITY_RECOGNITION`、Health Connect 的步数读取权限和后台读取权限；
- 天气：粗略定位、后台定位；
- 使用时间：`PACKAGE_USAGE_STATS` 特殊访问。

## 记录和同步

- 自动采集成功时，若当天没有手动记录，可以创建仅含 `autoData` 的当天记录。
- 自动记录不增加手动打卡积分。
- 之后保存手动记录时，合并同一天的 `values` 与 `autoData`。
- Prisma `LogEntry` 增加可空 `autoData Json` 字段。
- 客户端、本地导入导出、服务端同步和月份查询都保留 `autoData`。
- 缺少 `autoData` 的旧数据继续正常读取。

## 失败处理

- 每个模块独立返回成功、不可用、缺少权限或错误状态。
- 一个模块失败不阻塞其他模块。
- 天气失败不会写入位置。
- 后台任务失败时保留上一次成功值，并在后续任务或应用前台时重试。
- 用户关闭模块后，后台任务再次运行前必须重新检查开关，不能继续写入该模块。

## 验收标准

- 新自动字段默认不在启用字段列表中。
- 开启步数后才申请并读取步数数据；关闭后不再读取。
- 开启天气后才申请后台定位和调用 Open-Meteo；关闭后不调用。
- 开启使用时间后才读取 UsageStats；关闭后不读取。
- 自动数据使用数字/对象保存，界面只通过格式化器显示文本。
- 历史数据、JSON 导入导出和云端同步兼容旧版本。
- Android 设备上能够验证权限、WorkManager、原生队列和 WebView 合并流程。
