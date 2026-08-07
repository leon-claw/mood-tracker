package com.moodtracker.app.autodata;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

public final class StepsCollector {
    private static final String PREFERENCES_NAME = "mood_tracker_auto_data";
    private static final String SENSOR_DATE_KEY = "sensor_baseline_date";
    private static final String SENSOR_BASELINE_KEY = "sensor_baseline_value";
    private static final String SENSOR_LAST_VALUE_KEY = "sensor_last_value";

    private StepsCollector() {}

    public static JSONObject collect(Context context, String date) throws JSONException {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            && ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION)
                != PackageManager.PERMISSION_GRANTED) {
            return null;
        }

        Float sensorValue = readStepCounter(context);
        if (sensorValue == null) return null;

        SharedPreferences preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
        String baselineDate = preferences.getString(SENSOR_DATE_KEY, null);
        float baseline = preferences.getFloat(SENSOR_BASELINE_KEY, sensorValue);
        float lastValue = preferences.getFloat(SENSOR_LAST_VALUE_KEY, sensorValue);
        if (!date.equals(baselineDate)) {
            baseline = sensorValue >= lastValue ? lastValue : sensorValue;
            preferences.edit().putString(SENSOR_DATE_KEY, date).putFloat(SENSOR_BASELINE_KEY, baseline).apply();
        } else if (sensorValue < baseline) {
            // The cumulative counter resets after a reboot; restart today's baseline safely.
            baseline = sensorValue;
            preferences.edit().putFloat(SENSOR_BASELINE_KEY, baseline).apply();
        }
        preferences.edit().putFloat(SENSOR_LAST_VALUE_KEY, sensorValue).apply();

        JSONObject result = new JSONObject();
        result.put("count", Math.max(0, Math.round(sensorValue - baseline)));
        result.put("source", "step-sensor");
        result.put("collectedAt", Instant.now().toString());
        result.put("isFinal", false);
        return result;
    }

    private static Float readStepCounter(Context context) {
        SensorManager sensorManager = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager == null) return null;
        Sensor sensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if (sensor == null) return null;

        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<Float> value = new AtomicReference<>();
        SensorEventListener listener = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                if (event.values.length > 0) {
                    value.set(event.values[0]);
                    latch.countDown();
                }
            }

            @Override
            public void onAccuracyChanged(Sensor changedSensor, int accuracy) {}
        };

        if (!sensorManager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)) return null;
        try {
            latch.await(3, TimeUnit.SECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        } finally {
            sensorManager.unregisterListener(listener);
        }
        return value.get();
    }
}
