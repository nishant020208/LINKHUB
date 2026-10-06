import Component from "@/components/ui/black-hole";

export default function BlackHoleDemo() {
  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-black">
      <Component />
    </div>
  );
}
