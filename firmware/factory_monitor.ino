
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h> // Supports HTTPS for Vercel

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
const char *machineId = "T1.2-M01"; // Machine ID
const int relayPin = 5; // GPIO 5 (D5) - Changed from 4 to test hardware
const int ledPin = 2;   // Built-in LED (GPIO 2)

// --- VARIABLES ---
int lastState = HIGH; // Relay is Normally Open (NO)
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay =
    240000; // 4 Minutes Cool-down (Production takes 5 mins) (Anti-rapid fire)

void setup() {
  Serial.begin(115200);

  // Setup Pins
  pinMode(relayPin, INPUT_PULLUP); // Internal Pull-up Resistor
  pinMode(ledPin, OUTPUT);         // Status LED

  // Connect WiFi
  WiFi.begin(ssid, password);
  Serial.println("Connecting to WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(ledPin, !digitalRead(ledPin)); // Blink while connecting
  }
  digitalWrite(ledPin, HIGH); // LED ON when connected
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  int reading = digitalRead(relayPin);

  // DEBUG: Print status every 1 second to confirm code is running
  static unsigned long lastDebug = 0;
  if (millis() - lastDebug > 1000) {
    lastDebug = millis();
    Serial.print("Pin State: ");
    Serial.print(reading == LOW ? "LOW (Active)" : "HIGH (Open)");
    Serial.print(" | Time since last trigger: ");
    Serial.print((millis() - lastDebounceTime) / 1000);
    Serial.println(" sec");
  }

  // Detect signal change (Active LOW - Relay connects pin to GND)
  if (reading == LOW && lastState == HIGH) {
    if ((millis() - lastDebounceTime) > debounceDelay) {
      Serial.println("Signal Detected! Waiting 1s for noise filter...");

      // CONFIRMED SIGNAL
      // NOISE FILTER: Wait 1 SECOND (1000ms).
      // Reduced from 2000ms to 1000ms as some signals were being missed.
      delay(1000);
      if (digitalRead(relayPin) == LOW) {
        Serial.println("ALARM CONFIRMED! Sending (Count=2)...");

        digitalWrite(ledPin, LOW);
        delay(100);
        digitalWrite(ledPin, HIGH);

        sendAlarm();

        lastDebounceTime = millis();
      } else {
        Serial.println("Noise Spike Detected - Ignored.");
      }
    } else {
      Serial.println("Ignored: In Cooling Period (4 mins)");
    }
  }

  lastState = reading;
}

void sendAlarm() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    WiFiClientSecure client;

    // Supabase requires HTTPS
    client.setInsecure();
    http.begin(client, serverUrl);

    // Headers for Supabase Auth
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", apiKey);
    http.addHeader("Authorization", String("Bearer ") + apiKey);
    http.addHeader("Prefer", "return=representation");

    // Format JSON: {"machine_id": "T1.2-M01", "alarm_count": 2}
    // Note: product_sku is now handled by Database Trigger!
    String jsonPayload =
        String("{\"machine_id\": \"") + machineId + "\", \"alarm_count\": 2}";

    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("DB Response: ");
      Serial.println(httpResponseCode);
      Serial.println(response);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("WiFi Disconnected");
    WiFi.reconnect();
  }
}
