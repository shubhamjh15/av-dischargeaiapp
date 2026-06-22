// Global singleton: only one FieldMic can be active at a time.
// When a new mic starts, the previous one is stopped cleanly first.

type StopFn = () => void;

let activeMicStop: StopFn | null = null;

export function registerActiveMic(stop: StopFn): void {
  if (activeMicStop) {
    activeMicStop();
  }
  activeMicStop = stop;
}

export function unregisterActiveMic(stop: StopFn): void {
  if (activeMicStop === stop) {
    activeMicStop = null;
  }
}
