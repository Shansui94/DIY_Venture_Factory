
#include <HTTPClient.h>
#include <Preferences.h> // Flash Storage
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_task_wdt.h> // Watchdog Timer
#include <time.h>         // Include standard time library
#include <vector>


#define WDT_TIMEOUT 30 // Restart if stuck for 30 seconds

// --- WIFI CONFIGURATION (Change This) ---
const char *ssid = "opm9821_2.4Ghz@MaxisFibre";
const char *password = "88888888";

// --- SERVER CONFIGURATION (DIRECT SUPABASE) ---
const char *serverUrl =
    "https://kdahubyhwndgyloaljak.supabase.co/rest/v1/production_logs";
const char *apiKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6Im"
    "Fub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_"
    "M4dvKPzHBDkiydwosUYPs-8";

// --- MACHINE CONFIGURATION ---
const char *machineId = "T1.2-M01"; // Machine ID (Corrected to M01)
const int relayPin = 15;            // GPIO 15 (D15)
const int ledPin = 2;               // Built-in LED (GPIO 2)

// --- VARIABLES ---
int lastState = HIGH; // Relay is Normally Open (NO)
unsigned long lastDebounceTime = 0;
// 4 Minutes Cool-down to prevent double-counting
unsigned long debounceDelay = 240000; // FINAL PRODUCTION VALUE (4 Mins)

// --- OFFLINE BUFFERING & TIME ---
struct QueueItem {
  int count;
  time_t timestamp; // Store epoch time when alarm happened
};
std::vector<QueueItem> alarmQueue;

// NTP Servers
const char *ntpServer = "pool.ntp.org";
const long gmtOffset_sec =
    0; // UTC (Supabase expects UTC or ISO string with offset)
const int daylightOffset_sec = 0;

// Persistent Storage
Preferences preferences;

void saveQueue() {
  preferences.begin("queue", false); // Namespace "queue", RW mode
  int size = alarmQueue.size();
  preferences.putInt("size", size);

  // Save each item
  for (int i = 0; i < size; i++) {
    String key = "i" + String(i); // Keys: i0, i1, i2...
    preferences.putBytes(key.c_str(), &alarmQueue[i], sizeof(QueueItem));
  }

  // Clean up if queue shrunk (optional but good practice)
  // Actually, 'size' determines how many we read back, so old keys are ignored.

  preferences.end();
  Serial.println(" [Flash] Queue Saved.");
}

void loadQueue() {
  preferences.begin("queue", true); // Read Only
  int size = preferences.getInt("size", 0);

  if (size > 0) {
    Serial.print(" [Flash] Recovering ");
    Serial.print(size);
    Serial.println(" items...");

    alarmQueue.clear();
    for (int i = 0; i < size; i++) {
      String key = "i" + String(i);
      QueueItem item;
      size_t len = preferences.getBytes(key.c_str(), &item, sizeof(QueueItem));
      if (len == sizeof(QueueItem)) {
        alarmQueue.push_back(item);
      }
    }
  }
  preferences.end();
}

void setup() {
  Serial.begin(115200);

  // Setup Pins
  pinMode(relayPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);

  // Connect WiFi & Sync Time
  connectWiFi();

  // Init Time
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  // Load unsent data from Flash (Crash Recovery)
  loadQueue();

  // Initialize Watchdog Timer (ESP32 Arduino 3.0+ / IDF 5.x compatible)
  esp_task_wdt_config_t wdt_config = {.timeout_ms = WDT_TIMEOUT * 1000,
                                      .idle_core_mask =
                                          (1 << 0), // Monitor Core 0
                                      .trigger_panic = true};

  // Try to initialize, if already initialized (ESP_ERR_INVALID_STATE),
  // reconfigure
  if (esp_task_wdt_init(&wdt_config) != ESP_OK) {
    esp_task_wdt_reconfigure(&wdt_config);
  }

  esp_task_wdt_add(NULL); // Add current thread to WDT watch
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED)
    return;

  WiFi.begin(ssid, password);
  Serial.println("Connecting to WiFi...");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(500);
    Serial.print(".");
    digitalWrite(ledPin, !digitalRead(ledPin));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(ledPin, HIGH); // LED ON when connected
    Serial.println("\nWiFi Connected!");
  } else {
    Serial.println("\nWiFi Connect Failed (Will retry in loop)");
    digitalWrite(ledPin, LOW);
  }
}

// Helper to check if time is synced
bool isTimeSet() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return false;
  }
  // Check if year is valid > 2020
  if (timeinfo.tm_year + 1900 < 2020)
    return false;
  return true;
}

// Format time to ISO 8601 for Supabase: "YYYY-MM-DDTHH:MM:SSZ"
String getISOTime(time_t rawtime) {
  if (rawtime <= 0 && isTimeSet()) {
    time(&rawtime); // Get current time if not provided
  } else if (rawtime <= 0) {
    return ""; // Time not set
  }

  struct tm *ti;
  ti = gmtime(&rawtime); // Convert to UTC struct

  char buffer[30];
  // Format: 2026-01-25T15:30:00Z
  sprintf(buffer, "%04d-%02d-%02dT%02d:%02d:%02dZ", ti->tm_year + 1900,
          ti->tm_mon + 1, ti->tm_mday, ti->tm_hour, ti->tm_min, ti->tm_sec);

  return String(buffer);
}

void loop() {
  // 0. RESET WATCHDOG (Feed the dog)
  esp_task_wdt_reset();

  // 1. SIGNAL DETECTION
  int reading = digitalRead(relayPin);

  if (reading == LOW && lastState == HIGH) {
    if ((millis() - lastDebounceTime) > debounceDelay) {
      Serial.println("Signal Detected! verifying signal stability (1 sec)...");

      // OPTIMIZED NOISE FILTER (STABILITY CHECK)
      // REDUCED STRICTNESS: Check 15 times (300ms) instead of 50 times (1s).
      // Why? A 1-second perfect signal requirement is too strict for mechanical
      // relays. 300ms is still plenty to filter out electrical noise (<50ms).
      bool isStable = true;
      for (int i = 0; i < 15; i++) {
        delay(20);
        esp_task_wdt_reset(); // Keep dog fed during delay loop
        if (digitalRead(relayPin) == HIGH) {
          isStable = false;
          break;
        }
      }

      if (isStable) {
        Serial.println("ALARM CONFIRMED! queueing...");

        // Blink Confirm
        digitalWrite(ledPin, LOW);
        delay(100);
        digitalWrite(ledPin, HIGH);

        // Update Timer
        lastDebounceTime = millis();

        // CAPTURE TIMESTAMP
        time_t now;
        time(&now);
        // If time is not set (booted without wifi), 'now' will be small.
        // We logic: if now < 2020, mark as 0, send logic will use upload time
        // if 0. But better is to try to sync.

        QueueItem item = {2, now}; // Count=2, Time=Now
        alarmQueue.push_back(item);

        saveQueue(); // <--- SAVE TO FLASH IMMEDIATELY

        Serial.print("Queue Size: ");
        Serial.println(alarmQueue.size());

      } else {
        Serial.println("Signal unstable (Noise Spike) - Ignored.");
      }
    }
  }
  lastState = reading;

  // 2. NETWORK HANDLING
  handleNetworkQueue();

  // 3. Keep WiFi Alive
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnectAttempt = 0;
    if (millis() - lastReconnectAttempt > 10000) {
      lastReconnectAttempt = millis();
      WiFi.reconnect();
    }
  }

  // 4. HEARTBEAT LED (Shows "I am alive" every 5 seconds)
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 5000) {
    lastHeartbeat = millis();
    // Quick blip
    digitalWrite(ledPin, LOW);
    delay(50);
    digitalWrite(ledPin, (WiFi.status() == WL_CONNECTED) ? HIGH : LOW);
  }
}

void handleNetworkQueue() {
  if (alarmQueue.empty())
    return;

  // Reduce Check Frequency to avoid hammering (Non-blocking delay)
  static unsigned long lastUploadAttempt = 0;
  if (millis() - lastUploadAttempt < 2000)
    return; // Wait 2s between tries

  if (WiFi.status() == WL_CONNECTED) {
    lastUploadAttempt = millis(); // Mark attempt

    QueueItem item = alarmQueue.front();

    // Try Sending with Timestamp
    if (sendToSupabase(item.count, item.timestamp)) {
      alarmQueue.erase(alarmQueue.begin());
      saveQueue(); // <--- UPDATE FLASH AFTER SUCCESSFUL SEND
      Serial.print("Sent Success! Rem: ");
      Serial.println(alarmQueue.size());
    }
    // If failed, we just exit. The 'lastUploadAttempt' check ensures we wait 2s
    // before retrying. NO BLOCKING DELAY HERE.
  }
}

bool sendToSupabase(int count, time_t timestamp) {
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();

  if (!http.begin(client, serverUrl)) {
    return false;
  }

  // TIMEOUT: Prevent HANGING if server is slow
  http.setTimeout(5000); // 5 Seconds Max

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", apiKey);
  http.addHeader("Authorization", String("Bearer ") + apiKey);
  http.addHeader("Prefer", "return=representation");

  String timeStr = getISOTime(timestamp);
  String jsonPayload;

  if (timeStr != "") {
    // Send WITH specific timestamp
    jsonPayload = String("{\"machine_id\": \"") + machineId +
                  "\", \"alarm_count\": " + String(count) +
                  ", \"created_at\": \"" + timeStr + "\"}";
  } else {
    // Fallback: No timestamp (Use server time), only happens if NTP never
    // synced
    jsonPayload = String("{\"machine_id\": \"") + machineId +
                  "\", \"alarm_count\": " + String(count) + "}";
  }

  int httpResponseCode = http.POST(jsonPayload);
  bool success = false;

  if (httpResponseCode >= 200 && httpResponseCode < 300) {
    success = true;
  } else {
    Serial.print("DB Error: ");
    Serial.println(httpResponseCode);
  }

  http.end();
  return success;
}
