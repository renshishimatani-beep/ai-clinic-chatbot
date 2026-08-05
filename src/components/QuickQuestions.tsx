import { Clock, CalendarPlus, FileText, MapPin, Thermometer, CreditCard, Stethoscope, Phone } from "lucide-react";

export type QuickQuestion = {
  label: string;
  text: string;
  icon: React.ReactNode;
};

export const QUICK_QUESTIONS: QuickQuestion[] = [
  { label: "診療時間を知りたい", text: "診療時間を教えてください", icon: <Clock size={16} /> },
  { label: "予約方法を知りたい", text: "予約の方法を教えてください", icon: <CalendarPlus size={16} /> },
  { label: "初診時の持ち物", text: "初診時の持ち物を教えてください", icon: <FileText size={16} /> },
  { label: "アクセス・駐車場", text: "クリニックへのアクセスと駐車場を教えてください", icon: <MapPin size={16} /> },
  { label: "発熱がある場合", text: "発熱がある場合はどうすればいいですか", icon: <Thermometer size={16} /> },
  { label: "支払い方法", text: "支払い方法を教えてください", icon: <CreditCard size={16} /> },
  { label: "診療内容を知りたい", text: "診療内容を教えてください", icon: <Stethoscope size={16} /> },
  { label: "電話で問い合わせたい", text: "電話で問い合わせたい", icon: <Phone size={16} /> },
];
