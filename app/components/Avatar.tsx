import React from "react";
import { View, Text, Image } from "react-native";

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = "md", className = "" }) => {
  const getInitials = (text: string) => {
    return text
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-16 h-16 text-xl",
  };

  const currentSize = sizeClasses[size].split(" ")[0] + " " + sizeClasses[size].split(" ")[1];
  const textSize = sizeClasses[size].split(" ")[2];

  if (imageUrl) {
    return (
      <Image source={{ uri: imageUrl }} className={`rounded-full ${currentSize} ${className}`} />
    );
  }

  return (
    <View
      className={`rounded-full bg-indigo-600 items-center justify-center border border-indigo-400/30 ${currentSize} ${className}`}
    >
      <Text className={`font-bold text-white ${textSize}`}>{getInitials(name || "U")}</Text>
    </View>
  );
};
