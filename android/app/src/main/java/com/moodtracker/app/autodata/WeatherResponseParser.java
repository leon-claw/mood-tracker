package com.moodtracker.app.autodata;

import org.json.JSONException;
import org.json.JSONObject;

public final class WeatherResponseParser {
    private WeatherResponseParser() {}

    public static JSONObject parse(String body, String collectedAt) throws JSONException {
        JSONObject current = new JSONObject(body).getJSONObject("current");
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
        return result;
    }
}
