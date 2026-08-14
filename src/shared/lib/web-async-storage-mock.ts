const store = new Map<string, string>();

export default {
  getItem: (key: string) => Promise.resolve(store.get(key) ?? null),
  setItem: (key: string, value: string) => {
    store.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    store.delete(key);
    return Promise.resolve();
  },
  clear: () => {
    store.clear();
    return Promise.resolve();
  },
  getAllKeys: () => Promise.resolve(Array.from(store.keys())),
  multiGet: (keys: string[]) =>
    Promise.resolve(keys.map((k) => [k, store.get(k) ?? null] as [string, string | null])),
  multiSet: (kvPairs: [string, string][]) => {
    kvPairs.forEach(([k, v]) => store.set(k, v));
    return Promise.resolve();
  },
  multiRemove: (keys: string[]) => {
    keys.forEach((k) => store.delete(k));
    return Promise.resolve();
  },
};
