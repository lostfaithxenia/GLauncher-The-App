import { warmRopeAsync } from "./sim.js";

export function cachedWarmRope(_name, rope, dt) {
  return warmRopeAsync(rope, dt);
}
