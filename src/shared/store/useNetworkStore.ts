import { create } from "zustand";

type NetworkStore = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  setNetworkState: (isConnected: boolean, isInternetReachable: boolean | null) => void;
};

export const useNetworkStore = create<NetworkStore>((set) => ({
  isConnected: true,
  isInternetReachable: true,

  setNetworkState: (isConnected, isInternetReachable) => {
    set({ isConnected, isInternetReachable });
  },
}));
