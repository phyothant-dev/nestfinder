import { create } from "zustand";

type CompareStore = {
  items: any[];
  add: (property: any) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useCompareStore = create<CompareStore>((set) => ({
  items: [],
  add: (property) =>
    set((state) => {
      if (state.items.some((i) => i.id === property.id)) return state;
      return { items: [...state.items, property] };
    }),
  remove: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  clear: () => set({ items: [] }),
}));
