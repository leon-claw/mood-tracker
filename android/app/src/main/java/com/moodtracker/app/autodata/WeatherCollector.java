package com.moodtracker.app.autodata;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Looper;

import androidx.core.content.ContextCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

public final class WeatherCollector {
    private static final String PREFERENCES_NAME = "mood_tracker_auto_data";
    private static final String SUCCESS_DATES_KEY = "weather_success_dates";

    private WeatherCollector() {}

    public static JSONObject collect(Context context, String date) throws Exception {
        if (hasCollected(context, date)) return null;
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) return null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            && ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                != PackageManager.PERMISSION_GRANTED) return null;

        Location location = getLocation(context);
        if (location == null) return null;
        String collectedAt = Instant.now().toString();
        String body = requestWeather(location.getLatitude(), location.getLongitude());
        JSONObject result = WeatherResponseParser.parse(body, collectedAt);
        markCollected(context, date);
        return result;
    }

    private static Location getLocation(Context context) {
        LocationManager manager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) return null;
        for (String provider : new String[] { LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER, LocationManager.GPS_PROVIDER }) {
            try {
                Location last = manager.getLastKnownLocation(provider);
                if (last != null) return last;
            } catch (SecurityException ignored) {
                return null;
            }
        }

        AtomicReference<Location> result = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        LocationListener listener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                result.set(location);
                latch.countDown();
            }
        };
        try {
            String provider = manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
                ? LocationManager.NETWORK_PROVIDER
                : LocationManager.GPS_PROVIDER;
            manager.requestLocationUpdates(provider, 0L, 0f, listener, Looper.getMainLooper());
            latch.await(5, TimeUnit.SECONDS);
            manager.removeUpdates(listener);
        } catch (Exception ignored) {
            try { manager.removeUpdates(listener); } catch (SecurityException ignoredAgain) {}
        }
        return result.get();
    }

    private static String requestWeather(double latitude, double longitude) throws Exception {
        String query = "https://api.open-meteo.com/v1/forecast?latitude="
            + latitude
            + "&longitude="
            + longitude
            + "&current=weather_code,temperature_2m,relative_humidity_2m,precipitation&timezone=auto";
        HttpURLConnection connection = (HttpURLConnection) new URL(query).openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);
        connection.setRequestProperty("Accept", "application/json");
        try (InputStream stream = connection.getResponseCode() >= 400
            ? connection.getErrorStream()
            : connection.getInputStream()) {
            if (stream == null) throw new IllegalStateException("Open-Meteo returned no body");
            StringBuilder body = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream))) {
                String line;
                while ((line = reader.readLine()) != null) body.append(line);
            }
            if (connection.getResponseCode() >= 400) throw new IllegalStateException("Open-Meteo request failed");
            return body.toString();
        } finally {
            connection.disconnect();
        }
    }

    private static boolean hasCollected(Context context, String date) {
        return readSuccessDates(context).contains(date);
    }

    private static void markCollected(Context context, String date) {
        Set<String> dates = readSuccessDates(context);
        dates.add(date);
        while (dates.size() > 14) dates.remove(dates.iterator().next());
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putStringSet(SUCCESS_DATES_KEY, dates)
            .apply();
    }

    private static Set<String> readSuccessDates(Context context) {
        return new HashSet<>(context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getStringSet(SUCCESS_DATES_KEY, new HashSet<>()));
    }
}
