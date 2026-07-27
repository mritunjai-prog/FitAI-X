import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import MeshGradientBackground from '../components/MeshGradientBackground';
import { fetchNotifications, markNotificationAsRead } from '../services/api/notifications';

export default function NotificationsScreen({ onNavigateBack }: { onNavigateBack: () => void }) {
  const { isDark, C, bgColors } = useTheme();
  const S = useMemo(() => getStyles(C), [C]);
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleNotificationPress = (notif: any) => {
    if (!notif.isRead) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      markAsReadMutation.mutate(notif.id);
    }
  };

  const getIconName = (type: string) => {
    switch(type) {
      case 'workout': return 'fitness-center';
      case 'recovery': return 'favorite';
      case 'system': return 'notifications';
      default: return 'notifications';
    }
  };

  const getIconColor = (type: string) => {
    switch(type) {
      case 'workout': return C.cyan;
      case 'recovery': return C.error;
      case 'system': return C.primary;
      default: return C.onSurfaceVariant;
    }
  };

  return (
    <View style={S.container}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={S.header}>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNavigateBack(); }} style={S.backBtn}>
            <Icon name="arrow-back" size={24} color={C.onSurface} />
          </TouchableOpacity>
          <Text style={S.title}>Notifications</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
          ) : notifications?.length === 0 ? (
            <View style={S.emptyState}>
              <Icon name="notifications-off" size={48} color={C.outline} />
              <Text style={S.emptyText}>You're all caught up!</Text>
            </View>
          ) : (
            notifications?.map((notif, index) => (
              <Animated.View 
                key={notif.id} 
                entering={FadeInDown.delay(index * 100).springify()} 
                exiting={FadeOut}
                style={[S.cardWrap, !notif.isRead && S.cardUnread]}
              >
                <TouchableOpacity activeOpacity={0.7} onPress={() => handleNotificationPress(notif)}>
                  <BlurView intensity={isDark ? 30 : 60} tint={C.blurTint} style={S.card}>
                    <View style={[S.iconBox, { backgroundColor: `${getIconColor(notif.type)}22` }]}>
                      <Icon name={getIconName(notif.type) as any} size={20} color={getIconColor(notif.type)} />
                    </View>
                    <View style={S.content}>
                      <View style={S.contentHeader}>
                        <Text style={S.notifTitle}>{notif.title}</Text>
                        <Text style={S.time}>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <Text style={S.message}>{notif.message}</Text>
                    </View>
                    {!notif.isRead && <View style={S.unreadDot} />}
                  </BlurView>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: C.glassInset },
  title: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', color: C.onSurface },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  
  cardWrap: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.outlineVariant },
  cardUnread: { borderColor: C.primary, borderWidth: 1.5 },
  card: { padding: 16, flexDirection: 'row', gap: 14, backgroundColor: C.surface },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  contentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: C.onSurface },
  time: { fontSize: 12, fontFamily: 'Inter_500Medium', color: C.onSurfaceVariant },
  message: { fontSize: 14, fontFamily: 'Inter_400Regular', color: C.onSurfaceVariant, lineHeight: 20 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, position: 'absolute', top: 16, right: 16 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, gap: 16 },
  emptyText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: C.onSurfaceVariant }
});
