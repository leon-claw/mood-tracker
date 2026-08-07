package com.moodtracker.app.autodata;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(
    name = "AutoData",
    permissions = {
        @Permission(alias = "steps", strings = { Manifest.permission.ACTIVITY_RECOGNITION }),
        @Permission(alias = "weatherForeground", strings = { Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "weatherBackground", strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION })
    }
)
public class AutoDataPlugin extends Plugin {
    private static final String PREFERENCES_NAME = "mood_tracker_auto_data";
    private static final String ENABLED_MODULES_KEY = "enabled_modules";
    private final Set<String> enabledModules = new HashSet<>();

    @Override
    public void load() {
        super.load();
        enabledModules.clear();
        enabledModules.addAll(readEnabledModules());
        AutoDataWorker.schedule(getContext(), enabledModules);
    }

    @PluginMethod
    public void configure(PluginCall call) {
        JSArray requested = call.getArray("enabledModules");
        Set<String> nextModules = new HashSet<>();
        if (requested != null) {
            try {
                for (Object item : requested.toList()) {
                    if (isSupportedModule(item)) nextModules.add((String) item);
                }
            } catch (JSONException exception) {
                call.reject("Invalid enabled module list", exception);
                return;
            }
        }

        enabledModules.clear();
        enabledModules.addAll(nextModules);
        getContext()
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putStringSet(ENABLED_MODULES_KEY, new HashSet<>(enabledModules))
            .apply();
        AutoDataWorker.schedule(getContext(), enabledModules);

        JSObject result = new JSObject();
        result.put("enabledModules", toJsonArray(enabledModules));
        call.resolve(result);
    }

    @PluginMethod
    public void getPermissionState(PluginCall call) {
        call.resolve(AutoDataPermissionState.read(getContext()));
    }

    @PluginMethod
    public void requestModulePermission(PluginCall call) {
        String module = call.getString("module", "");
        if (!isSupportedModule(module)) {
            call.reject("Unknown automatic data module");
            return;
        }
        if (!enabledModules.contains(module)) {
            call.resolve(AutoDataPermissionState.read(getContext()));
            return;
        }

        if ("autoSteps".equals(module)) {
            requestPermissionForAlias("steps", call, "permissionCallback");
            return;
        }
        if ("autoWeather".equals(module)) {
            requestPermissionForAlias("weatherForeground", call, "weatherForegroundPermissionCallback");
            return;
        }

        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        startActivityForResult(call, intent, "usageAccessCallback");
    }

    @PluginMethod
    public void drainPending(PluginCall call) {
        JSObject result = new JSObject();
        result.put("entries", new AutoDataQueue(getContext()).drain());
        call.resolve(result);
    }

    @PluginMethod
    public void getSchedulerState(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabledModules", toJsonArray(enabledModules));
        result.put("scheduled", !enabledModules.isEmpty());
        call.resolve(result);
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        call.resolve(AutoDataPermissionState.read(getContext()));
    }

    @PermissionCallback
    private void weatherForegroundPermissionCallback(PluginCall call) {
        if (getContext().checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)
            != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            call.resolve(AutoDataPermissionState.read(getContext()));
            return;
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q
            && getContext().checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("weatherBackground", call, "permissionCallback");
            return;
        }
        call.resolve(AutoDataPermissionState.read(getContext()));
    }

    @ActivityCallback
    private void usageAccessCallback(PluginCall call, ActivityResult result) {
        call.resolve(AutoDataPermissionState.read(getContext()));
    }

    private List<String> readEnabledModules() {
        return new ArrayList<>(readEnabledModuleSet(getContext()));
    }

    public static Set<String> readEnabledModuleSet(Context context) {
        Set<String> saved = context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getStringSet(ENABLED_MODULES_KEY, new HashSet<>());
        List<String> modules = new ArrayList<>();
        for (String module : saved) {
            if (isSupportedModule(module)) modules.add(module);
        }
        return new HashSet<>(modules);
    }

    private static boolean isSupportedModule(Object value) {
        return "autoSteps".equals(value) || "autoWeather".equals(value) || "autoScreenTime".equals(value);
    }

    private static JSArray toJsonArray(Set<String> modules) {
        JSArray result = new JSArray();
        for (String module : modules) result.put(module);
        return result;
    }
}
