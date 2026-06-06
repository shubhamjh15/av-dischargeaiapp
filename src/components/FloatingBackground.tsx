// Decorative 3D floating background — soft gradient orbs + a couple of
// floating "medical" glass chips. Pure CSS animation, no perf cost.
export default function FloatingBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Big blurred gradient orbs (forest green) */}
      <div
        className="orb animate-blob"
        style={{
          width: 360,
          height: 360,
          top: -80,
          left: -60,
          background: "radial-gradient(circle at 30% 30%, #7ad9a3, #1f6f52)",
        }}
      />
      <div
        className="orb animate-float-slow"
        style={{
          width: 300,
          height: 300,
          bottom: -60,
          right: -40,
          background: "radial-gradient(circle at 30% 30%, #a7e6c0, #2f8765)",
        }}
      />
      <div
        className="orb animate-float"
        style={{
          width: 180,
          height: 180,
          top: "40%",
          right: "18%",
          background: "radial-gradient(circle at 30% 30%, #c9f0d8, #4ba582)",
          opacity: 0.35,
        }}
      />

      {/* Floating glass chips with medical glyphs (3D feel) */}
      <FloatChip top="18%" left="12%" delay="0s" emoji="🩺" />
      <FloatChip top="62%" left="8%" delay="1.4s" emoji="💊" />
      <FloatChip top="26%" left="82%" delay="0.8s" emoji="📋" />
      <FloatChip top="72%" left="86%" delay="2.1s" emoji="➕" />
    </div>
  );
}

function FloatChip({
  top,
  left,
  delay,
  emoji,
}: {
  top: string;
  left: string;
  delay: string;
  emoji: string;
}) {
  return (
    <div
      className="absolute animate-float"
      style={{ top, left, animationDelay: delay }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
        style={{
          background: "rgba(255,255,255,0.65)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow:
            "0 14px 30px -12px rgba(27,60,141,0.4), inset 0 1px 0 rgba(255,255,255,0.7)",
          transform: "rotate(-8deg)",
        }}
      >
        {emoji}
      </div>
    </div>
  );
}
