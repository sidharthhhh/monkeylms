"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Star, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
    mentee_id: string;
    mentee_name: string;
    avatar_url?: string;
    score: number;
    rank: number;
}

export default function MenteeLeaderboard() {
    const { user } = useAuthStore();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLeaderboard = async () => {
            try {
                setLoading(true);
                const response = await fetchApi('/analytics/leaderboard/global');
                if (response?.data) {
                    setEntries(response.data);
                }
            } catch (error) {
                toast.error("Failed to load leaderboard data");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        loadLeaderboard();
    }, []);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="w-6 h-6 text-yellow-500" />;
            case 2:
                return <Medal className="w-6 h-6 text-gray-400" />;
            case 3:
                return <Medal className="w-6 h-6 text-amber-700" />;
            default:
                return <span className="font-bold text-muted-foreground w-6 text-center">{rank}</span>;
        }
    };

    const getRankStyle = (rank: number, isCurrentUser: boolean) => {
        let base = "flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ";

        if (isCurrentUser) {
            base += "bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(255,255,255,0.1)] shadow-primary/20 scale-[1.02] z-10 relative ";
        } else {
            base += "bg-card/40 border-border/50 hover:bg-muted/20 ";
        }

        if (rank === 1) base += "ring-1 ring-yellow-500/50 ";
        if (rank === 2) base += "ring-1 ring-gray-400/50 ";
        if (rank === 3) base += "ring-1 ring-amber-700/50 ";

        return base;
    };

    const myEntry = entries.find(e => e.mentee_id === user?.id);
    const myRank = myEntry?.rank;
    const myScore = myEntry?.score || 0;

    let nextTierPoints = 100;
    let nextTierName = "Beginner";
    if (myScore >= 100 && myScore < 500) { nextTierPoints = 500; nextTierName = "Intermediate"; }
    else if (myScore >= 500 && myScore < 1000) { nextTierPoints = 1000; nextTierName = "Advanced"; }
    else if (myScore >= 1000 && myScore < 2000) { nextTierPoints = 2000; nextTierName = "Elite Solver"; }
    else if (myScore >= 2000) { nextTierPoints = Math.ceil((myScore + 1) / 1000) * 1000; nextTierName = "Master"; }

    const pctString = Math.min((myScore / nextTierPoints) * 100, 100).toFixed(0) + "%";

    const formatRank = (rank?: number) => {
        if (!rank) return "-";
        if (rank === 1) return "1st";
        if (rank === 2) return "2nd";
        if (rank === 3) return "3rd";
        return `${rank}th`;
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                        Weekly Leaderboard
                    </h1>
                    <p className="text-muted-foreground mt-2">See how you rank among your peers in Batch Alpha.</p>
                </div>
                <Button variant="outline" className="border-border/50 hover:bg-secondary/10 hover:text-secondary font-medium">
                    View Past Weeks <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-8">
                <Card className="border-border/50 bg-card/40 backdrop-blur relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Trophy className="w-16 h-16 text-yellow-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Your Rank</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-extrabold text-foreground">{loading ? "-" : formatRank(myRank)}</div>
                        <p className="text-xs text-primary mt-1 flex items-center gap-1 font-medium">
                            {myRank === 1 ? <Trophy className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />} {myRank === 1 ? "Top 1%" : "Keep pushing!"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/40 backdrop-blur relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Star className="w-16 h-16 text-secondary" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-extrabold text-foreground">{loading ? "-" : myScore.toLocaleString()}</div>
                        <p className="text-xs text-secondary mt-1 flex items-center gap-1 font-medium">
                            <Star className="w-3 h-3" /> Total earned
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/40 backdrop-blur border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-primary">Next Milestone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-foreground">{loading ? "-" : `${nextTierPoints.toLocaleString()} Points`}</div>
                        <p className="text-xs text-muted-foreground mt-1">Unlock '{nextTierName}' Badge</p>
                        <div className="w-full bg-muted rounded-full h-2 mt-3 overflow-hidden">
                            <div className="bg-primary h-2 rounded-full transition-all duration-1000" style={{ width: loading ? "0%" : pctString }} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-20 w-full animate-pulse bg-muted/40 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    entries.map((entry, idx) => {
                        const isMe = user?.id ? entry.mentee_id === user.id : false;
                        return (
                            <motion.div
                                key={entry.mentee_id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1, duration: 0.4 }}
                                className={getRankStyle(entry.rank, isMe)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 flex justify-center">
                                        {getRankIcon(entry.rank)}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg
                      ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                            {entry.mentee_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                                {entry.mentee_name}
                                                {isMe && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">You</span>}
                                            </h3>
                                            <p className="text-sm text-muted-foreground hidden sm:block">Batch Alpha</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="font-bold text-xl tracking-tight text-foreground">{entry.score.toLocaleString()}</div>
                                    <div className="text-xs text-muted-foreground">Points</div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
