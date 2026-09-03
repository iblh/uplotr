// ChirpStack v4 / HeyIoT ES5-safe Codec for SenseCAP T1000A (minimal)
// Supports common fPort=5 frames:
//  - 09: GNSS + Battery
//  - 06: GNSS + Temp + Light + Battery
//  - 05: Status (Battery/Mode/Strategy/SOS)

function decodeUplink(input) {
  try {
    var bytes = input.bytes || [];
    var fPort = input.fPort;

    var hex = bytesToHex(bytes); // uppercase

    // Keep raw always
    var out = { raw: hex, fPort: fPort };

    // Some firmwares use other ports for config; keep raw
    if (fPort !== 5) {
      return { data: out, warnings: ["Unsupported fPort: " + fPort] };
    }

    var frames = unpack(hex);

    for (var i = 0; i < frames.length; i++) {
      var id = frames[i].dataId;
      var val = frames[i].dataValue;

      if (id === "09") {
        // Layout per T1000A spec:
        // [0..6)=event status, [6..8)=motionId, [8..16)=utc seconds,
        // [16..24)=lon *1e6, [24..32)=lat *1e6, [32..34)=battery
        var ts = getUTCTimestamp(val.substring(8, 16));
        var lon = toSigned(val.substring(16, 24)) / 1000000.0;
        var lat = toSigned(val.substring(24, 32)) / 1000000.0;
        var batt = toUnsigned(val.substring(32, 34));

        out.timestamp_ms = ts;
        out.Longitude = lon;
        out.Latitude = lat;
        out.Battery = batt;
        out.Location = { lat: lat, lon: lon };
      } else if (id === "06") {
        var ts6 = getUTCTimestamp(val.substring(8, 16));
        var lon6 = toSigned(val.substring(16, 24)) / 1000000.0;
        var lat6 = toSigned(val.substring(24, 32)) / 1000000.0;

        // temp: signed int16 /10, light: uint16, battery: uint8 (common)
        var tempRaw = toSigned(val.substring(32, 36));
        var lightRaw = toUnsigned(val.substring(36, 40));
        var batt6 = toUnsigned(val.substring(40, 42));

        out.timestamp_ms = ts6;
        out.Longitude = lon6;
        out.Latitude = lat6;
        out.Air_Temperature = tempRaw / 10.0;
        out.Light = lightRaw;
        out.Battery = batt6;
        out.Location = { lat: lat6, lon: lon6 };
      } else if (id === "08") {
        // Extended frame: timestamp + optional GNSS + temp/light/battery.
        // Some payloads include BLE/WiFi scan data instead of valid GNSS.
        var ts8 = getUTCTimestamp(val.substring(8, 16));
        var lon8 = toSigned(val.substring(16, 24)) / 1000000.0;
        var lat8 = toSigned(val.substring(24, 32)) / 1000000.0;
        var tail = val.substring(val.length - 10); // last 5 bytes
        var tempRaw8 = toSigned(tail.substring(0, 4));
        var lightRaw8 = toUnsigned(tail.substring(4, 8));
        var batt8 = toUnsigned(tail.substring(8, 10));

        out.timestamp_ms = ts8;
        out.Air_Temperature = tempRaw8 / 10.0;
        out.Light = lightRaw8;
        out.Battery = batt8;

        if (lat8 >= -90 && lat8 <= 90 && lon8 >= -180 && lon8 <= 180) {
          out.Latitude = lat8;
          out.Longitude = lon8;
          out.Location = { lat: lat8, lon: lon8 };
        }
      } else if (id === "05") {
        out.Battery = toUnsigned(val.substring(0, 2));
        out.Work_Mode = toUnsigned(val.substring(2, 4));
        out.Positioning_Strategy = toUnsigned(val.substring(4, 6));
        out.SOS_Mode = toUnsigned(val.substring(6, 8));
      }
    }

    return { data: out };
  } catch (e) {
    return { data: { error: String(e) } };
  }
}

// Optional wrapper for platforms that call Decoder(bytes, fport)
function Decoder(bytes, fport) {
  var res = decodeUplink({ bytes: bytes, fPort: fport });
  return res.data;
}

/* ----------------- Frame unpacking ----------------- */
function unpack(hex) {
  var frameArray = [];
  var messageValue = (hex || "").toUpperCase();

  while (messageValue && messageValue.length >= 2) {
    var remain = messageValue;
    var dataId = remain.substring(0, 2).toUpperCase();
    var packageLen;

    switch (dataId) {
      case "01": packageLen = 94; break;
      case "02": packageLen = 32; break;
      case "03": packageLen = 64; break;
      case "04": packageLen = 20; break;
      case "05": packageLen = 10; break;
      case "06": packageLen = 44; break;
      case "07": packageLen = 84; break;
      case "08": packageLen = 70; break;
      case "09": packageLen = 36; break;
      case "0A": packageLen = 76; break;
      case "0B": packageLen = 62; break;
      case "0C": packageLen = 2;  break;
      case "0D": packageLen = 10; break;
      case "0E": packageLen = toUnsigned(remain.substring(8, 10)) * 2 + 10; break;
      case "0F": packageLen = 34; break;
      case "10": packageLen = 26; break;
      case "11": packageLen = 28; break;
      default:
        return frameArray;
    }

    if (remain.length < packageLen) return frameArray;

    if (dataId === "0C") {
      messageValue = remain.substring(packageLen);
      continue;
    }

    var dataValue;
    if (dataId === "0E") {
      dataValue = remain.substring(2, 8) + remain.substring(10, packageLen);
    } else {
      dataValue = remain.substring(2, packageLen);
    }

    frameArray.push({ dataId: dataId, dataValue: dataValue });
    messageValue = remain.substring(packageLen);
  }

  return frameArray;
}

/* ----------------- Helpers (ES5) ----------------- */
function bytesToHex(bytes) {
  var s = "";
  for (var i = 0; i < bytes.length; i++) {
    var v = bytes[i];
    if (v < 0) v = 256 + v;
    var h = v.toString(16);
    if (h.length < 2) h = "0" + h;
    s += h;
  }
  return s.toUpperCase();
}

function toUnsigned(hexStr) {
  return parseInt(hexStr, 16);
}

// Two's complement signed for 1/2/4-byte fields (hexStr length: 2/4/8)
function toSigned(hexStr) {
  var n = parseInt(hexStr, 16);
  var bits = hexStr.length * 4;
  var max = Math.pow(2, bits);
  var sign = Math.pow(2, bits - 1);
  return (n >= sign) ? (n - max) : n;
}

function getUTCTimestamp(hex8) {
  // big endian uint32 seconds
  var sec = parseInt(hex8, 16);
  return sec * 1000;
}
