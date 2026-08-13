import { useState } from "react";
import { useRouter } from "expo-router";
import { Image, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Label,
  Row,
  Screen,
  Spacer,
  T,
  colors,
  radius,
  spacing,
  useApi,
  useLocale,
} from "@pickup/ui-native";
import type { CollectorLookup } from "@pickup/shared";
import { ScreenHeader } from "../../../components/ScreenHeader";

type Mode = "driver" | "relative";

/**
 * Add a collector.
 *
 * The school approves nobody. A driver self-registers and is invisible until a
 * parent links him — so there is no approved list to pick from. The parent
 * looks him up by the phone number he gave her, checks his photo against the
 * man she actually hired, and decides.
 *
 * Deliberately a LOOKUP, not a search: you cannot browse drivers, only confirm
 * one you already know. And there is no automated face match — she knows what
 * he looks like, and an algorithm reporting a percentage is worse than a
 * person looking at a picture.
 */
export default function AddCollectorScreen() {
  const api = useApi();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { strings } = useLocale();

  const [mode, setMode] = useState<Mode>("driver");
  const [phone, setPhone] = useState("");
  const [found, setFound] = useState<CollectorLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [relativePhone, setRelativePhone] = useState("");

  const children = useQuery({
    queryKey: ["myChildren"],
    queryFn: () => api.getMyChildren(),
  });

  const lookup = useMutation({
    mutationFn: (p: string) => api.lookupCollector(p),
    onSuccess: (data) => {
      setFound(data);
      setError(null);
    },
    onError: () => {
      setFound(null);
      setError(strings.parent.driverNotFound);
    },
  });

  const grant = useMutation({
    mutationFn: async (collectorId: string) => {
      for (const studentId of selectedChildren) {
        await api.grantAuthorization(studentId, collectorId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myCollectors"] });
      router.back();
    },
  });

  function toggleChild(id: string) {
    setSelectedChildren((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  const canSave =
    selectedChildren.length > 0 &&
    (mode === "driver" ? !!found : name.trim() !== "" && relativePhone.trim() !== "");

  return (
    <Screen>
      <ScreenHeader title={strings.parent.addCollector} />

      <Row gap={spacing.xs}>
        <Button
          label={strings.role.driver}
          variant={mode === "driver" ? "ink" : "secondary"}
          onPress={() => setMode("driver")}
        />
        <Button
          label={strings.parent.addRelative}
          variant={mode === "relative" ? "ink" : "secondary"}
          onPress={() => setMode("relative")}
        />
      </Row>

      <Spacer h={spacing.lg} />

      {mode === "driver" ? (
        <>
          <Field
            label={strings.parent.driverPhone}
            hint={strings.parent.driverPhoneNote}
          >
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="+92 321 5000011"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </Field>
          <Button
            label={lookup.isPending ? strings.common.loading : strings.common.search}
            variant="primary"
            full
            disabled={phone.trim().length < 5 || lookup.isPending}
            onPress={() => lookup.mutate(phone)}
          />

          {error ? (
            <>
              <Spacer h={spacing.sm} />
              <T variant="bodySm" color={colors.error}>
                {error}
              </T>
            </>
          ) : null}

          {found ? (
            <>
              <Spacer h={spacing.lg} />
              <Card accent="primary">
                <Row align="flex-start">
                  {found.selfie_url ? (
                    <Image
                      source={{ uri: found.selfie_url }}
                      style={{ width: 72, height: 72, borderRadius: radius.pill }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: radius.pill,
                        backgroundColor: colors.surfaceStrong,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <T variant="caption" color={colors.muted}>
                        no photo
                      </T>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <T variant="titleMd" color={colors.ink}>
                      {found.name}
                    </T>
                    <Spacer h={4} />
                    <T variant="caption" color={colors.muted}>
                      {found.phone}
                      {found.cnic_last4 ? ` · CNIC ••••${found.cnic_last4}` : ""}
                    </T>
                    {found.vehicle ? (
                      <>
                        <Spacer h={6} />
                        <Row gap={6} style={{ flexWrap: "wrap" }}>
                          <Badge tone="neutral">{found.vehicle.registration_no}</Badge>
                          {found.vehicle.expected_arrival ? (
                            <Badge tone="neutral">
                              arrives {found.vehicle.expected_arrival}
                            </Badge>
                          ) : null}
                        </Row>
                      </>
                    ) : null}
                    {found.linked_families > 0 ? (
                      <>
                        <Spacer h={6} />
                        <T variant="caption" color={colors.mutedSoft}>
                          {found.linked_families} other{" "}
                          {found.linked_families === 1 ? "family uses" : "families use"}{" "}
                          him
                        </T>
                      </>
                    ) : null}
                  </View>
                </Row>

                <Spacer h={spacing.base} />
                {/* The school has vetted nobody. She is the check. */}
                <View
                  style={{
                    borderStartWidth: 3,
                    borderStartColor: colors.primary,
                    paddingStart: spacing.sm,
                  }}
                >
                  <T variant="caption" color={colors.body}>
                    {found.verify_yourself}
                  </T>
                </View>
              </Card>
            </>
          ) : null}
        </>
      ) : (
        <Card>
          <Field label={strings.parent.relativeName}>
            <Input value={name} onChangeText={setName} placeholder={strings.parent.relativeNamePlaceholder} />
          </Field>
          <Field
            label={strings.auth.phone}
            hint={strings.parent.relativeNote}
          >
            <Input
              value={relativePhone}
              onChangeText={setRelativePhone}
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
        Access is per child, and only ever your own. You can remove it at any
        time, and it never affects another family.
      </T>

      <Spacer h={spacing.lg} />
      <Button
        label={grant.isPending ? strings.common.loading : strings.common.save}
        variant="primary"
        full
        disabled={!canSave || grant.isPending}
        onPress={() => found && grant.mutate(found.id)}
      />
    </Screen>
  );
}
