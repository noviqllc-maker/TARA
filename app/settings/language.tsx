// app/settings/language.tsx
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card } from '@/components/ui';
import { LANGUAGES, getLanguage, setLanguage } from '@/lib/language';
import { colors } from '@/theme';

export default function LanguageSettings() {
  const [active, setActive] = useState('English');
  useEffect(() => { getLanguage().then(setActive); }, []);

  const choose = async (code: string) => { setActive(code); await setLanguage(code); };

  return (
    <Screen>
      <SubHeader eyebrow="Settings" title="Language" />
      <Card style={{ marginBottom: 16 }}>
        <Text variant="tiny" color={colors.muted}>
          Tara will reply in your chosen language. App menus stay in English for now.
        </Text>
      </Card>
      <Card>
        {LANGUAGES.map((l, i) => (
          <Pressable
            key={l.code}
            onPress={() => choose(l.code)}
            style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingVertical: 14,
              borderBottomWidth: i === LANGUAGES.length - 1 ? 0 : 1,
              borderBottomColor: 'rgba(205,163,73,0.1)',
            }}
          >
            <View>
              <Text variant="body" style={{ fontSize: 15 }}>{l.native}</Text>
              {l.native !== l.code && <Text variant="tiny" color={colors.muted}>{l.code}</Text>}
            </View>
            {active === l.code && <Text style={{ color: colors.gold, fontSize: 18 }}>✓</Text>}
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}
