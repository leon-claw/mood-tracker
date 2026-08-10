package com.moodtracker.app.autodata;

import org.json.JSONException;
import org.json.JSONArray;
import org.json.JSONObject;

public final class WeatherResponseParser {
    private WeatherResponseParser() {}

    public static JSONObject parse(String body, String collectedAt) throws JSONException {
        JSONObject root = new JSONObject(body);
        JSONObject current = root.getJSONObject("current");
        JSONObject result = new JSONObject();
        result.put("weatherCode", current.getInt("weather_code"));
        result.put("provider", "open-meteo");
        result.put("collectedAt", collectedAt);
        if (current.has("temperature_2m") && !current.isNull("temperature_2m")) {
            result.put("temperatureC", current.getDouble("temperature_2m"));
        }
        if (current.has("relative_humidity_2m") && !current.isNull("relative_humidity_2m")) {
            result.put("humidityPercent", current.getInt("relative_humidity_2m"));
        }
        if (current.has("precipitation") && !current.isNull("precipitation")) {
            result.put("precipitationMm", current.getDouble("precipitation"));
        }

        JSONObject daily = root.optJSONObject("daily");
        if (daily != null) {
            putFirstDailyValue(daily, "temperature_2m_max", "temperatureMaxC", result);
            putFirstDailyValue(daily, "temperature_2m_min", "temperatureMinC", result);
        }
        return result;
    }

    private static void putFirstDailyValue(
        JSONObject daily,
        String sourceKey,
        String resultKey,
        JSONObject result
    ) throws JSONException {
        JSONArray values = daily.optJSONArray(sourceKey);
        if (values != null && values.length() > 0 && !values.isNull(0)) {
            result.put(resultKey, values.getDouble(0));
        }
    }
}
