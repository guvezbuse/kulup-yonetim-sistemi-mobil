import React from "react";
import { View, Text } from "react-native";

interface BadgeProps {
  label: string;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = "info", className = "" }) => {
  const getStyles = () => {
    switch (variant) {
      case "success":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "warning":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "danger":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      case "neutral":
        return "bg-slate-700/40 border-slate-600 text-slate-300";
      case "info":
      default:
        return "bg-indigo-500/10 border-indigo-500/30 text-indigo-400";
    }
  };

  const textClass = getStyles().split(" ").pop();
  const containerClass = getStyles().replace(textClass || "", "");

  return (
    <View className={`px-2.5 py-1 rounded-full border self-start ${containerClass} ${className}`}>
      <Text className={`text-xs font-semibold ${textClass}`}>{label}</Text>
    </View>
  );
};
