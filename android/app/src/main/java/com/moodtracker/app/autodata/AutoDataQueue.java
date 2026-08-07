package com.moodtracker.app.autodata;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

public class AutoDataQueue {
    public interface Store {
        String get(String key);
        void put(String key, String value);
        void remove(String key);
    }

    private static final String PREFERENCES_NAME = "mood_tracker_auto_data";
    private static final String QUEUE_KEY = "pending_snapshots";
    private static final int MAX_DATES = 14;

    private final Store store;

    public AutoDataQueue(Context context) {
        this(new SharedPreferencesStore(
            context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        ));
    }

    public AutoDataQueue(Store store) {
        this.store = store;
    }

    public synchronized void merge(String date, String module, String payload) {
        if (!isDate(date) || !isModule(module)) return;
        try {
            JSONObject root = readRoot();
            JSONObject day = root.optJSONObject(date);
            if (day == null) day = new JSONObject();
            day.put(module, new JSONObject(payload));
            root.put(date, day);
            trimDates(root);
            store.put(QUEUE_KEY, root.toString());
        } catch (JSONException ignored) {
            // A malformed collector payload must not corrupt the pending queue.
        }
    }

    public synchronized String read(String date) {
        JSONObject day = readRoot().optJSONObject(date);
        return day == null ? "{}" : day.toString();
    }

    public synchronized boolean hasModule(String date, String module) {
        JSONObject day = readRoot().optJSONObject(date);
        return day != null && day.optJSONObject(module) != null;
    }

    public synchronized JSONArray drain() {
        JSONObject root = readRoot();
        JSONArray result = new JSONArray();
        Iterator<String> keys = root.keys();
        while (keys.hasNext()) {
            String date = keys.next();
            JSONObject autoData = root.optJSONObject(date);
            if (autoData == null) continue;
            JSONObject entry = new JSONObject();
            try {
                entry.put("date", date);
                entry.put("autoData", autoData);
                result.put(entry);
            } catch (JSONException ignored) {
                // Continue draining other valid dates.
            }
        }
        store.remove(QUEUE_KEY);
        return result;
    }

    private JSONObject readRoot() {
        String raw = store.get(QUEUE_KEY);
        if (raw == null || raw.isEmpty()) return new JSONObject();
        try {
            JSONObject parsed = new JSONObject(raw);
            return parsed;
        } catch (JSONException ignored) {
            return new JSONObject();
        }
    }

    private static void trimDates(JSONObject root) {
        List<String> dates = new ArrayList<>();
        Iterator<String> keys = root.keys();
        while (keys.hasNext()) dates.add(keys.next());
        Collections.sort(dates);
        while (dates.size() > MAX_DATES) {
            root.remove(dates.remove(0));
        }
    }

    private static boolean isDate(String date) {
        return date != null && date.matches("\\d{4}-\\d{2}-\\d{2}");
    }

    private static boolean isModule(String module) {
        return "steps".equals(module) || "weather".equals(module) || "screenTime".equals(module);
    }

    private static final class SharedPreferencesStore implements Store {
        private final SharedPreferences preferences;

        private SharedPreferencesStore(SharedPreferences preferences) {
            this.preferences = preferences;
        }

        @Override
        public String get(String key) {
            return preferences.getString(key, null);
        }

        @Override
        public void put(String key, String value) {
            preferences.edit().putString(key, value).apply();
        }

        @Override
        public void remove(String key) {
            preferences.edit().remove(key).apply();
        }
    }
}
