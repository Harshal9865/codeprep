export const TIMER_CONFIG = {
  // Active time thresholds in seconds required before AI Solution unlocks
  UNLOCK_THRESHOLDS: {
    Easy: 15 * 60, // 15 minutes (900 seconds)
    Medium: 30 * 60, // 30 minutes (1800 seconds)
    Hard: 45 * 60, // 45 minutes (2700 seconds)
  } as Record<string, number>,

  // Maximum allowed gap between heartbeats (in seconds) counted as continuous active time
  // Protects against system clock tampering and background tab accumulation
  MAX_HEARTBEAT_GAP_SECONDS: 10,

  // Idle timeout: pauses active time after 2 minutes (120 seconds) of no user activity
  IDLE_THRESHOLD_SECONDS: 120,

  // Client heartbeat transmission frequency (in seconds)
  HEARTBEAT_INTERVAL_SECONDS: 5,
};

