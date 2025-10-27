import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import MapView, { Marker } from "react-native-maps";

const STORAGE_KEY = "photo-journal:items";

export default function App() {
  const [tab, setTab] = useState("gallery"); // "gallery" | "camera" | "map"
  const [items, setItems] = useState([]); // [{ uri, lat?, lon?, ts }]
  const [saving, setSaving] = useState(false);

  const cameraRef = useRef(null);
  const [camPerm, requestCamPerm] = useCameraPermissions();

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  async function persist(newItems) {
    setItems(newItems);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch {}
  }

  async function ensurePermissions() {
    if (!camPerm?.granted) {
      const { granted } = await requestCamPerm();
      if (!granted) {
        Alert.alert("Permiso requerido", "Habilitá el permiso de cámara.");
        return false;
      }
    }
    const loc = await Location.requestForegroundPermissionsAsync();
    if (loc.status !== "granted") {
      Alert.alert(
        "Ubicación denegada",
        "Podés continuar sin ubicación, pero no se guardará el lugar."
      );
    }
    return true;
  }

  async function handleTakePhoto() {
    if (!(await ensurePermissions())) return;

    try {
      setSaving(true);

      const cam = cameraRef.current;
      if (!cam) return;

      const result = await cam.takePictureAsync({ quality: 0.8, exif: false });

      const filename = `photo_${Date.now()}.jpg`;
      const dest = FileSystem.documentDirectory + filename;

      await FileSystem.copyAsync({ from: result.uri, to: dest });

      let lat, lon;
      try {
        const pos = await Location.getCurrentPositionAsync({});
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {}

      const entry = { uri: dest, lat, lon, ts: Date.now() };
      const newItems = [entry, ...items];
      await persist(newItems);

      setTab("gallery");
    } catch (e) {
      Alert.alert("Error al guardar", String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePhoto(ts) {
    const item = items.find((i) => i.ts === ts);
    if (!item) return;

    try {
      // borrá el archivo si existe
      const info = await FileSystem.getInfoAsync(item.uri);
      if (info.exists) {
        await FileSystem.deleteAsync(item.uri, { idempotent: true });
      }
    } catch {}

    const newItems = items.filter((i) => i.ts !== ts);
    await persist(newItems);
  }

  function renderItem({ item }) {
    return (
      <View style={styles.card}>
        <Image source={{ uri: item.uri }} style={styles.photo} />
        <View style={styles.meta}>
          <View style={{ flex: 1 }}>
            <Text style={styles.metaTitle}>
              {new Date(item.ts).toLocaleString()}
            </Text>
            <Text style={styles.metaSub}>
              {item.lat && item.lon
                ? `📍 ${item.lat.toFixed(5)}, ${item.lon.toFixed(5)}`
                : "Sin ubicación"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Eliminar",
                "¿Querés borrar esta foto?",
                [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Borrar", style: "destructive", onPress: () => handleDeletePhoto(item.ts) },
                ],
                { cancelable: true }
              )
            }
            style={styles.deleteBtn}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Borrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const firstWithGPS = items.find((i) => i.lat && i.lon);
  const initialRegion = {
    latitude: firstWithGPS?.lat ?? -34.6,
    longitude: firstWithGPS?.lon ?? -58.38,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Photo Journal</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setTab("gallery")}
            style={[styles.tabBtn, tab === "gallery" && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                tab === "gallery" && styles.tabTextActive,
              ]}
            >
              Galería
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("camera")}
            style={[styles.tabBtn, tab === "camera" && styles.tabActive]}
          >
            <Text
              style={[styles.tabText, tab === "camera" && styles.tabTextActive]}
            >
              Cámara
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("map")}
            style={[styles.tabBtn, tab === "map" && styles.tabActive]}
          >
            <Text
              style={[styles.tabText, tab === "map" && styles.tabTextActive]}
            >
              Mapa
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === "gallery" ? (
        items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Aún no hay fotos. ¡Abrí la cámara!
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => String(it.ts)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
          />
        )
      ) : tab === "camera" ? (
        <View style={{ flex: 1 }}>
          {camPerm?.granted ? (
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing="back"
              enableZoomGesture
            />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Concedé permiso de cámara para continuar.
              </Text>
            </View>
          )}

          <View style={styles.shutterWrap}>
            <TouchableOpacity
              onPress={handleTakePhoto}
              disabled={saving}
              style={styles.shutter}
            >
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <MapView style={{ flex: 1 }} initialRegion={initialRegion}>
          {items
            .filter((i) => i.lat && i.lon)
            .map((it) => (
              <Marker
                key={it.ts}
                coordinate={{ latitude: it.lat, longitude: it.lon }}
                title={new Date(it.ts).toLocaleString()}
                description={it.uri}
              />
            ))}
        </MapView>
      )}
    </View>
  );
}

const HEADER_TOP =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 24 : 0;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    paddingTop: HEADER_TOP,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#000",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  tabs: { flexDirection: "row", gap: 8 },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#222",
  },
  tabActive: { backgroundColor: "#5B3DF5" },
  tabText: { color: "#aaa", fontWeight: "600" },
  tabTextActive: { color: "#fff" },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: { color: "#aaa" },

  card: {
    backgroundColor: "#111",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  photo: { width: "100%", height: 240, backgroundColor: "#222" },
  meta: { padding: 12, gap: 8, flexDirection: "row", alignItems: "center" },
  metaTitle: { color: "#fff", fontWeight: "700" },
  metaSub: { color: "#bbb" },
  deleteBtn: {
    backgroundColor: "#E5484D",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },

  shutterWrap: {
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: "#000",
    backgroundColor: "#fff",
  },
});
