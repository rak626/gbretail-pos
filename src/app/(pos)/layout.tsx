import PosShellSelector from "@/components/pos/PosShellSelector";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <PosShellSelector>{children}</PosShellSelector>;
}
