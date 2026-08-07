package com.moodtracker.app;

import com.getcapacitor.BridgeActivity;
import com.moodtracker.app.autodata.AutoDataPlugin;

public class MainActivity extends BridgeActivity {
    public MainActivity() {
        registerPlugin(AutoDataPlugin.class);
    }
}
