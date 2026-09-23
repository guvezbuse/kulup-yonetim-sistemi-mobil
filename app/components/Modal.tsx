import React from "react";
import { Modal as RNModal, View, Text, TouchableOpacity } from "react-native";
import { Card } from "./Card";

interface ModalProps {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({ visible, title, children, onClose }) => {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <Card className="w-full bg-slate-900 border-slate-700">
          <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-800">
            <Text className="text-lg font-bold text-white">{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-slate-400 text-lg font-bold">✕</Text>
            </TouchableOpacity>
          </View>
          {children}
        </Card>
      </View>
    </RNModal>
  );
};
