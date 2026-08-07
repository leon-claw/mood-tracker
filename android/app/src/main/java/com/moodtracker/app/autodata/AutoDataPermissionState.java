package com.moodtracker.app.autodata;

import android.Manifest;
import android.app.AppOpsManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;

import com.getcapacitor.JSObject;

public final class AutoDataPermissionState {
    private AutoDataPermissionState() {}

    private static boolean hasPermission(Context context, String permission) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M
            || context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
    }

    private static boolean hasUsageAccess(Context context) {
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) return false;
        int mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private static String state(boolean granted) {
        return granted ? "granted" : "permission-required";
    }

    public static JSObject read(Context context) {
        boolean stepsGranted = hasPermission(context, Manifest.permission.ACTIVITY_RECOGNITION);
        boolean coarseLocationGranted = hasPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION);
        boolean backgroundLocationGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
            || hasPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION);

        JSObject result = new JSObject();
        result.put("steps", state(stepsGranted));
        result.put("weather", state(coarseLocationGranted && backgroundLocationGranted));
        result.put("screenTime", state(hasUsageAccess(context)));
        result.put("locationServicesEnabled", Settings.Secure.getInt(
            context.getContentResolver(),
            Settings.Secure.LOCATION_MODE,
            Settings.Secure.LOCATION_MODE_OFF
        ) != Settings.Secure.LOCATION_MODE_OFF);
        return result;
    }
}
