import React from 'react';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
export type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
export default function DateTimePicker({ value, mode, onChange }: {
  value: Date; mode: 'date' | 'time'; is24Hour?: boolean; display?: string;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
}) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatted = mode === 'date' ? `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}` : `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  return <input aria-label={mode === 'date' ? '締切日' : '締切時刻'} type={mode} value={formatted}
    style={{ padding: 12, fontSize: 16, border: '1px solid #ccd5d0', borderRadius: 10 }}
    onChange={event => {
      if (!event.target.value) return;
      const next = new Date(value);
      if (mode === 'date') { const [y, m, d] = event.target.value.split('-').map(Number); if (y === undefined || m === undefined || d === undefined) return; next.setFullYear(y, m - 1, d); }
      else { const [h, m] = event.target.value.split(':').map(Number); if (h === undefined || m === undefined) return; next.setHours(h, m, 0, 0); }
      if (Number.isNaN(next.getTime())) return;
      onChange({ type: 'set', nativeEvent: { timestamp: next.getTime(), utcOffset: -next.getTimezoneOffset() } }, next);
    }} />;
}
