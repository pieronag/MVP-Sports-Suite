export default function PlayerLoading() {
  return (
    <div className="min-h-screen bg-[#020617] p-6 space-y-6 animate-pulse">
      <div className="h-12 w-48 bg-[#0F172A] rounded-[14px]" />
      <div className="h-40 bg-[#0F172A] rounded-[35px]" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-24 bg-[#0F172A] rounded-[28px]" />
        <div className="h-24 bg-[#0F172A] rounded-[28px]" />
        <div className="h-24 bg-[#0F172A] rounded-[28px]" />
      </div>
      <div className="h-6 w-32 bg-[#0F172A] rounded-[14px] mt-8" />
      <div className="h-52 bg-[#0F172A] rounded-[35px]" />
      <div className="h-52 bg-[#0F172A] rounded-[35px]" />
    </div>
  );
}
