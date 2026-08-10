package com.moodtracker.app.autodata;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONObject;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.concurrent.TimeUnit;

public class AutoDataWorker extends Worker {
    public static final String UNIQUE_WORK_NAME = "mood_tracker_auto_data_periodic";
    private static final String LOG_TAG = "MoodTrackerAutoData";
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    public AutoDataWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        Set<String> enabledModules = AutoDataPlugin.readEnabledModuleSet(context);
        if (enabledModules.isEmpty()) return Result.success();

        String date = LocalDate.now(ZoneId.systemDefault()).format(DATE_FORMAT);
        AutoDataQueue queue = new AutoDataQueue(context);

        if (enabledModules.contains("autoSteps")) {
            try {
                JSONObject steps = StepsCollector.collect(context, date);
                if (steps != null) queue.merge(date, "steps", steps.toString());
            } catch (Exception exception) {
                Log.w(LOG_TAG, "Step collection failed", exception);
            }
        }
        if (enabledModules.contains("autoScreenTime")) {
            try {
                JSONObject screenTime = ScreenTimeCollector.collect(context, date);
                if (screenTime != null) queue.merge(date, "screenTime", screenTime.toString());
            } catch (Exception exception) {
                Log.w(LOG_TAG, "Screen-time collection failed", exception);
            }
        }
        if (enabledModules.contains("autoWeather")) {
            try {
                JSONObject weather = WeatherCollector.collect(context, date);
                if (weather != null) queue.merge(date, "weather", weather.toString());
            } catch (Exception exception) {
                Log.w(LOG_TAG, "Weather collection failed", exception);
            }
        }
        return Result.success();
    }

    public static void schedule(Context context, Set<String> enabledModules) {
        WorkManager workManager = WorkManager.getInstance(context.getApplicationContext());
        if (enabledModules.isEmpty()) {
            workManager.cancelUniqueWork(UNIQUE_WORK_NAME);
            return;
        }

        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
            AutoDataWorker.class,
            60,
            TimeUnit.MINUTES
        ).setInitialDelay(1, TimeUnit.MINUTES).build();
        workManager.enqueueUniquePeriodicWork(
            UNIQUE_WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            request
        );
    }
}
