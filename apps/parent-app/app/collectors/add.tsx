import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Label,
  Loading,
  PageTitle,
  Row,
  Screen,
  Spacer,
  T,
  colors,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import { ScreenHeader } from "../../components/ScreenHeader";

type Mode = "driver" | "relative";

/**
 * Add a collector — two paths, one model.
 *
 *  - DRIVER: registered and vetted by the school once. The parent picks from
 *    the school's approved list. This is what guarantees one driver = one
 *    account; if every parent created their own driver record, one van would
 *    appear many times in the queue.
 *
 *  - RELATIVE: added directly by the parent, no school vetting. A family
 *    matter, not a school one.
 *
 * Both become `kind: "standing"` authorizations and both get a rotating QR.
 */
export default function AddCollectorScreen() {
  const api = useApi();
  const router = useRouter();
  const { strings } = useLocale();

  const [mode, setMode] = useState<Mode>("driver");
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: () => api.listVehicles() });
  const children = useQuery({ queryKey: ["myChildren"], queryFn: () => api.getMyChildren() });

  function toggleChild(id: string) {
    setSelectedChildren((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  const canSave =
    selectedChildren.length > 0 &&
    (mode === "driver" ? !!selectedDriver : name.trim() !== "" && phone.trim() !== "");

  return (
    <Screen>
      <ScreenHeader title={strings.parent.addCollector} />
      <PageTitle title={strings.parent.addCollector} />

      <Row gap={spacing.xs}>
        <Button
          label={strings.parent.pickDriver}
          variant={mode === "driver" ? "ink" : "secondary"}
          onPress={() => setMode("driver")}
        />
        <Button
          label={strings.parent.addRelative}
          variant={mode === "relative" ? "ink" : "secondary"}
          onPress={() => setMode("relative")}
        />
      </Row>

      <Spacer h={spacing.sm} />
      <T variant="caption" color={colors.muted}>
        {mode === "driver" ? strings.parent.pickDriverNote : strings.parent.addRelativeNote}
      </T>
      <Spacer h={spacing.lg} />

      {mode === "driver" ? (
        vehicles.isLoading ? (
          <Loading />
        ) : (
          vehicles.data?.map((v) => {
            const on = selectedDriver === v.driver_user_id;
            return (
              <View key={v.id} style={{ marginBottom: spacing.sm }}>
                <Card accent={on ? "primary" : "none"}>
                  <Row>
                    <View style={{ flex: 1 }}>
                      <T variant="titleMd" color={colors.ink}>
                        {v.driver_name}
                      </T>
                      <Spacer h={4} />
                      <T variant="caption" color={colors.muted}>
                        {v.registration_no} · {strings.drivers.capacity} {v.capacity}
                      </T>
                    </View>
                    <Button
                      label={on ? "✓" : strings.common.add}
                      variant={on ? "primary" : "secondary"}
                      onPress={() => setSelectedDriver(on ? null : v.driver_user_id)}
                    />
                  </Row>
                </Card>
              </View>
            );
          })
        )
      ) : (
        <Card>
          <Field label="Name">
            <Input value={name} onChangeText={setName} placeholder="Rukhsana Bibi" />
          </Field>
          <Field
            label={strings.auth.phone}
            hint="They sign in with this number and get their own pickup code."
          >
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="+92 333 1000090"
              keyboardType="phone-pad"
            />
          </Field>
        </Card>
      )}

      <Spacer h={spacing.lg} />
      <Label>{strings.parent.whichChildren}</Label>
      <Spacer h={spacing.sm} />

      <Row gap={spacing.xs} style={{ flexWrap: "wrap" }}>
        {children.data?.map((c) => (
          <Button
            key={c.id}
            label={`${selectedChildren.includes(c.id) ? "✓ " : ""}${c.name}`}
            variant={selectedChildren.includes(c.id) ? "ink" : "secondary"}
            onPress={() => toggleChild(c.id)}
          />
        ))}
      </Row>

      <Spacer h={spacing.sm} />
      <T variant="caption" color={colors.mutedSoft}>
        Access is per child. You can change or remove it at any time, and it
        only ever affects your own children.
      </T>

      <Spacer h={spacing.lg} />
      <Button
        label={strings.common.save}
        variant="primary"
        full
        disabled={!canSave}
        onPress={() => router.back()}
      />
    </Screen>
  );
}
