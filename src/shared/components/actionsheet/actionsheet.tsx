import React from "react";
import { Modal, TouchableOpacity, TouchableWithoutFeedback, View, ScrollView } from "react-native";
import Text from "@/shared/components/Text";
import { ChevronDown, Check } from "lucide-react-native";

export interface ActionSheetOption {
  label: string;
  value: string;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  options: ActionSheetOption[];
  value?: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
}

export function ActionSheet({
  visible,
  onClose,
  options,
  value,
  onSelect,
  placeholder = "Select an option",
}: ActionSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/40">
          <TouchableWithoutFeedback>
            <View className="bg-white rounded-t-3xl pt-3 pb-8">
              {/* Handle */}
              <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />

              {/* Header */}
              <View className="flex-row items-center justify-between px-5 pb-3 border-b border-slate-100">
                <Text className="text-lg font-rubik-bold text-black-300">
                  {placeholder}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Text className="text-primary-300 font-rubik-bold text-base">
                    Done
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Options */}
              <ScrollView
                className="max-h-[50vh]"
                showsVerticalScrollIndicator={false}
              >
                {options.map((opt, idx) => {
                  const selected = opt.value === value;
                  return (
                    <TouchableOpacity
                      key={`${placeholder}-${opt.value}-${idx}`}
                      onPress={() => {
                        onSelect(opt.value);
                        onClose();
                      }}
                      className="flex-row items-center justify-between px-5 py-4 border-b border-slate-50 active:bg-primary-50"
                    >
                      <Text
                        className={`text-base ${
                          selected
                            ? "text-primary-300 font-rubik-bold"
                            : "text-black-200 font-rubik"
                        }`}
                      >
                        {opt.label}
                      </Text>
                      {selected && <Check size={20} color="#134686" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/* ─── SelectField: dropdown-like trigger that opens ActionSheet ─── */

interface SelectFieldProps {
  label?: string;
  placeholder?: string;
  value?: string | null;
  options: ActionSheetOption[];
  onSelect: (value: string) => void;
  style?: any;
  className?: string;
}

export function SelectField({
  label,
  placeholder = "Select",
  value,
  options,
  onSelect,
  style,
  className = "",
}: SelectFieldProps) {
  const [open, setOpen] = React.useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View>
      {label && (
        <Text className="text-black-200 font-rubik-medium mb-2">{label}</Text>
      )}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={style}
        className={`flex-row items-center justify-between bg-primary-100 border border-primary-200 rounded-2xl px-4 py-4 ${className}`}
      >
        <Text
          className={`text-sm flex-1 ${
            selectedLabel
              ? "text-black-300 font-rubik-medium"
              : "text-gray-400 font-rubik"
          }`}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <ChevronDown size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <ActionSheet
        visible={open}
        onClose={() => setOpen(false)}
        options={options}
        value={value}
        onSelect={onSelect}
        placeholder={placeholder}
      />
    </View>
  );
}
