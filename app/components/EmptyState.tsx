import React from "react";
import { View, Text } from "react-native";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionTitle,
  onAction,
  className = "",
}) => {
  return (
    <View
      className={`items-center justify-center p-8 bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl ${className}`}
    >
      <Text className="text-lg font-bold text-white text-center mb-1">{title}</Text>
      <Text className="text-sm text-slate-400 text-center mb-5">{description}</Text>
      {actionTitle && onAction && (
        <Button title={actionTitle} onPress={onAction} variant="outline" className="w-auto px-6" />
      )}
    </View>
  );
};
