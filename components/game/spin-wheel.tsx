"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function SpinWheel({
  count,
  onSelectIndex,
  disabled,
}: {
  count: number;
  onSelectIndex: (index: number) => void;
  disabled?: boolean;
}) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const slices = useMemo(() => Array.from({ length: Math.max(count, 0) }, (_, i) => `Fact ${i + 1}`), [count]);

  if (count < 1) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-56 w-56">
        <motion.div
          className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-teal-700 to-slate-900 text-white shadow-xl"
          animate={{ rotate: rotation }}
          transition={{ duration: spinning ? 2.4 : 0, ease: "easeOut" }}
        >
          <p className="text-center text-sm">
            {slices.length} unused
            <br />
            facts
          </p>
        </motion.div>
      </div>
      <Button
        variant="gold"
        disabled={disabled || spinning}
        onClick={() => {
          const index = Math.floor(Math.random() * count);
          setSpinning(true);
          setRotation((r) => r + 1080 + index * (360 / count));
          window.setTimeout(() => {
            setSpinning(false);
            onSelectIndex(index);
          }, 2500);
        }}
      >
        Spin for a fact
      </Button>
    </div>
  );
}
