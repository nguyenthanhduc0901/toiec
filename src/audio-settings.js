"use strict";
class AudioSettings {
  constructor(storage) {
    this.storage = storage;
    this.key = "toeic-studio-audio-speeds-v1";
    this.defaults = { 1: 1, 2: 1.2, 3: 1.1, 4: 1.1 };
    this.rates = { ...this.defaults };
    this.reload();
  }
  valid(rate) {
    return Number.isFinite(rate) && rate >= 0.5 && rate <= 3;
  }
  reload() {
    this.rates = { ...this.defaults };
    try {
      const saved = JSON.parse(this.storage.getItem(this.key) || "null");
      for (const part of [1, 2, 3, 4]) {
        if (this.valid(saved?.[part])) this.rates[part] = saved[part];
      }
    } catch {
      // Default speeds also work when browser storage is unavailable.
    }
  }
  rate(part) {
    return this.rates[part] || 1;
  }
  set(part, rate) {
    if (
      !this.valid(rate) ||
      (part !== "all" && !Object.hasOwn(this.defaults, part))
    ) {
      throw new Error("Choose a speed between 0.5× and 3×.");
    }
    if (part === "all") {
      for (const key of [1, 2, 3, 4]) this.rates[key] = rate;
    } else this.rates[part] = rate;
    this.persist();
  }
  reset() {
    this.rates = { ...this.defaults };
    this.persist();
  }
  persist() {
    this.storage.setItem(this.key, JSON.stringify(this.rates));
  }
}
