/** An on/off choice kept between visits (a private window may refuse to keep it: then it's just on). */
export interface StoredSetting {
  load(): boolean;
  save(on: boolean): void;
}

/** An on/off choice kept in the browser's local storage under `key`. On until the player turns it off. */
export function storedSetting(key: string, storage: () => Storage = () => localStorage): StoredSetting {
  return {
    load: () => {
      try {
        return storage().getItem(key) !== 'off';
      } catch {
        return true;
      }
    },
    save: (on) => {
      try {
        storage().setItem(key, on ? 'on' : 'off');
      } catch {
        // storage blocked: the choice lasts until the page closes
      }
    },
  };
}
