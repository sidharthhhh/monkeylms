"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth";
import { fetchApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    Calendar, CheckCircle2, Clock, AlertCircle, ChevronDown,
    ChevronUp, BookOpen, Flame, Target, TrendingUp, Goal, Send, Link as LinkIcon
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Task {
    task_id: string;
    assignment_id: string;
    task_status: string;
    question_id: string;
    question_title: string;
    question_difficulty: string;
}

interface Assignment {
    id: string;
    title: string;
    status: string;
    start_date: string;
    deadline: string;
    tasks?: Task[];
}

const DIFF_STYLES: Record<string, string> = {
    easy: "border-secondary/40 bg-secondary/10 text-secondary",
    medium: "border-yellow-400/40 bg-yellow-400/10 text-yellow-400",
    hard: "border-destructive/40 bg-destructive/10 text-destructive",
};

export default function MenteeDashboard() {
    const { user } = useAuthStore();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loadingTasks, setLoadingTasks] = useState<string | null>(null);
    const [tasksCache, setTasksCache] = useState<Record<string, Task[]>>({});

    // Submission state
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
    const [submittingTask, setSubmittingTask] = useState<Task | null>(null);
    const [solutionUrl, setSolutionUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) loadAssignments();
    }, [user]);

    const loadAssignments = async () => {
        try {
            setLoading(true);
            const res = await fetchApi(`/assignments/mentee/${user?.id}`);
            const assigns = res.data || [];

            // Pre-load tasks mapping for proper completion math
            const cache: Record<string, Task[]> = { ...tasksCache };
            for (const a of assigns) {
                if (!cache[a.id]) {
                    try {
                        const tres = await fetchApi(`/assignments/${a.id}`);
                        cache[a.id] = tres.data?.tasks || [];
                    } catch {
                        // ignore failures
                    }
                }
            }
            setTasksCache(cache);
            setAssignments(assigns);
        } catch {
            toast.error("Failed to load goals");
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(id);
        if (!tasksCache[id]) {
            await loadTasks(id);
        }
    };

    const loadTasks = async (id: string) => {
        try {
            setLoadingTasks(id);
            const res = await fetchApi(`/assignments/${id}`);
            const tasks = res.data?.tasks || [];
            setTasksCache((prev) => ({ ...prev, [id]: tasks }));
        } catch {
            toast.error("Failed to load tasks");
        } finally {
            setLoadingTasks(null);
        }
    };

    const openSubmitDialog = (e: React.MouseEvent, task: Task) => {
        e.stopPropagation();
        setSubmittingTask(task);
        setSolutionUrl("");
        setIsSubmitDialogOpen(true);
    };

    const handleDirectSubmit = async (task: Task) => {
        try {
            setSubmittingTaskId(task.task_id);
            await fetchApi("/submissions", {
                method: "POST",
                body: JSON.stringify({
                    assignment_task_id: task.task_id,
                    solution_url: "", // Direct submission with no URL
                }),
            });

            toast.success("Task completed!");

            // Reload tasks for this assignment
            await loadTasks(task.assignment_id);
            // Reload assignments
            await loadAssignments();
        } catch (err) {
            toast.error("Failed to submit task");
        } finally {
            setSubmittingTaskId(null);
        }
    };

    const handleSubmitTask = async () => {
        if (!submittingTask || !solutionUrl) return;

        try {
            setIsSubmitting(true);
            await fetchApi("/submissions", {
                method: "POST",
                body: JSON.stringify({
                    assignment_task_id: submittingTask.task_id,
                    solution_url: solutionUrl,
                }),
            });

            toast.success("Solution submitted successfully!");
            setIsSubmitDialogOpen(false);

            // Reload tasks for this assignment to show completed status
            await loadTasks(submittingTask.assignment_id);
            // Reload assignments to update overall progress
            await loadAssignments();
        } catch (err) {
            toast.error("Failed to submit solution");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isCompleted = (a: Assignment) => {
        const tasks = tasksCache[a.id];
        // If there are tasks, require all to be completed. Otherwise fallback to DB status.
        if (tasks && tasks.length > 0) {
            return tasks.every((t) => t.task_status === "completed");
        }
        return a.status === "completed";
    };

    const isOverdue = (a: Assignment) =>
        !isCompleted(a) && new Date(a.deadline) < new Date();

    const daysLeft = (deadline: string) =>
        Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);

    const completed = assignments.filter((a) => isCompleted(a)).length;
    const active = assignments.filter((a) => !isCompleted(a) && !isOverdue(a)).length;
    const overdue = assignments.filter((a) => isOverdue(a)).length;
    const pct = assignments.length > 0 ? Math.round((completed / assignments.length) * 100) : 0;

    const statusBadge = (a: Assignment) => {
        if (isCompleted(a))
            return { label: "Completed", cls: "border-secondary/40 bg-secondary/10 text-secondary" };
        if (isOverdue(a))
            return { label: "Overdue", cls: "border-destructive/40 bg-destructive/10 text-destructive" };
        return { label: "Active", cls: "border-primary/40 bg-primary/10 text-primary" };
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    My Goals &amp; Progress
                </h1>
                <p className="text-muted-foreground mt-2">
                    Hey <span className="text-foreground font-semibold">{user?.email.split("@")[0]}</span> — here's your current assignment progress.
                </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Goals", value: assignments.length, icon: Target, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Active", value: active, icon: Flame, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-secondary", bg: "bg-secondary/10" },
                    { label: "Overdue", value: overdue, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                        <Card className="border-border/50 bg-card/40 backdrop-blur">
                            <CardContent className="pt-5 pb-4">
                                <div className="flex flex-col gap-1">
                                    <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                                        <s.icon className={`h-4 w-4 ${s.color}`} />
                                    </div>
                                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{loading ? "—" : s.value}</p>
                                    <p className="text-xs text-muted-foreground">{s.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Overall Progress Bar */}
            {!loading && assignments.length > 0 && (
                <Card className="border-border/50 bg-card/40 backdrop-blur">
                    <CardContent className="pt-5 pb-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-secondary" />
                                <span className="font-semibold text-sm">Overall Completion</span>
                            </div>
                            <span className="text-2xl font-bold text-secondary">{pct}%</span>
                        </div>
                        <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-secondary to-primary rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {completed} of {assignments.length} goals completed
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Assignment Cards */}
            <div>
                <h2 className="text-xl font-bold tracking-tight mb-4">Your Assignments</h2>
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-28 animate-pulse bg-card/40 rounded-xl border border-border/40" />
                        ))}
                    </div>
                ) : assignments.length === 0 ? (
                    <Card className="border-dashed bg-card/30">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                            <Goal className="w-12 h-12 mb-4 text-muted-foreground/30" />
                            <p className="font-medium">No goals assigned yet.</p>
                            <p className="text-sm mt-1">Your mentor will assign goals — check back soon!</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {assignments.map((a, idx) => {
                            const badge = statusBadge(a);
                            const dl = daysLeft(a.deadline);
                            const isExpanded = expandedId === a.id;
                            const tasks = tasksCache[a.id] || [];
                            const tasksDone = tasks.filter((t) => t.task_status === "completed").length;

                            return (
                                <motion.div
                                    key={a.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.07 }}
                                >
                                    <Card
                                        className={`border-border/50 transition-all ${isExpanded ? "border-primary/30 bg-card/70" : "bg-card/40 hover:border-primary/20"
                                            }`}
                                    >
                                        <div
                                            className="flex items-start gap-4 p-4 cursor-pointer select-none"
                                            onClick={() => toggleExpand(a.id)}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCompleted(a) ? "bg-secondary/15" :
                                                isOverdue(a) ? "bg-destructive/15" : "bg-primary/15"
                                                }`}>
                                                {isCompleted(a)
                                                    ? <CheckCircle2 className="h-5 w-5 text-secondary" />
                                                    : isOverdue(a)
                                                        ? <AlertCircle className="h-5 w-5 text-destructive" />
                                                        : <Flame className="h-5 w-5 text-primary" />
                                                }
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-start gap-2 justify-between">
                                                    <p className="font-bold text-base leading-tight">{a.title}</p>
                                                    <Badge variant="outline" className={`text-xs ${badge.cls} shrink-0`}>
                                                        {badge.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar className="h-3 w-3" />
                                                        Started {new Date(a.start_date).toLocaleDateString()}
                                                    </span>
                                                    <span className={`flex items-center gap-1.5 ${isOverdue(a) ? "text-destructive" : ""}`}>
                                                        <Clock className="h-3 w-3" />
                                                        {isCompleted(a)
                                                            ? `Finished by ${new Date(a.deadline).toLocaleDateString()}`
                                                            : isOverdue(a)
                                                                ? `${Math.abs(dl)}d overdue`
                                                                : `${dl} days remaining`}
                                                    </span>
                                                    {tasks.length > 0 && (
                                                        <span className="flex items-center gap-1.5 text-secondary">
                                                            <BookOpen className="h-3 w-3" />
                                                            {tasksDone}/{tasks.length} tasks done
                                                        </span>
                                                    )}
                                                </div>

                                                {tasks.length > 0 && (
                                                    <div className="h-1 w-full bg-muted/40 rounded-full mt-2">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-secondary to-primary rounded-full transition-all"
                                                            style={{ width: `${(tasksDone / tasks.length) * 100}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="shrink-0 ml-2 text-muted-foreground pt-1">
                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-4 pb-4 border-t border-border/40 pt-4 space-y-2">
                                                        {loadingTasks === a.id ? (
                                                            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                                                Loading tasks...
                                                            </div>
                                                        ) : tasks.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground">No tasks in this assignment yet.</p>
                                                        ) : (
                                                            <>
                                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                                                    Tasks ({tasksDone}/{tasks.length} complete)
                                                                </p>
                                                                {tasks.map((t, ti) => (
                                                                    <motion.div
                                                                        key={t.task_id}
                                                                        initial={{ opacity: 0, x: -8 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: ti * 0.06 }}
                                                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${t.task_status === "completed"
                                                                            ? "border-secondary/20 bg-secondary/5"
                                                                            : "border-border/40 bg-muted/10"
                                                                            }`}
                                                                    >
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${t.task_status === "completed"
                                                                            ? "bg-secondary text-secondary-foreground"
                                                                            : "border-2 border-muted-foreground"
                                                                            }`}>
                                                                            {t.task_status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className={`text-sm font-medium truncate ${t.task_status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                                                                                {t.question_title}
                                                                            </p>
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                <Badge variant="outline" className={`text-[10px] h-4 leading-none capitalize shrink-0 ${DIFF_STYLES[t.question_difficulty] || ""}`}>
                                                                                    {t.question_difficulty}
                                                                                </Badge>
                                                                                <Badge variant="outline" className={`text-[10px] h-4 leading-none capitalize shrink-0 ${t.task_status === "pending" ? "border-muted-foreground/30 text-muted-foreground" :
                                                                                    t.task_status === "completed" ? "border-secondary/40 text-secondary bg-secondary/10" :
                                                                                        "border-primary/40 text-primary"
                                                                                    }`}>
                                                                                    {t.task_status}
                                                                                </Badge>
                                                                            </div>
                                                                        </div>

                                                                        {t.task_status !== "completed" && (
                                                                            <div className="flex items-center gap-2">
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="ghost"
                                                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-secondary hover:bg-secondary/10"
                                                                                    onClick={(e) => openSubmitDialog(e, t)}
                                                                                    title="Submit with link"
                                                                                >
                                                                                    <LinkIcon className="h-4 w-4" />
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    disabled={submittingTaskId === t.task_id}
                                                                                    className="h-8 px-3 text-xs bg-secondary/20 hover:bg-secondary/30 text-secondary-foreground border border-secondary/20 font-semibold"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDirectSubmit(t);
                                                                                    }}
                                                                                >
                                                                                    {submittingTaskId === t.task_id ? (
                                                                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                                                    ) : (
                                                                                        <>
                                                                                            <Send className="h-3 w-3 mr-1.5" />
                                                                                            Submit
                                                                                        </>
                                                                                    )}
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </motion.div>
                                                                ))}
                                                            </>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Submission Dialog */}
            <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
                <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-secondary" />
                            Submit with Link
                        </DialogTitle>
                        <DialogDescription>
                            Provided an optional link for <span className="text-foreground font-semibold">{submittingTask?.question_title}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="solution_url" className="text-sm font-medium">
                                Solution URL (Optional)
                            </Label>
                            <Input
                                id="solution_url"
                                placeholder="https://github.com/..."
                                value={solutionUrl}
                                onChange={(e) => setSolutionUrl(e.target.value)}
                                className="bg-muted/30 border-border/50 focus:ring-secondary/50"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                GitHub, Gist, or any public link to your work.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-between flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsSubmitDialogOpen(false)}
                            className="border-border/50"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            onClick={handleSubmitTask}
                            disabled={isSubmitting}
                            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold shadow-lg shadow-secondary/20 min-w-[120px]"
                        >
                            {isSubmitting ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                                "Submit Solution"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
