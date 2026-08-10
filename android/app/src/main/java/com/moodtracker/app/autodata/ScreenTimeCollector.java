package com.moodtracker.app.autodata;

import android.app.AppOpsManager;
import android.app.usage.EventStats;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.app.usage.UsageEvents;
import android.content.Context;
import android.os.Build;
import android.os.Process;

import org.json.JSONException;
import org.json.JSONObject;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

public final class ScreenTimeCollector {
    private ScreenTimeCollector() {}

    public static JSONObject collect(Context context, String date) throws JSONException {
        if (!hasUsageAccess(context)) return null;
        LocalDate localDate = LocalDate.parse(date);
        ZoneId zone = ZoneId.systemDefault();
        long start = localDate.atStartOfDay(zone).toInstant().toEpochMilli();
        long end = Math.min(
            localDate.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli(),
            System.currentTimeMillis()
        );
        if (end <= start) return null;

        UsageStatsManager manager = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
        if (manager == null) return null;
        boolean screenInteractiveMetric = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P;
        long usageMillis = screenInteractiveMetric
            ? queryScreenInteractiveMillis(manager, start, end)
            : queryForegroundAppMillis(manager, start, end);

        JSONObject result = new JSONObject();
        result.put("minutes", Math.max(0, Math.round(usageMillis / 60000d)));
        result.put("metric", screenInteractiveMetric ? "screen-interactive" : "foreground-apps");
        result.put("collectedAt", Instant.now().toString());
        result.put("isFinal", !LocalDate.now(zone).equals(localDate));
        return result;
    }

    private static long queryScreenInteractiveMillis(UsageStatsManager manager, long start, long end) {
        List<EventStats> stats = manager.queryEventStats(UsageStatsManager.INTERVAL_DAILY, start, end);
        long interactiveMillis = 0;
        if (stats != null) {
            for (EventStats eventStats : stats) {
                if (eventStats.getEventType() == UsageEvents.Event.SCREEN_INTERACTIVE) {
                    interactiveMillis += Math.max(0, eventStats.getTotalTime());
                }
            }
        }
        return interactiveMillis;
    }

    private static long queryForegroundAppMillis(UsageStatsManager manager, long start, long end) {
        List<UsageStats> stats = manager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end);
        long foregroundMillis = 0;
        if (stats != null) {
            for (UsageStats usageStats : stats) foregroundMillis += usageStats.getTotalTimeInForeground();
        }
        return foregroundMillis;
    }

    private static boolean hasUsageAccess(Context context) {
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) return false;
        return appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.getPackageName()
        ) == AppOpsManager.MODE_ALLOWED;
    }
}
