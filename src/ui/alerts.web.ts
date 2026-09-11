import type { Alert as NativeAlert } from 'react-native';
export const Alert: Pick<typeof NativeAlert, 'alert'> = {
  alert(title, message, buttons) {
    const text = [title, message].filter(Boolean).join('\n\n');
    const action = buttons?.find(button => button.style !== 'cancel');
    if (action) { if (window.confirm(text)) action.onPress?.(); }
    else window.alert(text);
  },
};
