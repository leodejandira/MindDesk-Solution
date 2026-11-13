import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import type { LocalFile } from "./api";

function fromDoc(r: DocumentPicker.DocumentPickerResult): LocalFile | null {
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, name: a.name, mimeType: a.mimeType, file: (a as any).file };
}

export async function pickPdf(): Promise<LocalFile | null> {
  return fromDoc(await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true }));
}

export async function pickDocument(): Promise<LocalFile | null> {
  return fromDoc(await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true }));
}

/** Foto da câmera ou da galeria (ex.: atestado). */
export async function pickPhoto(source: "camera" | "library", front = false): Promise<LocalFile | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("Permissão da câmera negada.");
  }
  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: front ? 0.5 : 0.7, // selfie de ponto mais leve; atestado mantém qualidade para o OCR
    ...(front && { cameraType: ImagePicker.CameraType.front }),
  };
  const r = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, name: a.fileName || `atestado_${Date.now()}.jpg`, mimeType: a.mimeType || "image/jpeg", file: (a as any).file };
}
