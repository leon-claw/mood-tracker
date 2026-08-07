package com.moodtracker.app.autodata;

import static org.junit.Assert.assertTrue;

import java.util.HashMap;
import java.util.Map;

import org.junit.Test;

public class AutoDataQueueTest {
    private static final class FakeStore implements AutoDataQueue.Store {
        private final Map<String, String> values = new HashMap<>();

        @Override
        public String get(String key) {
            return values.get(key);
        }

        @Override
        public void put(String key, String value) {
            values.put(key, value);
        }

        @Override
        public void remove(String key) {
            values.remove(key);
        }
    }

    @Test
    public void queueMergesDifferentModulesForOneDate() {
        AutoDataQueue queue = new AutoDataQueue(new FakeStore());
        queue.merge("2026-08-07", "steps", "{\"count\":1000}");
        queue.merge("2026-08-07", "weather", "{\"weatherCode\":0}");

        String snapshot = queue.read("2026-08-07");
        assertTrue(snapshot.contains("steps"));
        assertTrue(snapshot.contains("weather"));
    }
}
