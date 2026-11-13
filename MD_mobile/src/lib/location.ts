import * as Location from "expo-location";

export type Posicao = { latitude: number; longitude: number; precisao: number | null; mocked: boolean };

/** Pede permissão e lê a posição atual com alta precisão. */
export async function posicaoAtual(): Promise<Posicao> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) throw new Error("Permita o acesso à localização para registrar o ponto.");
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    precisao: pos.coords.accuracy ?? null,
    mocked: !!pos.mocked, // Android informa quando a posição vem de app de GPS falso
  };
}
