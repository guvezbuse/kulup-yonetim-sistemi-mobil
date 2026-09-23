import React from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  className?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = "", ...props }) => {
  return (
    <View className={`w-full mb-4 ${className}`}>
      <Text className="text-slate-300 text-sm font-medium mb-1.5">{label}</Text>
      <TextInput
        placeholderTextColor="#64748b"
        className={`w-full bg-slate-800 text-white px-4 py-3 rounded-xl border ${
          error ? "border-rose-500" : "border-slate-700 focus:border-indigo-500"
        } text-base`}
        {...props}
      />
      {error && <Text className="text-rose-400 text-xs mt-1 font-medium">{error}</Text>}
    </View>
  );
};
