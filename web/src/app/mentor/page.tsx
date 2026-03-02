"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Users, TrendingUp, AlertCircle, Plus, BookOpen, Check, ChevronRight, ChevronLeft, Calendar, Target, User } from "lucide-react";
import { toast } from "sonner";

interface Mentee {
    id: string;
    name: string;
    email: string;
}

interface Assignment {
    id: string;
    title: string;
    status: string;
    start_date: string;
    deadline: string;
}

interface Question {
    id: string;
    title: string;
    difficulty: "easy" | "medium" | "hard";
    topic: string;
}

type WizardStep = "select-mentee" | "select-questions" | "set-details" | "confirm";

export default function MentorDashboard() {
    const { user } = useAuthStore();
    const [mentees, setMentees] = useState<Mentee[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Wizard State
    const [step, setStep] = useState<WizardStep>("select-mentee");
    const [selectedMentee, setSelectedMentee] = useState<Mentee | null>(null);
    const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
    const [assignTitle, setAssignTitle] = useState("");
    const [startDate, setStartDate] = useState("");
    const [deadline, setDeadline] = useState("");
    const [creating, setCreating] = useState(false);

    // View Progress State
    const [viewProgressMentee, setViewProgressMentee] = useState<Mentee | null>(null);
    const [menteeProgress, setMenteeProgress] = useState<Assignment[]>([]);
    const [loadingProgress, setLoadingProgress] = useState(false);

    const [stats, setStats] = useState({ completionRate: 0, pendingReviews: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [menteesRes, qRes, actRes] = await Promise.all([
                fetchApi("/users/mentees"),
                fetchApi("/questions?limit=50"),
                fetchApi("/submissions/activity/recent?limit=100") // to get pending reviews
            ]);

            const allMentees: Mentee[] = menteesRes.data || [];
            setMentees(allMentees);
            setQuestions(qRes.data || []);

            // Calculate 'Pending Reviews'
            const recentActivities = actRes.data || [];
            const pending = recentActivities.filter((a: any) => a.submission_status === "submitted").length;

            // Calculate 'Completion Rate'
            let totalAssignments = 0;
            let completedAssignments = 0;

            await Promise.all(
                allMentees.map(async (m) => {
                    try {
                        const res = await fetchApi(`/assignments/mentee/${m.id}?limit=20`);
                        const assigns = res.data || [];
                        totalAssignments += assigns.length;
                        completedAssignments += assigns.filter((a: any) => a.status === "completed").length;
                    } catch {
                        // ignore
                    }
                })
            );

            let rate = 0;
            if (totalAssignments > 0) {
                rate = Math.round((completedAssignments / totalAssignments) * 100);
            }

            setStats({ completionRate: rate, pendingReviews: pending });

        } catch (err) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const toggleQuestion = (q: Question) => {
        setSelectedQuestions((prev) =>
            prev.find((x) => x.id === q.id)
                ? prev.filter((x) => x.id !== q.id)
                : [...prev, q]
        );
    };

    const resetWizard = () => {
        setStep("select-mentee");
        setSelectedMentee(null);
        setSelectedQuestions([]);
        setAssignTitle("");
        setStartDate("");
        setDeadline("");
    };

    const handleAssign = async () => {
        if (!selectedMentee || !assignTitle || !startDate || !deadline) {
            toast.error("Please fill all required fields");
            return;
        }
        if (selectedQuestions.length === 0) {
            toast.error("Please select at least one question");
            return;
        }
        setCreating(true);
        try {
            const payload = {
                mentee_id: selectedMentee.id,
                title: assignTitle,
                start_date: new Date(startDate).toISOString(),
                deadline: new Date(deadline).toISOString(),
                question_ids: selectedQuestions.map((q) => q.id),
            };
            const res = await fetchApi("/assignments", { method: "POST", body: JSON.stringify(payload) });
            toast.success(`Assignment "${assignTitle}" created for ${selectedMentee.name}!`, {
                description: `${selectedQuestions.length} tasks assigned.`,
            });
            setIsDialogOpen(false);
            resetWizard();
        } catch (err: any) {
            toast.error("Failed to create assignment", { description: err.message });
        } finally {
            setCreating(false);
        }
    };

    const handleViewProgress = async (mentee: Mentee) => {
        setViewProgressMentee(mentee);
        try {
            setLoadingProgress(true);
            const res = await fetchApi(`/assignments/mentee/${mentee.id}?limit=50`);
            setMenteeProgress(res.data || []);
        } catch {
            toast.error("Failed to load mentee progress.");
        } finally {
            setLoadingProgress(false);
        }
    };

    const getDifficultyStyle = (diff: string) => {
        switch (diff.toLowerCase()) {
            case "easy": return "border-primary/40 bg-primary/10 text-primary";
            case "medium": return "border-secondary/40 bg-secondary/10 text-secondary";
            case "hard": return "border-destructive/40 bg-destructive/10 text-destructive";
            default: return "";
        }
    };

    const STEPS: { key: WizardStep; label: string }[] = [
        { key: "select-mentee", label: "Mentee" },
        { key: "select-questions", label: "Questions" },
        { key: "set-details", label: "Details" },
        { key: "confirm", label: "Confirm" },
    ];

    const currentStepIndex = STEPS.findIndex((s) => s.key === step);

    const canProceed = () => {
        if (step === "select-mentee") return !!selectedMentee;
        if (step === "select-questions") return selectedQuestions.length > 0;
        if (step === "set-details") return !!assignTitle && !!startDate && !!deadline;
        return true;
    };

    const nextStep = () => {
        const order: WizardStep[] = ["select-mentee", "select-questions", "set-details", "confirm"];
        const nextIdx = order.indexOf(step) + 1;
        if (nextIdx < order.length) setStep(order[nextIdx]);
    };
    const prevStep = () => {
        const order: WizardStep[] = ["select-mentee", "select-questions", "set-details", "confirm"];
        const prevIdx = order.indexOf(step) - 1;
        if (prevIdx >= 0) setStep(order[prevIdx]);
    };

    return (
        <>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Mentor Overview</h1>
                        <p className="text-muted-foreground mt-2">Manage your mentees and assign DSA goals.</p>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetWizard(); }}>
                        <DialogTrigger asChild>
                            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/20 transition-all active:scale-[0.98]">
                                <Plus className="w-4 h-4 mr-2" />
                                Assign New Goal
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[580px] border-border/50 bg-background/98 backdrop-blur-xl max-h-[90vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle className="text-2xl">Assign Goal to Mentee</DialogTitle>
                                <DialogDescription>Create a personalized DSA assignment with selected tasks.</DialogDescription>
                            </DialogHeader>

                            {/* Step Indicator */}
                            <div className="flex items-center gap-0 mt-2 mb-4">
                                {STEPS.map((s, i) => (
                                    <div key={s.key} className="flex items-center flex-1">
                                        <div className={`flex items-center justify-center rounded-full w-8 h-8 text-xs font-bold shrink-0 transition-all ${i < currentStepIndex ? "bg-secondary text-secondary-foreground"
                                            : i === currentStepIndex ? "bg-primary/20 text-primary border-2 border-primary"
                                                : "bg-muted text-muted-foreground"
                                            }`}>
                                            {i < currentStepIndex ? <Check className="w-3.5 h-3.5" /> : i + 1}
                                        </div>
                                        <span className={`ml-1.5 text-xs font-medium hidden sm:block ${i === currentStepIndex ? "text-foreground" : "text-muted-foreground"
                                            }`}>{s.label}</span>
                                        {i < STEPS.length - 1 && (
                                            <div className={`h-px flex-1 mx-2 ${i < currentStepIndex ? "bg-secondary" : "bg-border/60"}`} />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Step Content */}
                            <div className="overflow-y-auto flex-1 pr-1">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={step}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.22 }}
                                    >
                                        {/* STEP 1: Select Mentee */}
                                        {step === "select-mentee" && (
                                            <div className="space-y-3">
                                                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2"><User className="h-4 w-4" /> Select a Mentee</p>
                                                {loading ? (
                                                    <div className="space-y-2">
                                                        {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse bg-muted/40 rounded-xl" />)}
                                                    </div>
                                                ) : mentees.length === 0 ? (
                                                    <p className="text-muted-foreground text-center py-8">No mentees found. Mentees need to sign up first.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {mentees.map((m) => (
                                                            <div
                                                                key={m.id}
                                                                onClick={() => setSelectedMentee(m)}
                                                                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${selectedMentee?.id === m.id
                                                                    ? "border-secondary bg-secondary/10 shadow-sm shadow-secondary/20"
                                                                    : "border-border/50 hover:border-secondary/40 hover:bg-muted/20"
                                                                    }`}
                                                            >
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${selectedMentee?.id === m.id ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                                                                    }`}>
                                                                    {(m.name || m.email).charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold truncate">{m.name || "—"}</p>
                                                                    <p className="text-sm text-muted-foreground truncate">{m.email}</p>
                                                                </div>
                                                                {selectedMentee?.id === m.id && <Check className="w-5 h-5 text-secondary shrink-0" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* STEP 2: Select Questions */}
                                        {step === "select-questions" && (
                                            <div className="space-y-3">
                                                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4" />
                                                    Pick Questions ({selectedQuestions.length} selected)
                                                </p>
                                                {questions.length === 0 ? (
                                                    <p className="text-muted-foreground text-center py-8">No questions in the bank. Add some first.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {questions.map((q) => {
                                                            const isSelected = !!selectedQuestions.find((x) => x.id === q.id);
                                                            return (
                                                                <div
                                                                    key={q.id}
                                                                    onClick={() => toggleQuestion(q)}
                                                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                                                                        ? "border-secondary bg-secondary/10"
                                                                        : "border-border/50 hover:border-secondary/40 hover:bg-muted/20"
                                                                        }`}
                                                                >
                                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? "bg-secondary border-secondary" : "border-muted-foreground"
                                                                        }`}>
                                                                        {isSelected && <Check className="w-3 h-3 text-secondary-foreground" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-semibold truncate">{q.title}</p>
                                                                        <p className="text-xs text-muted-foreground mt-0.5">{q.topic}</p>
                                                                    </div>
                                                                    <Badge variant="outline" className={`capitalize shrink-0 text-xs ${getDifficultyStyle(q.difficulty)}`}>
                                                                        {q.difficulty}
                                                                    </Badge>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* STEP 3: Set Details */}
                                        {step === "set-details" && (
                                            <div className="space-y-5">
                                                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2"><Target className="h-4 w-4" /> Assignment Details</p>
                                                <div className="space-y-2">
                                                    <Label>Goal Title *</Label>
                                                    <Input
                                                        value={assignTitle}
                                                        onChange={(e) => setAssignTitle(e.target.value)}
                                                        placeholder="e.g., Week 1 — Arrays & Two Pointers"
                                                        className="bg-background/50 border-border"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Start Date *</Label>
                                                        <Input
                                                            type="datetime-local"
                                                            value={startDate}
                                                            onChange={(e) => setStartDate(e.target.value)}
                                                            className="bg-background/50 border-border"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-destructive" /> Deadline *</Label>
                                                        <Input
                                                            type="datetime-local"
                                                            value={deadline}
                                                            onChange={(e) => setDeadline(e.target.value)}
                                                            className="bg-background/50 border-border"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 4: Confirm */}
                                        {step === "confirm" && selectedMentee && (
                                            <div className="space-y-5">
                                                <p className="text-sm text-muted-foreground font-medium">Review before assigning</p>

                                                <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center font-bold text-secondary-foreground">
                                                            {(selectedMentee.name || selectedMentee.email).charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-foreground">{selectedMentee.name}</p>
                                                            <p className="text-xs text-muted-foreground">{selectedMentee.email}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 pt-2 border-t border-border/40">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">Goal Title</span>
                                                            <span className="font-semibold text-foreground">{assignTitle}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">Questions</span>
                                                            <span className="font-semibold text-secondary">{selectedQuestions.length} selected</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">Start</span>
                                                            <span className="font-semibold">{new Date(startDate).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">Deadline</span>
                                                            <span className="font-semibold text-destructive">{new Date(deadline).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 border-t border-border/40">
                                                        <p className="text-xs text-muted-foreground mb-2">Tasks:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {selectedQuestions.map((q) => (
                                                                <Badge key={q.id} variant="outline" className={`text-xs ${getDifficultyStyle(q.difficulty)}`}>
                                                                    {q.title}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex justify-between pt-4 border-t border-border/40 mt-4">
                                <Button
                                    variant="outline"
                                    onClick={step === "select-mentee" ? () => setIsDialogOpen(false) : prevStep}
                                    className="border-border/50"
                                >
                                    {step === "select-mentee" ? "Cancel" : <><ChevronLeft className="w-4 h-4 mr-1" /> Back</>}
                                </Button>
                                {step !== "confirm" ? (
                                    <Button
                                        onClick={nextStep}
                                        disabled={!canProceed()}
                                        className="bg-secondary hover:bg-secondary/90 text-secondary-foreground min-w-[100px]"
                                    >
                                        Next <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleAssign}
                                        disabled={creating}
                                        className="bg-secondary hover:bg-secondary/90 text-secondary-foreground min-w-[120px] shadow-lg shadow-secondary/20"
                                    >
                                        {creating ? "Assigning..." : "✓ Assign Goal"}
                                    </Button>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* View Progress Dialog */}
                    <Dialog open={!!viewProgressMentee} onOpenChange={(open) => { if (!open) setViewProgressMentee(null); }}>
                        <DialogContent className="sm:max-w-[500px] border-border/50 bg-background/98 backdrop-blur-xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-xl">Progress: {viewProgressMentee?.name}</DialogTitle>
                                <DialogDescription>Overview of assigned goals and their statuses.</DialogDescription>
                            </DialogHeader>

                            {loadingProgress ? (
                                <div className="py-12 flex justify-center"><div className="w-8 h-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" /></div>
                            ) : menteeProgress.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-xl bg-card/20">
                                    <Target className="w-10 h-10 mb-2 opacity-20" />
                                    <p>No goals assigned to this mentee yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 mt-2 pr-1">
                                    {menteeProgress.map(a => {
                                        const isCompleted = a.status === 'completed';
                                        return (
                                            <div key={a.id} className="p-4 rounded-xl border border-border/50 bg-card/40 flex justify-between items-center group hover:bg-muted/20 hover:border-border/80 transition-all">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <p className="font-semibold text-foreground truncate">{a.title}</p>
                                                    <div className="flex gap-3 text-xs text-muted-foreground mt-1.5">
                                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(a.start_date).toLocaleDateString()}</span>
                                                        <span className="flex items-center gap-1"><Check className="w-3 h-3" /> {new Date(a.deadline).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className={`capitalize shrink-0 h-6 ${isCompleted ? 'border-secondary/50 text-secondary bg-secondary/10' : 'border-primary/50 text-primary bg-primary/10'}`}>
                                                    {isCompleted ? 'Completed' : 'Active'}
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="border-border/50 bg-card/40 backdrop-blur">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Active Mentees</CardTitle>
                            <Users className="h-4 w-4 text-secondary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{loading ? "—" : mentees.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total registered</p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 bg-card/40 backdrop-blur">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
                            <TrendingUp className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{loading ? "—" : `${stats.completionRate}%`}</div>
                            <p className="text-xs text-muted-foreground mt-1">Average goal completion</p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 bg-card/40 backdrop-blur border-destructive/30">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-destructive">Pending Reviews</CardTitle>
                            <AlertCircle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-destructive">{loading ? "—" : stats.pendingReviews}</div>
                            <p className="text-xs text-destructive/70 mt-1">Require your feedback</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Mentees List */}
                <h2 className="text-xl font-bold tracking-tight">Your Mentees</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        [1, 2, 3].map((i) => (
                            <Card key={i} className="animate-pulse bg-card/40 border-border/40">
                                <CardHeader className="h-24" />
                                <CardContent className="h-16" />
                            </Card>
                        ))
                    ) : mentees.length === 0 ? (
                        <div className="col-span-3 text-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                            <p>No mentees yet. Ask them to sign up with the mentee role.</p>
                        </div>
                    ) : (
                        mentees.map((mentee, idx) => (
                            <motion.div
                                key={mentee.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.08 }}
                            >
                                <Card className="hover:border-secondary/50 transition-colors cursor-pointer group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary/40 group-hover:bg-secondary transition-colors" />
                                    <CardHeader className="flex flex-row items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                                            {(mentee.name || mentee.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg leading-tight">{mentee.name || "—"}</CardTitle>
                                            <CardDescription>{mentee.email}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex gap-2 mt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 border-border/50 hover:bg-secondary/10 hover:text-secondary group-hover:border-secondary/30 transition-colors"
                                                onClick={() => {
                                                    setSelectedMentee(mentee);
                                                    setStep("select-questions");
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <Plus className="w-3 h-3 mr-1" /> Assign Goal
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 border-border/50 hover:bg-muted/20 transition-colors"
                                                onClick={() => handleViewProgress(mentee)}
                                            >
                                                <BookOpen className="w-3 h-3 mr-1" /> View Progress
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
