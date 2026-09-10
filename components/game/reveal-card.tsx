"use client";

import { motion } from "framer-motion";

export function RevealCard({ author }: { author: string }) {
  return (
    <motion.div
      initial={{ rotateX: -80, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
      className="rounded-3xl bg-amber-400 px-8 py-10 text-center text-slate-950 shadow-2xl"
    >
      <p className="text-sm uppercase tracking-[0.3em]">It was…</p>
      <p className="font-display mt-3 text-4xl md:text-6xl">{author}</p>
    </motion.div>
  );
}
