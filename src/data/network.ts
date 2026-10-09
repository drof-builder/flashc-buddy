import NetInfo from '@react-native-community/netinfo';

/** True unless the phone reports it has no connection at all. */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected !== false;
}
