"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, initializeLoader } = useAuthStore();

  useEffect(() => {
    initializeLoader();
  }, [initializeLoader]);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        if (user.role === "mentor") {
          router.push("/mentor");
        } else {
          router.push("/mentee");
        }
      } else {
        router.push("/login");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full"
      />
    </div>
  );
}
