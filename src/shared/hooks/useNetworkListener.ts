import { useEffect } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useNetworkStore } from "@/shared/store/useNetworkStore";

export function useNetworkListener() {
  const setNetworkState = useNetworkStore((s) => s.setNetworkState);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkState(state.isConnected ?? false, state.isInternetReachable);
    });

    return () => unsubscribe();
  }, [setNetworkState]);
}
