type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "AUTH";

class Logger {
  private static formatMessage(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toLocaleTimeString();
    const icon = {
      INFO: "🔹",
      WARN: "⚠️",
      ERROR: "❌",
      DEBUG: "🐛",
      AUTH: "🔐",
    }[level];

    // Every log line keeps a stable timestamp-level-message shape for debugging.
    let logLine = `[${timestamp}] ${icon} [${level}] -> ${message}`;

    if (data) {
      console.log(logLine, "\n   Data:", JSON.stringify(data, null, 2));
    } else {
      console.log(logLine);
    }
  }

  static info(msg: string, data?: any) {
    this.formatMessage("INFO", msg);
  }
  static warn(msg: string, data?: any) {
    this.formatMessage("WARN", msg);
  }
  static error(msg: string, data?: any) {
    this.formatMessage("ERROR", msg);
  }
  static debug(msg: string, data?: any) {
    this.formatMessage("DEBUG", msg);
  }
  static auth(msg: string, data?: any) {
    this.formatMessage("AUTH", msg);
  }
}

export default Logger;
