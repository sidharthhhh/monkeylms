"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { fetchApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { UserPlus, LogIn, ArrowRight } from "lucide-react";

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const login = useAuthStore((state) => state.login);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const endpoint = isSignUp ? "/auth/signup" : "/auth/login";
            const body = isSignUp 
                ? { email, password, name, role: "mentee" } 
                : { email, password };

            const response = await fetchApi(endpoint, {
                method: "POST",
                body: JSON.stringify(body),
            });

            const { token, user } = response.data;
            login(token, user);

            toast.success(isSignUp ? "Account created!" : "Welcome back!", {
                description: `Logged in as ${user.role}`,
            });

            if (user.role === "mentor") {
                router.push("/mentor");
            } else {
                router.push("/mentee");
            }
        } catch (error: any) {
            toast.error(isSignUp ? "Registration failed" : "Login failed", {
                description: error.message || "Something went wrong. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
            {/* Abstract Background Elements */}
            <div className="absolute inset-0 z-0 text-primary">
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] mix-blend-screen" 
                />
                <motion.div 
                    animate={{ 
                        scale: [1, 1.3, 1],
                        rotate: [0, -90, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] mix-blend-screen" 
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="z-10 w-full max-w-md p-4"
            >
                <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <CardHeader className="space-y-3 text-center">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="mx-auto bg-primary/10 p-3 rounded-2xl w-fit"
                        >
                            <div className="h-10 w-10 flex items-center justify-center text-primary font-bold text-2xl">
                                M
                            </div>
                        </motion.div>
                        <CardTitle className="text-3xl font-extrabold tracking-tight">
                            {isSignUp ? "Join MentorFlow" : "Welcome Back"}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground font-medium">
                            {isSignUp 
                                ? "Create your mentee account to start learning" 
                                : "Enter your credentials to access your dashboard"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAuth} className="space-y-5">
                            <AnimatePresence mode="popLayout">
                                {isSignUp && (
                                    <motion.div
                                        key="name-field"
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                        className="space-y-2 overflow-hidden"
                                    >
                                        <Label htmlFor="name" className="text-foreground/80">Full Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="John Doe"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required={isSignUp}
                                            className="bg-background/50 border-border"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-foreground/80">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-background/50 border-border focus-visible:ring-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-foreground/80">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-background/50 border-border focus-visible:ring-primary"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 h-11"
                                disabled={loading}
                            >
                                {loading 
                                    ? (isSignUp ? "Creating account..." : "Signing in...") 
                                    : (isSignUp ? "Create Account" : "Sign In")}
                                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                            </Button>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border/50" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-transparent px-2 text-muted-foreground font-medium">or</span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="w-full border-border/50 hover:bg-muted/50 h-11"
                            >
                                {isSignUp ? (
                                    <>
                                        <LogIn className="mr-2 h-4 w-4" />
                                        Already have an account? Sign In
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        New here? Create Mentee Account
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
