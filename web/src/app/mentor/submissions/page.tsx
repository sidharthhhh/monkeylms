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
    CheckCircle2, Clock, AlertCircle, ChevronDown,
    ChevronUp, ExternalLink, MessageSquare, Send, User,
    BookOpen, Search, Filter, RefreshCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Submission {
    submission_id: string;
    solution_url: string;
    status: string;
    submitted_at: string;
    task_id: string;
    question_title: string;
    question_difficulty: string;
    mentee_name: string;
    mentee_id: string;
    feedback_id: string;
    feedback_comment: string;
    revision_required: boolean;
}

interface Assignment {
    id: string;
    title: string;
    mentee_name?: string;
}

export default function MentorSubmissions() {
    const { user } = useAuthStore();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

    // Feedback form state
    const [feedbackSubmissionId, setFeedbackSubmissionId] = useState<string | null>(null);
    const [feedbackComment, setFeedbackComment] = useState("");
    const [revisionRequired, setRevisionRequired] = useState(false);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

    useEffect(() => {
        loadAssignments();
    }, []);

    const loadAssignments = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/assignments"); // Get all assignments for mentor
            setAssignments(res.data || []);
            if (res.data?.length > 0) {
                setSelectedAssignmentId(res.data[0].id);
                loadSubmissions(res.data[0].id);
            }
        } catch {
            toast.error("Failed to load assignments");
        } finally {
            setLoading(false);
        }
    };

    const loadSubmissions = async (assignmentId: string) => {
        try {
            setLoadingSubmissions(true);
            const res = await fetchApi(`/submissions/assignment/${assignmentId}`);
            setSubmissions(res.data || []);
        } catch {
            toast.error("Failed to load submissions");
        } finally {
            setLoadingSubmissions(false);
        }
    };

    const handleAssignmentChange = (id: string) => {
        setSelectedAssignmentId(id);
        loadSubmissions(id);
    };

    const handleFeedbackSubmit = async () => {
        if (!feedbackSubmissionId || !feedbackComment) return;

        try {
            setSubmittingFeedback(true);
            await fetchApi("/submissions/feedback", {
                method: "POST",
                body: JSON.stringify({
                    submission_id: feedbackSubmissionId,
                    comment: feedbackComment,
                    revision_required: revisionRequired,
                }),
            });

            toast.success("Feedback sent successfully!");
            setFeedbackSubmissionId(null);
            setFeedbackComment("");
            setRevisionRequired(false);

            // Refresh submissions
            loadSubmissions(selectedAssignmentId);
        } catch {
            toast.error("Failed to send feedback");
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "submitted": return "border-blue-400/40 bg-blue-400/10 text-blue-400";
            case "reviewed": return "border-secondary/40 bg-secondary/10 text-secondary";
            case "revision_needed": return "border-yellow-400/40 bg-yellow-400/10 text-yellow-400";
            default: return "border-muted-foreground/30 text-muted-foreground";
        }
    };

    const getDiffStyle = (diff: string) => {
        switch (diff) {
            case "easy": return "border-secondary/40 text-secondary";
            case "medium": return "border-yellow-400/40 text-yellow-400";
            case "hard": return "border-destructive/40 text-destructive";
            default: return "";
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Submissions &amp; Feedback</h1>
                <p className="text-muted-foreground mt-2">
                    Review your mentees' solutions and provide guidance.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Left Side: Assignment List */}
                <Card className="w-full md:w-80 border-border/50 bg-card/40 backdrop-blur shrink-0">
                    <CardHeader className="pb-3 pt-5">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            Active Assignments
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pb-2">
                        {loading ? (
                            <div className="space-y-2 px-2">
                                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted/30 animate-pulse rounded-lg" />)}
                            </div>
                        ) : assignments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No active assignments.
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {assignments.map(a => (
                                    <button
                                        key={a.id}
                                        onClick={() => handleAssignmentChange(a.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex flex-col gap-0.5 ${selectedAssignmentId === a.id
                                                ? "bg-primary/20 text-primary border border-primary/30"
                                                : "hover:bg-muted/40 text-muted-foreground"
                                            }`}
                                    >
                                        <span className="font-semibold line-clamp-1">{a.title}</span>
                                        <span className={`text-[10px] ${selectedAssignmentId === a.id ? "text-primary/70" : "text-muted-foreground/60"}`}>
                                            ID: {a.id.split("-")[0]}...
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right Side: Submissions List */}
                <div className="flex-1 space-y-4">
                    {loadingSubmissions ? (
                        <div className="space-y-4">
                            {[1, 2].map(i => <div key={i} className="h-48 bg-card/40 animate-pulse rounded-xl border border-border/30" />)}
                        </div>
                    ) : submissions.length === 0 ? (
                        <Card className="border-dashed bg-card/20 py-20">
                            <CardContent className="flex flex-col items-center justify-center text-muted-foreground">
                                <Search className="h-10 w-10 mb-4 opacity-20" />
                                <p>No submissions found for this assignment.</p>
                                <p className="text-sm mt-1">Mentees haven't submitted anything yet.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {submissions.map((s, idx) => (
                                <motion.div
                                    key={s.submission_id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <Card className="border-border/50 bg-card/40 backdrop-blur overflow-hidden">
                                        <div className="p-5">
                                            <div className="flex flex-wrap items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-lg">{s.question_title}</h3>
                                                        <Badge variant="outline" className={`text-[10px] uppercase ${getDiffStyle(s.question_difficulty)}`}>
                                                            {s.question_difficulty}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                                                            <User className="h-3 w-3" />
                                                            {s.mentee_name || "Mentee"}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Clock className="h-3 w-3" />
                                                            {new Date(s.submitted_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={getStatusStyle(s.status)}>
                                                        {s.status.replace("_", " ")}
                                                    </Badge>
                                                    <a
                                                        href={s.solution_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="h-8 w-8 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                                                        title="View Solution"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Existing Feedback */}
                                            {s.feedback_id && (
                                                <div className="mt-4 p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <MessageSquare className="h-3.5 w-3.5 text-secondary" />
                                                        <span className="text-xs font-bold text-secondary uppercase tracking-wider">Your Feedback</span>
                                                        {s.revision_required && (
                                                            <Badge variant="outline" className="text-[10px] bg-yellow-400/10 text-yellow-500 border-yellow-400/40">
                                                                Revision Needed
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm italic text-foreground/80 leading-relaxed">
                                                        "{s.feedback_comment}"
                                                    </p>
                                                </div>
                                            )}

                                            {/* Feedback Action */}
                                            {!s.feedback_id && feedbackSubmissionId !== s.submission_id && (
                                                <div className="mt-4 pt-4 border-t border-border/30 flex justify-end">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs border-primary/40 text-primary hover:bg-primary/10"
                                                        onClick={() => setFeedbackSubmissionId(s.submission_id)}
                                                    >
                                                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                                                        Provide Feedback
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Feedback Form */}
                                            {feedbackSubmissionId === s.submission_id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    className="mt-4 pt-4 border-t border-border/30 space-y-4"
                                                >
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold text-muted-foreground uppercase">Review Comments</label>
                                                        <Textarea
                                                            placeholder="Great job! Maybe optimize the loops..."
                                                            value={feedbackComment}
                                                            onChange={(e) => setFeedbackComment(e.target.value)}
                                                            className="min-h-[100px] border-border/50 bg-muted/20"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={revisionRequired}
                                                                onChange={(e) => setRevisionRequired(e.target.checked)}
                                                                className="rounded border-border/50 text-yellow-500 focus:ring-yellow-500 bg-muted/20"
                                                            />
                                                            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                                                Require Revision?
                                                            </span>
                                                        </label>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setFeedbackSubmissionId(null);
                                                                    setFeedbackComment("");
                                                                    setRevisionRequired(false);
                                                                }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6"
                                                                disabled={!feedbackComment || submittingFeedback}
                                                                onClick={handleFeedbackSubmit}
                                                            >
                                                                {submittingFeedback ? (
                                                                    <RefreshCcw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                                ) : (
                                                                    <Send className="h-3.5 w-3.5 mr-1.5" />
                                                                )}
                                                                Send Feedback
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
