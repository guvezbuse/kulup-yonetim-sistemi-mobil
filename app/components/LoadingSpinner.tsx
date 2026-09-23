import React from "react";
import { View, ActivityIndicator, Text } from "react-native";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message, className = "" }) => {
  return (
    <View className={`items-center justify-center p-6 ${className}`}>
      <ActivityIndicator size="large" color="#6366f1" />
      {message && <Text className="text-slate-400 text-sm mt-3 font-medium">{message}</Text>}
    </View>
  );
};
