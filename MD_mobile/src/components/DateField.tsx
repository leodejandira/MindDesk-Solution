import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { formatDateBR, isoDate } from "@/lib/logic";
import { useTheme } from "@/lib/theme";
import { Input, T } from "./ui";

type Props = { label: string; value: string; onChange: (iso: string) => void; min?: string; max?: string };

/** Campo de data (AAAA-MM-DD). Picker nativo no celular, texto no navegador. */
export function DateField({ label, value, onChange, min, max }: Props) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);

  if (Platform.OS === "web")
    return <Input label={label} value={value} onChangeText={onChange} placeholder="AAAA-MM-DD" />;

  const toDate = (s?: string) => (s ? new Date(s + "T12:00:00") : undefined);
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <T size={12} muted bold style={{ textTransform: "uppercase" }}>{label}</T>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ height: 50, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 14, justifyContent: "center", backgroundColor: c.card }}
      >
        <T>{formatDateBR(value)}</T>
      </Pressable>
      {open && (
        <DateTimePicker
          value={toDate(value) ?? new Date()}
          mode="date"
          minimumDate={toDate(min)}
          maximumDate={toDate(max)}
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === "set" && d) onChange(isoDate(d));
          }}
        />
      )}
    </View>
  );
}
