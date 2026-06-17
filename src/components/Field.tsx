// src/components/Field.tsx
import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { colors, fonts, radius } from '@/theme';

export default function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.mutedDim}
      style={styles.field}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: 16,
    color: colors.cream,
    fontFamily: fonts.sans,
    fontSize: 17,
  },
});
