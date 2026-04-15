import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import ThemeToggle from '../components/ThemeToggle';
import { warmUpServer } from '../lib/api';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: 1,
    title: "Chào mừng đến FitPass",
    subtitle: "Hành trình thể dục của bạn bắt đầu từ đây",
    description: "Theo dõi quá trình tập luyện, tham gia các lớp học và đạt được mục tiêu thể dục với nền tảng đầy đủ của chúng tôi.",
    iconName: "fitness-outline",
    gradient: ["#3B82F6", "#1E40AF"],
  },
  {
    id: 2,
    title: "Tham gia các lớp thể dục",
    subtitle: "Lựa chọn từ nhiều hoạt động đa dạng",
    description: "Khám phá yoga, cardio, tập sức mạnh và nhiều hơn nữa. Đăng ký các lớp học với các huấn luyện viên chuyên nghiệp.",
    iconName: "calendar-outline",
    gradient: ["#8B5CF6", "#6D28D9"],
  },
  {
    id: 3,
    title: "Theo dõi tiến độ",
    subtitle: "Duy trì động lực và kiên trì",
    description: "Giám sát quá trình tham gia, theo dõi sự cải thiện và cử chúng mừng các thành tích của bạn.",
    iconName: "stats-chart-outline",
    gradient: ["#10B981", "#047857"],
  },
  {
    id: 4,
    title: "Sẵn sàng bắt đầu chưa?",
    subtitle: "Hãy cùng những bước đầu tiên",
    description: "Tạo tài khoản hoặc đăng nhập để bắt đầu hành trình thể dục cá nhân hoá của bạn hôm nay.",
    iconName: "rocket-outline",
    gradient: ["#F59E0B", "#D97706"],
  },
];

export default function WelcomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Wake up Render free-tier server as early as possible
  useEffect(() => {
    warmUpServer();
  }, []);

  const nextStep = () => {
    if (currentIndex < onboardingData.length - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(currentIndex + 1);
        slideAnim.setValue(0);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    } else {
      navigation.navigate('Login' as never);
    }
  };

  const skipToEnd = () => {
    navigation.navigate('Login' as never);
  };

  const currentData = onboardingData[currentIndex];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: currentData.gradient[0] }}>
      <View className="flex-1">
        {/* Skip Button and Theme Toggle */}
        <View className="flex-row justify-between items-center p-6 pt-12">
          <View style={{ width: 40 }}>
            <ThemeToggle size="sm" />
          </View>
          <TouchableOpacity onPress={skipToEnd} className="px-4 py-2">
            <Text className="text-white font-semibold text-16">Bỏ qua</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Animated.View style={[
          { 
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center', 
            paddingHorizontal: 32 
          }
        ]}>
          {/* Icon */}
          <View 
            className="w-40 h-40 rounded-full items-center justify-center mb-10"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 15 },
              shadowOpacity: 0.35,
              shadowRadius: 25,
              elevation: 20,
            }}
          >
            <Ionicons name={currentData.iconName as any} size={80} color="#fff" />
          </View>

          {/* Title */}
          <Text className="text-white text-4xl font-bold text-center mb-4">
            {currentData.title}
          </Text>

          {/* Subtitle */}
          <Text className="text-white text-xl font-medium text-center mb-6 opacity-90">
            {currentData.subtitle}
          </Text>

          {/* Description */}
          <Text className="text-white text-lg text-center leading-7 opacity-80 mb-12">
            {currentData.description}
          </Text>

          {/* Progress Dots */}
          <View className="flex-row space-x-3 mb-12">
            {onboardingData.map((_, index) => (
              <View
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index === currentIndex ? 'bg-white' : 'bg-white opacity-40'
                }`}
              />
            ))}
          </View>
        </Animated.View>

        {/* Bottom Button */}
        <View className="px-8 pb-12">
          <TouchableOpacity
            onPress={nextStep}
            className="w-full py-4 rounded-2xl items-center justify-center flex-row"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderWidth: 2,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <Text className="text-white text-xl font-bold mr-2">
              {currentIndex === onboardingData.length - 1 ? 'Bắt đầu' : 'Tiếp tục'}
            </Text>
            <Ionicons 
              name={currentIndex === onboardingData.length - 1 ? 'rocket' : 'arrow-forward'} 
              size={20} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}