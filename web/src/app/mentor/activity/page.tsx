"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { motion } from "framer-motion";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Activity, Clock, CheckCircle2, AlertCircle, User,
    ChevronRight, BookOpen, Flame, Target, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface Assignment {
    id: string;
    mentee_id: string;
    title: string;
    status: string;
    start_date: string;
    deadline: string;
}

interface Mentee {
    id: string;
    name: string;
    email: string;
}

interface MenteeProgress {
    mentee: Mentee;
    assignments: Assignment[];
    totalTasks: number;
    completedTasks: number;
}

interface RecentActivityItem {
    submission_id: string;
    mentee_id: string;
    mentee_name: string;
    task_id: string;
    question_title: string;
    solution_url: string;
    submission_status: string;
    submitted_at: string;
}

const STATUS_STYLES: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    active: { label: "Active", className: "border-primary/40 bg-primary/10 text-primary", icon: Flame },
    completed: { label: "Completed", className: "border-secondary/40 bg-secondary/10 text-secondary", icon: CheckCircle2 },
    overdue: { label: "Overdue", className: "border-destructive/40 bg-destructive/10 text-destructive", icon: AlertCircle },
};

export default function MentorActivityPage() {
    const { user } = useAuthStore();
    const [mentees, setMentees] = useState<Mentee[]>([]);
    const [progressData, setProgressData] = useState<MenteeProgress[]>([]);
    const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMentee, setSelectedMentee] = useState<string | "all">("all");

    // Review Modal State
    const [reviewSubId, setReviewSubId] = useState<string | null>(null);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewRevision, setReviewRevision] = useState(false);
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        loadAllProgress();
    }, []);

    const loadAllProgress = async () => {
        try {
            setLoading(true);
            const menteesRes = await fetchApi("/users/mentees");
            const allMentees: Mentee[] = menteesRes.data || [];
            setMentees(allMentees);

            const progressResults: MenteeProgress[] = await Promise.all(
                allMentees.map(async (m) => {
                    try {
                        const res = await fetchApi(`/assignments/mentee/${m.id}?limit=20`);
                        const assignments: Assignment[] = res.data || [];
                        return {
                            mentee: m,
                            assignments,
                            totalTasks: assignments.length,
                            completedTasks: assignments.filter((a) => a.status === "completed").length,
                        };
                    } catch {
                        return { mentee: m, assignments: [], totalTasks: 0, completedTasks: 0 };
                    }
                })
            );

            setProgressData(progressResults);

            try {
                const actRes = await fetchApi("/submissions/activity/recent?limit=20");
                if (actRes.data) {
                    setRecentActivities(actRes.data);
                }
            } catch (err) {
                console.error("Failed to load activity", err);
            }

        } catch (err) {
            toast.error("Failed to load progress data");
        } finally {
            setLoading(false);
        }
    };

    const handleReviewSubmit = async () => {
        if (!reviewSubId || !reviewComment.trim()) {
            toast.error("Please provide a comment.");
            return;
        }
        try {
            setSubmittingReview(true);
            await fetchApi("/submissions/feedback", {
                method: "POST",
                body: JSON.stringify({
                    submission_id: reviewSubId,
                    comment: reviewComment,
                    revision_required: reviewRevision,
                }),
            });
            toast.success("Feedback submitted!");
            setReviewSubId(null);
            setReviewComment("");
            setReviewRevision(false);
            loadAllProgress();
        } catch (err: any) {
            toast.error(err.message || "Failed to submit feedback");
        } finally {
            setSubmittingReview(false);
        }
    };

    const getStatusInfo = (assignment: Assignment) => {
        const now = new Date();
        const deadline = new Date(assignment.deadline);
        if (assignment.status === "completed") return STATUS_STYLES.completed;
        if (deadline < now) return STATUS_STYLES.overdue;
        return STATUS_STYLES.active;
    };

    const totalAssignments = progressData.reduce((s, p) => s + p.totalTasks, 0);
    const totalCompleted = progressData.reduce((s, p) => s + p.completedTasks, 0);
    const completionRate = totalAssignments > 0 ? Math.round((totalCompleted / totalAssignments) * 100) : 0;
    const overdueCount = progressData
        .flatMap((p) => p.assignments)
        .filter((a) => a.status !== "completed" && new Date(a.deadline) < new Date()).length;

    const filteredActivities =
        selectedMentee === "all"
            ? recentActivities
            : recentActivities.filter((a) => a.mentee_id === selectedMentee);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Progress & Activity</h1>
                    <p className="text-muted-foreground mt-2">Track how your mentees are doing on their goals.</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAllProgress}
                    className="border-border/50 hover:bg-muted/20 gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                {[
                    { label: "Total Assignments", value: loading ? "—" : totalAssignments, icon: Target, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Completed", value: loading ? "—" : totalCompleted, icon: CheckCircle2, color: "text-secondary", bg: "bg-secondary/10" },
                    { label: "Overdue", value: loading ? "—" : overdueCount, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
                    { label: "Completion Rate", value: loading ? "—" : `${completionRate}%`, icon: Activity, color: "text-primary", bg: "bg-primary/10" },
                ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                        <Card className="border-border/50 bg-card/40 backdrop-blur">
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                                        <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                                    </div>
                                    <div className={`w-10 h-10 rounded-full ${stat.bg} flex items-center justify-center shrink-0`}>
                                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Mentee Progress Bars */}
            {!loading && progressData.length > 0 && (
                <Card className="border-border/50 bg-card/40 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-secondary" /> Mentee Progress Overview
                        </CardTitle>
                        <CardDescription>Assignment completion rate per mentee</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {progressData.map((p, i) => {
                            const pct = p.totalTasks > 0 ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0;
                            return (
                                <motion.div
                                    key={p.mentee.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="space-y-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm shrink-0">
                                                {(p.mentee.name || p.mentee.email).charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{p.mentee.name}</p>
                                                <p className="text-xs text-muted-foreground">{p.totalTasks} assignments total</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-secondary">{pct}%</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                                onClick={() => setSelectedMentee(selectedMentee === p.mentee.id ? "all" : p.mentee.id)}
                                            >
                                                {selectedMentee === p.mentee.id ? "Show All" : "Filter"} <ChevronRight className="h-3 w-3 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-secondary to-primary rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.8, delay: i * 0.1 + 0.3, ease: "easeOut" }}
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Activity Feed */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold tracking-tight">Recent Goal Submissions</h2>
                    {selectedMentee !== "all" && (
                        <Button variant="outline" size="sm" className="h-7 text-xs px-3 border-secondary/40 text-secondary" onClick={() => setSelectedMentee("all")}>
                            Clear Filter
                        </Button>
                    )}
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-24 animate-pulse bg-card/40 rounded-xl border border-border/40" />
                        ))}
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
                        <p className="text-lg font-medium">No recent activity</p>
                        <p className="text-sm mt-1">Mentees haven't submitted anything yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredActivities.map((a, i) => {
                            const isReviewed = a.submission_status === "reviewed";
                            const needsRevision = a.submission_status === "revision_needed";

                            let iconObj = STATUS_STYLES.completed;
                            if (isReviewed) iconObj = { label: "Reviewed", className: "border-primary/40 bg-primary/10 text-primary", icon: CheckCircle2 };
                            if (needsRevision) iconObj = { label: "Revision Needed", className: "border-destructive/40 bg-destructive/10 text-destructive", icon: AlertCircle };
                            if (a.submission_status === "submitted") iconObj = { label: "Needs Review", className: "border-secondary/40 bg-secondary/10 text-secondary", icon: Activity };

                            let bgClass = "bg-secondary/10";
                            let textClass = "text-secondary";

                            if (isReviewed) { bgClass = "bg-primary/10"; textClass = "text-primary"; }
                            if (needsRevision) { bgClass = "bg-destructive/10"; textClass = "text-destructive"; }

                            const Icon = iconObj.icon;
                            return (
                                <motion.div
                                    key={`act-${a.submission_id}-${i}`}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-secondary/30 transition-colors group">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-4">
                                                {/* Icon */}
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${bgClass}`}>
                                                    <Icon className={`h-4 w-4 ${textClass}`} />
                                                </div>

                                                {/* Main Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-start gap-2 justify-between">
                                                        <div>
                                                            <p className="font-semibold text-sm">{a.question_title}</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                                                <User className="h-3 w-3" />
                                                                {a.mentee_name || "Unknown Mentee"}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline" className={`text-xs capitalize shrink-0 ${iconObj.className}`}>
                                                            {iconObj.label}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            Submitted {new Date(a.submitted_at).toLocaleDateString()}
                                                        </span>
                                                        {a.solution_url && (
                                                            <a href={a.solution_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                                                View Solution
                                                            </a>
                                                        )}
                                                        {a.submission_status === "submitted" && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-6 text-xs px-2"
                                                                onClick={() => setReviewSubId(a.submission_id)}
                                                            >
                                                                Add Review
                                                            </Button>
                                                        )}
                                                    </div>

                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Review Dialog */}
            <Dialog open={!!reviewSubId} onOpenChange={(v) => !v && setReviewSubId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Review</DialogTitle>
                        <DialogDescription>
                            Provide feedback on the mentee's solution.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="comment">Feedback Comment</Label>
                            <Textarea
                                id="comment"
                                placeholder="Great approach! Just consider edge cases..."
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                id="revision"
                                checked={reviewRevision}
                                onCheckedChange={setReviewRevision}
                            />
                            <Label htmlFor="revision">Require Revision?</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReviewSubId(null)} disabled={submittingReview}>Cancel</Button>
                        <Button onClick={handleReviewSubmit} disabled={submittingReview || !reviewComment.trim()}>
                            {submittingReview ? "Submitting..." : "Submit Review"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
