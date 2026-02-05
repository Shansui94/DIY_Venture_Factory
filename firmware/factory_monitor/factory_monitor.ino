
#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>
#include <Preferences.h> // Flash Storage
#include <Update.h>
#include <WebServer.h>
#include <WiFi.h>

const String CURRENT_VERSION = "3.0.0"; // ★ 当前本地固件版本
#include <WiFiClientSecure.h>
#include <esp_task_wdt.h> // Watchdog Timer
#include <time.h>         // Include standard time library
#include <vector>

#define WDT_TIMEOUT 30 // Restart if stuck for 30 seconds

// --- WIFI CONFIGURATION ---
const char *ssid = "ESBL_2.4GHz";
const char *password = "88888888";

// 2. Vercel API (Dynamic Config)
const String configApiUrl = "https://packsecure.vercel.app/api/iot-config?mac=";

// --- SERVER CONFIGURATION ---
const char *supabaseUrl =
    "https://kdahubyhwndgyloaljak.supabase.co/rest/v1/production_logs";
const char *apiKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6Im"
    "Fub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0."
    "mzTtQ6zpfvRY07372UH_"
    "M4dvKPzHBDkiydwosUYPs-8";

// --- MACHINE CONFIGURATION ---
String machineId =
    "PENDING_ASSIGNMENT"; // 初始占位符，通电后会自动改为 N1-M01 或 N2-M02
const int relayPin = 15;  // GPIO 15 (D15)
const int ledPin = 2;

// --- 动态变量 (会从云端同步，不要在这里死改数字) ---
int currentYield =
    1; // 产量系数（默认1）。启动后会自动从云端拉取 (如 33cm x1 会变成 3)
unsigned long debounceDelay =
    240000;                    // 冷却时间。启动后会自动从云端拉取 (如 240000ms)
String currentSku = "UNKNOWN"; // 正在生产的 SKU

int lastState = HIGH;
unsigned long lastDebounceTime = 0;
struct QueueItem {
  int count;
  time_t timestamp;
};
std::vector<QueueItem> alarmQueue;
Preferences preferences;

// NTP 服务器
const char *ntpServer = "pool.ntp.org";

// --- WEB SERVER & OTA ---
WebServer server(80);
const char *otaPath = "/update";
const char *otaUser = "admin";
const char *otaPass = "packsecure";

// 函数声明
void setupOTA();
void performCloudUpdate(String url);
void updateRemoteConfig();
void connectWiFi();
void handleNetworkQueue();
bool sendToSupabase(int count, time_t timestamp);
bool isTimeSet();
String getISOTime(time_t rawtime);
void saveQueue();
void loadQueue();
void handleRoot();
void handleUpdateResponse();
void handleUpdateUpload();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n--- NILAI PRODUCTION FIRMWARE (OTA READY v3.0) ---");

  pinMode(relayPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);

  connectWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi已连接! MAC: " + WiFi.macAddress());
    setupOTA(); // ★ 启动 OTA 和 Web Server
  } else {
    Serial.println("WiFi连接失败，请检查 SSID/密码 或 2.4G 频段");
  }

  Serial.println("STEP 1: 配置时间 (NTP)...");
  configTime(0, 0, ntpServer);

  Serial.println("STEP 2: 加载离线队列...");
  loadQueue();

  // ★ 启动时立刻拉取一次云端 Yield 设置
  Serial.println("STEP 3: 同步云端配置...");
  updateRemoteConfig();

// Watchdog - 30 seconds
#if ESP_IDF_VERSION_MAJOR >= 5
  esp_task_wdt_config_t wdt_config = {.timeout_ms = WDT_TIMEOUT * 1000,
                                      .idle_core_mask = 0,
                                      .trigger_panic = true};
  esp_task_wdt_reconfigure(&wdt_config);
#else
  esp_task_wdt_init(WDT_TIMEOUT, true);
#endif
  esp_task_wdt_add(NULL);
}

void loop() {
  esp_task_wdt_reset();

  // 处理 OTA 和 Web 请求
  if (WiFi.status() == WL_CONNECTED) {
    server.handleClient();
    ArduinoOTA.handle();
  }

  // 每 60 秒自动同步一次产量
  static unsigned long lastConfigSync = 0;
  if (millis() - lastConfigSync > 60000) {
    updateRemoteConfig();
    lastConfigSync = millis();
  }

  // 1. 信号检测
  int reading = digitalRead(relayPin);
  if (reading == LOW && lastState == HIGH) {
    if ((millis() - lastDebounceTime) > debounceDelay) {
      int validCount = 0;
      for (int i = 0; i < 5; i++) {
        delay(20);
        esp_task_wdt_reset();
        if (digitalRead(relayPin) == LOW)
          validCount++;
      }
      if (validCount >= 3) {
        Serial.printf("触发! Yield: %d, SKU: %s\n", currentYield,
                      currentSku.c_str());
        digitalWrite(ledPin, LOW);
        delay(100);
        digitalWrite(ledPin, HIGH);
        lastDebounceTime = millis();
        time_t now;
        time(&now);
        QueueItem item = {currentYield, now};
        alarmQueue.push_back(item);
        saveQueue();
      }
    }
  }
  lastState = reading;

  handleNetworkQueue();

  // WiFi 重连逻辑 (简化，交给核心自动处理或手动 connectWiFi)
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastRecon = 0;
    if (millis() - lastRecon >
        30000) { // 增加等待时间到 30 秒，避免干扰内部连接
      lastRecon = millis();
      Serial.println("WiFi断开，尝试恢复...");
      connectWiFi();
    }
  }

  // 心跳 LED
  static unsigned long lastHeart = 0;
  if (millis() - lastHeart > 5000) {
    lastHeart = millis();
    digitalWrite(ledPin, LOW);
    delay(50);
    digitalWrite(ledPin, (WiFi.status() == WL_CONNECTED) ? HIGH : LOW);
  }
}

// 【新增核心函数】：拉取动态产量和 SKU
void updateRemoteConfig() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    WiFiClientSecure client;
    client.setInsecure(); // 跳过 SSL 验证，确保能连上 Vercel (HTTPS)

    String fullUrl = configApiUrl + WiFi.macAddress();

    if (http.begin(client, fullUrl)) {
      int code = http.GET();
      if (code == 200) {
        String payload = http.getString();
        StaticJsonDocument<512> doc;
        if (!deserializeJson(doc, payload)) {
          currentYield = doc["yield"] | currentYield;
          debounceDelay = doc["debounce"] | debounceDelay;
          currentSku = doc["sku"].as<String>();
          if (doc.containsKey("machine_id")) {
            machineId = doc["machine_id"].as<String>();
          }
          if (doc.containsKey("latest_version") &&
              doc.containsKey("download_url")) {
            String latestVersion = doc["latest_version"].as<String>();
            String downloadUrl = doc["download_url"].as<String>();
            if (latestVersion > CURRENT_VERSION) {
              Serial.println("发现新版本: " + latestVersion +
                             "，准备远程升级...");
              performCloudUpdate(downloadUrl);
            }
          }
          Serial.printf("Remote Sync Success: SKU=%s, Yield=%d, Machine=%s\n",
                        currentSku.c_str(), currentYield, machineId.c_str());
        }
      } else {
        Serial.printf("Remote Sync Failed: HTTP Code %d\n", code);
      }
      http.end();
    } else {
      Serial.println("Remote Sync Failed: 无法连接 API 地址 (HTTPS)");
    }
  } else {
    Serial.println("Remote Sync Skipped: WiFi 未连接，无法同步参数");
  }
}

void saveQueue() {
  preferences.begin("fv_store", false);
  int size = alarmQueue.size();
  preferences.putInt("size", size);
  for (int i = 0; i < size; i++) {
    String key = "i" + String(i);
    preferences.putBytes(key.c_str(), &alarmQueue[i], sizeof(QueueItem));
  }
  preferences.end();
}

void loadQueue() {
  preferences.begin("fv_store", true);
  int size = preferences.getInt("size", 0);
  if (size > 0) {
    alarmQueue.clear();
    for (int i = 0; i < size; i++) {
      String key = "i" + String(i);
      QueueItem item;
      if (preferences.getBytes(key.c_str(), &item, sizeof(QueueItem)) ==
          sizeof(QueueItem)) {
        alarmQueue.push_back(item);
      }
    }
  }
  preferences.end();
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED)
    return;
  WiFi.disconnect(true);
  delay(100);
  Serial.printf("正在连接 WiFi: %s ", ssid);
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
}

bool isTimeSet() {
  struct tm ti;
  if (!getLocalTime(&ti))
    return false;
  return (ti.tm_year + 1900 > 2020);
}

String getISOTime(time_t rawtime) {
  if (rawtime <= 0 && isTimeSet())
    time(&rawtime);
  else if (rawtime <= 0)
    return "";
  struct tm *ti = gmtime(&rawtime);
  char buf[30];
  sprintf(buf, "%04d-%02d-%02dT%02d:%02d:%02dZ", ti->tm_year + 1900,
          ti->tm_mon + 1, ti->tm_mday, ti->tm_hour, ti->tm_min, ti->tm_sec);
  return String(buf);
}

void handleNetworkQueue() {
  if (alarmQueue.empty() || WiFi.status() != WL_CONNECTED)
    return;
  static unsigned long lastUp = 0;
  if (millis() - lastUp < 2000)
    return;
  lastUp = millis();
  QueueItem item = alarmQueue.front();
  if (sendToSupabase(item.count, item.timestamp)) {
    alarmQueue.erase(alarmQueue.begin());
    saveQueue();
  }
}

bool sendToSupabase(int count, time_t timestamp) {
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();
  if (!http.begin(client, supabaseUrl))
    return false;
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", apiKey);
  http.addHeader("Authorization", String("Bearer ") + apiKey);
  String timeStr = getISOTime(timestamp);
  String json = (timeStr != "")
                    ? "{\"machine_id\": \"" + String(machineId) +
                          "\", \"alarm_count\": " + String(count) +
                          ", \"created_at\": \"" + timeStr + "\"}"
                    : "{\"machine_id\": \"" + String(machineId) +
                          "\", \"alarm_count\": " + String(count) + "}";
  int res = http.POST(json);
  http.end();
  return (res >= 200 && res < 300) || (res >= 400 && res < 500);
}

// --- OTA 逻辑实现 ---
void setupOTA() {
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  String hostName = "nilai-" + mac;

  if (MDNS.begin(hostName.c_str())) {
    Serial.println("mDNS 响应已启动: http://" + hostName + ".local");
  }

  // Web Server 路由
  server.on("/", HTTP_GET, handleRoot);
  server.on(
      otaPath, HTTP_POST, []() { handleUpdateResponse(); },
      []() { handleUpdateUpload(); });

  server.begin();
  Serial.println("Web Server 升级入口已启动: http://" +
                 WiFi.localIP().toString() + otaPath);

  // Arduino IDE OTA
  ArduinoOTA.setHostname(hostName.c_str());
  ArduinoOTA.setPassword("packsecure");
  ArduinoOTA.begin();
}

void handleRoot() {
  String html = "<html><head><title>Nilai OTA</title></head><body>";
  html += "<h1>Nilai Sensor Maintenance</h1>";
  html += "<p>MAC: " + WiFi.macAddress() + "</p>";
  html += "<p>Vercel API: <a href='" + configApiUrl + WiFi.macAddress() + "'>" +
          configApiUrl + "</a></p>";
  html += "<hr><h3>Firmware Update</h3>";
  html += "<form method='POST' action='" + String(otaPath) +
          "' enctype='multipart/form-data'>";
  html += "<input type='file' name='update'><input type='submit' value='Update "
          "Now'>";
  html += "</form></body></html>";
  server.send(200, "text/html", html);
}

void handleUpdateResponse() {
  server.sendHeader("Connection", "close");
  server.send(200, "text/plain",
              (Update.hasError()) ? "FAIL" : "OK. REBOOTING...");
  delay(1000);
  ESP.restart();
}

void handleUpdateUpload() {
  HTTPUpload &upload = server.upload();
  if (upload.status == UPLOAD_FILE_START) {
    Serial.printf("Update Start: %s\n", upload.filename.c_str());
    if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
      Update.printError(Serial);
    }
  } else if (upload.status == UPLOAD_FILE_WRITE) {
    if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
      Update.printError(Serial);
    }
  } else if (upload.status == UPLOAD_FILE_END) {
    if (Update.end(true)) {
      Serial.printf("Update Success: %u bytes\nRebooting...\n",
                    upload.totalSize);
    } else {
      Update.printError(Serial);
    }
  }
}

void performCloudUpdate(String url) {
  WiFiClientSecure client;
  client.setInsecure();

  Serial.println("正在从外部地址下载固件: " + url);

  // 临时取消关注 WDT，防止升级过程中触发重启
  // 使用 NULL 检查确保不会因为重复操作报错
  esp_task_wdt_delete(NULL);

  t_httpUpdate_return ret = httpUpdate.update(client, url);

  // 无论升级结果如何，重新加回 WDT
  esp_task_wdt_add(NULL);

  switch (ret) {
  case HTTP_UPDATE_FAILED:
    Serial.printf("HTTP_UPDATE_FAILED Error (%d): %s\n",
                  httpUpdate.getLastError(),
                  httpUpdate.getLastErrorString().c_str());
    break;
  case HTTP_UPDATE_NO_UPDATES:
    Serial.println("HTTP_UPDATE_NO_UPDATES");
    break;
  case HTTP_UPDATE_OK:
    Serial.println("HTTP_UPDATE_OK - 重启中...");
    ESP.restart();
    break;
  }
}
