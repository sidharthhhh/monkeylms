"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Link as LinkIcon, Database, Filter } from "lucide-react";
import { toast } from "sonner";

interface Question {
    id: string;
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    topic: string;
    external_link?: string;
}

export default function QuestionBank() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // New Question Form State
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newTopic, setNewTopic] = useState("");
    const [newDifficulty, setNewDifficulty] = useState<"easy" | "medium" | "hard">("medium");
    const [newLink, setNewLink] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadQuestions();
    }, []);

    const loadQuestions = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/questions");
            setQuestions(res.data || []);
        } catch (err) {
            toast.error("Failed to fetch questions");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle || !newDesc || !newTopic) {
            toast.error("Please fill all required fields");
            return;
        }

        setCreating(true);
        try {
            const payload = {
                title: newTitle,
                content_markdown: newDesc,   // backend expects content_markdown, not description
                topic: newTopic,
                difficulty: newDifficulty,
                external_link: newLink || undefined,
            };

            await fetchApi("/questions", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            toast.success("Question added successfully!");
            setIsDialogOpen(false);

            // Reset form
            setNewTitle("");
            setNewDesc("");
            setNewTopic("");
            setNewLink("");

            // Reload list
            loadQuestions();
        } catch (err: any) {
            toast.error("Creation failed", { description: err.message });
        } finally {
            setCreating(false);
        }
    };

    const getDifficultyColor = (diff: string) => {
        switch (diff.toLowerCase()) {
            case "easy": return "bg-primary/20 text-primary hover:bg-primary/30 border-primary/30";
            case "medium": return "bg-secondary/20 text-secondary hover:bg-secondary/30 border-secondary/30";
            case "hard": return "bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30";
            default: return "";
        }
    };

    const filteredQuestions = questions.filter(
        (q) =>
            q.title.toLowerCase().includes(search.toLowerCase()) ||
            q.topic.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
                    <p className="text-muted-foreground mt-2">Manage the repository of DSA problems and tasks.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/20 transition-all active:scale-[0.98]">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Question
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] border-border/50 bg-background/95 backdrop-blur-xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl">Add New Question</DialogTitle>
                            <DialogDescription>
                                Create a new task to assign to mentees.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateQuestion} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Problem Title *</Label>
                                <Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required placeholder="e.g. Reverse Linked List" className="bg-background/50 border-border" />
                            </div>
                            <div className="space-y-2">
                                <Label>Difficulty *</Label>
                                <Select value={newDifficulty} onValueChange={(v: any) => setNewDifficulty(v)}>
                                    <SelectTrigger className="bg-background/50 border-border">
                                        <SelectValue placeholder="Select difficulty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easy">Easy</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="hard">Hard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="topic">Topic / Category *</Label>
                                <Input id="topic" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} required placeholder="e.g. Arrays, Trees, Dynamic Programming" className="bg-background/50 border-border" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="link">External Link (Optional)</Label>
                                <Input id="link" value={newLink} onChange={(e) => setNewLink(e.target.value)} type="url" placeholder="e.g. LeetCode URL" className="bg-background/50 border-border" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="desc">Description *</Label>
                                <Textarea id="desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} required placeholder="Detailed problem description or instructions..." className="bg-background/50 border-border min-h-[100px]" />
                            </div>
                            <div className="flex justify-end pt-4 gap-2">
                                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)} className="border-border/50">Cancel</Button>
                                <Button type="submit" disabled={creating} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/20 min-w-[100px]">
                                    {creating ? "Saving..." : "Save Question"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-border/50 bg-card/40 backdrop-blur">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by title or topic..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 bg-background/50 border-border"
                            />
                        </div>
                        <Button variant="outline" className="w-full sm:w-auto border-border/50">
                            <Filter className="w-4 h-4 mr-2" />
                            Filter
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border/50 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 p-4 font-medium text-muted-foreground bg-muted/30 border-b border-border/50 text-sm">
                            <div className="col-span-5 sm:col-span-6 lg:col-span-5">Title</div>
                            <div className="col-span-4 sm:col-span-3 lg:col-span-2 hidden sm:block">Topic</div>
                            <div className="col-span-4 sm:col-span-3 lg:col-span-2">Difficulty</div>
                            <div className="col-span-3 lg:col-span-3 text-right">Actions</div>
                        </div>

                        <div className="divide-y divide-border/50">
                            {loading ? (
                                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-secondary border-t-transparent mb-4" />
                                    Loading questions...
                                </div>
                            ) : filteredQuestions.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                                    <Database className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                    <p>No questions found in the bank.</p>
                                    <p className="text-sm mt-1">Try adding a new one or clear search filters.</p>
                                </div>
                            ) : (
                                filteredQuestions.map((q, idx) => (
                                    <motion.div
                                        key={q.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/10 transition-colors group"
                                    >
                                        <div className="col-span-5 sm:col-span-6 lg:col-span-5">
                                            <p className="font-semibold text-foreground truncate">{q.title}</p>
                                        </div>

                                        <div className="col-span-4 sm:col-span-3 lg:col-span-2 hidden sm:flex items-center">
                                            <span className="text-sm text-muted-foreground truncate">{q.topic}</span>
                                        </div>

                                        <div className="col-span-4 sm:col-span-3 lg:col-span-2 flex items-center">
                                            <Badge variant="outline" className={`capitalize ${getDifficultyColor(q.difficulty)}`}>
                                                {q.difficulty}
                                            </Badge>
                                        </div>

                                        <div className="col-span-3 lg:col-span-3 flex justify-end items-center gap-2">
                                            {q.external_link && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                                                    <a href={q.external_link} target="_blank" rel="noopener noreferrer" title="External Link">
                                                        <LinkIcon className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            )}
                                            <Button variant="outline" size="sm" className="border-border/50 hover:bg-secondary/10 hover:text-secondary group-hover:border-secondary/30 transition-colors h-8">
                                                Assign
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
