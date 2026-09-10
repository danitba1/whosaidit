"use client";

import { motion } from "framer-motion";

export function FactCard({ fact, kicker = "Who said this?" }: { fact: string; kicker?: string }) {
  return (
    <motion.blockquote
      key={fact}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-white/10 p-8 text-center shadow-2xl ring-1 ring-white/15 backdrop-blur"
    >
      <p className="text-sm uppercase tracking-[0.25em] text-amber-200">{kicker}</p>
      <p className="font-display mt-4 text-3xl leading-snug text-white md:text-5xl">“{fact}”</p>
    </motion.blockquote>
  );
}
