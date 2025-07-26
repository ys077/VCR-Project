#include <SPI.h>
#include <LoRa.h>

// Pin configuration
#define SS    5
#define RST   14
#define DIO0  26

void setup() {
  Serial.begin(9600);
  while (!Serial);  // Wait for serial to initialize (useful for boards like Leonardo)

  LoRa.setPins(SS, RST, DIO0);

  if (!LoRa.begin(433E6)) {
    Serial.println("LoRa init failed. Check connections and frequency.");
    while (true);  // Halt execution to signal error
  }

  Serial.println(" LoRa Transmitter Ready");
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();  // Removes newline or trailing spaces

    if (command.length() > 0) {
      LoRa.beginPacket();
      LoRa.print(command);
      LoRa.endPacket();

      Serial.println(" Sent: " + command);
    } else {
      Serial.println("Warning: Empty command received");
    }
  }
}
