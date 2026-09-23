import React from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "outline";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return "bg-slate-700 active:bg-slate-800";
      case "danger":
        return "bg-rose-600 active:bg-rose-700";
      case "outline":
        return "bg-transparent border border-indigo-500 active:bg-indigo-950/30";
      case "primary":
      default:
        return "bg-indigo-600 active:bg-indigo-700";
    }
  };

  const getTextColor = () => {
    if (variant === "outline") return "text-indigo-400";
    return "text-white";
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`w-full py-3.5 px-4 rounded-xl flex-row justify-center items-center ${getVariantStyles()} ${
        disabled ? "opacity-50" : ""
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text className={`font-semibold text-base ${getTextColor()}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};
