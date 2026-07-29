import React from 'react';
import { View, Text, Pressable, Platform, StatusBar as RNStatusBar, StyleSheet } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { F } from '../theme';

export type TopBarAction = 'theme' | 'settings' | 'palette' | 'notifications' | 'back';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  onAction?: (action: TopBarAction) => void;
  rightActions?: TopBarAction[];
  unreadCount?: number;
}

export default function TopBar({
  title,
  showBack = false,
  onBack,
  onAction,
  rightActions = ['theme', 'palette', 'notifications'],
  unreadCount = 0,
}: TopBarProps) {
  const { C, isDark, toggleTheme } = useTheme();

  const handleAction = (action: TopBarAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (action === 'theme') {
      toggleTheme();
      return;
    }
    onAction?.(action);
  };

  const renderButton = (action: TopBarAction) => {
    switch (action) {
      case 'theme':
        return (
          <Pressable key="theme" onPress={() => handleAction('theme')} hitSlop={8} style={s.btn}>
            <Icon name={isDark ? 'light-mode' : 'dark-mode'} size={22} color={C.onSurface} />
          </Pressable>
        );
      case 'settings':
        return (
          <Pressable key="settings" onPress={() => handleAction('settings')} hitSlop={8} style={s.btn}>
            <Icon name="settings" size={22} color={C.onSurface} />
          </Pressable>
        );
      case 'palette':
        return (
          <Pressable key="palette" onPress={() => handleAction('palette')} hitSlop={8} style={s.btn}>
            <Icon name="search" size={22} color={C.onSurface} />
          </Pressable>
        );
      case 'notifications':
        return (
          <View key="notifications">
            <Pressable onPress={() => handleAction('notifications')} hitSlop={8} style={s.btn}>
              <Icon name="notifications" size={22} color={C.onSurface} />
              {unreadCount > 0 && (
                <View style={[s.badge, { backgroundColor: C.primary, borderColor: C.bg }]} />
              )}
            </Pressable>
          </View>
        );
      case 'back':
        return (
          <Pressable key="back" onPress={() => onBack?.()} hitSlop={8} style={s.btn}>
            <Icon name="chevron-left" size={22} color={C.onSurface} />
          </Pressable>
        );
    }
  };

  return (
    <View style={[s.container, { borderBottomColor: `${C.onSurface}15` }]}>
      <View style={s.left}>
        {showBack ? renderButton('back') : <View style={{ width: 36 }} />}
        {title && (
          <Text style={[s.title, { color: C.onSurface }]} numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>
      <View style={s.right}>
        {rightActions.map(a => renderButton(a))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 6 : (RNStatusBar.currentHeight ?? 0) * 0.2 + 6,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  btn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 2,
  },
  title: {
    fontFamily: F.header,
    fontSize: 15.5,
    letterSpacing: -0.2,
  },
});
