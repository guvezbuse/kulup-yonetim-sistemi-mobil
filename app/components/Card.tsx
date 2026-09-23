import React from "react";
import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "", ...props }) => {
  return (
    <View
      className={`bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </View>
  );
};
