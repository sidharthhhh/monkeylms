"use client";

import { useAuthStore } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, User as UserIcon, BarChart } from "lucide-react";

export default function MenteeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isAuthenticated, isLoading, logout, initializeLoader } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        initializeLoader();
    }, [initializeLoader]);

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated || user?.role !== "mentee") {
                router.push("/login");
            }
        }
    }, [isLoading, isAuthenticated, user, router]);

    if (isLoading || !isAuthenticated || user?.role !== "mentee") {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center mx-auto px-4 justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/20 text-primary font-bold">
                            M
                        </div>
                        <span className="font-bold tracking-wider hidden sm:inline-block">
                            MentorFlow
                        </span>
                        <span className="text-muted-foreground ml-2 text-sm border-l border-border pl-2">
                            Mentee
                        </span>
                    </div>

                    <nav className="flex items-center gap-6 text-sm font-medium">
                        <a href="/mentee" className="transition-colors hover:text-foreground/80 text-foreground flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span className="hidden sm:inline-block">My Goals</span>
                        </a>
                        <a href="/mentee/leaderboard" className="transition-colors hover:text-foreground/80 text-muted-foreground flex items-center gap-2">
                            <BarChart className="h-4 w-4" />
                            <span className="hidden sm:inline-block">Leaderboard</span>
                        </a>
                    </nav>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <UserIcon className="h-4 w-4" />
                            <span className="hidden sm:inline-block">{user.email}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={logout}
                            className="gap-2 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all font-semibold"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline-block">Logout</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 container mx-auto p-4 md:p-8">
                {children}
            </main>
        </div>
    );
}
