import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

const storageKey = "PJ:photos";

export default function App() {
  const [tab, setTab] = useState("gallery"); // "gallery" | "camera"
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const camRef = useRef(null);

  // Cargar galería guardada
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) setItems(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  // Pedir permisos al abrir cámara
  useEffect(() => {
    if (tab !== "camera") return;
    (async () => {
      try {
        if (!camPerm?.granted) await requestCamPerm();

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Permiso de ubicación denegado");
        }
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [tab]);

  async function takePhoto() {
    if (!camRef.current || saving) return;
    try {
      setSaving(true);
      const photo = await camRef.current.takePictureAsync({ quality: 0.8 });

      // Intentar ubicación (opcional)
      let coords = { lat: undefined, lon: undefined };
      try {
        const pos = await Location.getCurrentPositionAsync({});
        coords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
      } catch {
        // puede fallar si no hay permiso/GPS
      }

      // Copiar al sandbox de la app (persistencia)
      const fileName = `${Date.now()}.jpg`;
      const dest = FileSystem.documentDirectory + fileName;
      await FileSystem.copyAsync({ from: photo.uri, to: dest });

      const entry = {
        uri: dest,
        ts: Date.now(),
        ...coords,
      };

      const next = [entry, ...items];
      setItems(next);
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));

      setTab("gallery");
    } catch (e) {
      console.warn("Error al tomar/guardar foto:", e);
    } finally {
      setSaving(false);
    }
  }

  async function deletePhoto(uriToDelete) {
    try {
      // 1) Borrar archivo (idempotente = no falla si ya no existe)
      await FileSystem.deleteAsync(uriToDelete, { idempotent: true });

      // 2) Actualizar estado y persistencia
      const next = items.filter((p) => p.uri !== uriToDelete);
      setItems(next);
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    } catch (e) {
      console.warn("Error al eliminar la foto:", e);
    }
  }

  function renderItem({ item }) {
    const date = new Date(item.ts);
    return (
      <View style={styles.card}>
        <Image source={{ uri: item.uri }} style={styles.photo} />
        <View style={styles.cardFooter}>
          <Text style={styles.date}>
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </Text>

          <View style={styles.footerRow}>
            <Text style={styles.coords}>
              📍{" "}
              {item.lat != null && item.lon != null
                ? `${item.lat.toFixed(5)}, ${item.lon.toFixed(5)}`
                : "sin ubicación"}
            </Text>

            <TouchableOpacity
              onPress={() => deletePhoto(item.uri)}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteLabel}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Photo Journal</Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setTab("gallery")}
            style={[styles.tabBtn, tab === "gallery" && styles.tabBtnActive]}
          >
            <Text
              style={[
                styles.tabLabel,
                tab === "gallery" && styles.tabLabelActive,
              ]}
            >
              Galería
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("camera")}
            style={[styles.tabBtn, tab === "camera" && styles.tabBtnActive]}
          >
            <Text
              style={[
                styles.tabLabel,
                tab === "camera" && styles.tabLabelActive,
              ]}
            >
              Cámara
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === "camera" ? (
        <View style={{ flex: 1 }}>
          {camPerm?.granted ? (
            <>
              <CameraView ref={camRef} style={{ flex: 1 }} facing="back" />
              <View style={styles.snapBar}>
                <TouchableOpacity
                  onPress={takePhoto}
                  disabled={saving}
                  style={[styles.snapBtn, saving && { opacity: 0.6 }]}
                >
                  <Text style={styles.snapLabel}>
                    {saving ? "Guardando..." : "Tomar foto"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.center}>
              <Text style={{ color: "#ccc", marginBottom: 12 }}>
                Sin permiso de cámara
              </Text>
              <TouchableOpacity
                onPress={requestCamPerm}
                style={styles.requestBtn}
              >
                <Text style={{ color: "white", fontWeight: "600" }}>
                  Pedir permiso
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.uri}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: "#888" }}>
                Aún no hay fotos. ¡Abrí la cámara!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: "#000",
  },
  title: { color: "white", fontSize: 22, fontWeight: "700", marginBottom: 10 },
  tabs: { flexDirection: "row", gap: 10 },
  tabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#1c1c1c",
  },
  tabBtnActive: { backgroundColor: "#5b3df5" },
  tabLabel: { color: "#bdbdbd", fontWeight: "600" },
  tabLabelActive: { color: "white" },

  card: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#141414",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  photo: { width: "100%", height: 260, backgroundColor: "#111" },
  cardFooter: { padding: 12 },
  date: { color: "white", fontWeight: "700", marginBottom: 6 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  coords: { color: "#aaa", fontSize: 12 },

  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
  },
  deleteLabel: { color: "#ff6b6b", fontWeight: "700" },

  snapBar: {
    position: "absolute",
    bottom: 26,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  snapBtn: {
    backgroundColor: "#5b3df5",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 40,
  },
  snapLabel: { color: "white", fontWeight: "700", fontSize: 16 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  requestBtn: {
    backgroundColor: "#5b3df5",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
});
