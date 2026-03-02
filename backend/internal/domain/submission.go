package domain

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

type CreateSubmissionRequest struct {
	AssignmentTaskID string `json:"assignment_task_id"`
	SolutionURL      string `json:"solution_url"`
	MenteeID         string `json:"-"`
}

type CreateFeedbackRequest struct {
	SubmissionID     string `json:"submission_id"`
	Comment          string `json:"comment"`
	RevisionRequired bool   `json:"revision_required"`
	MentorID         string `json:"-"`
}

type SubmissionResponse struct {
	ID               pgtype.UUID `json:"id"`
	AssignmentTaskID pgtype.UUID `json:"assignment_task_id"`
	MenteeID         pgtype.UUID `json:"mentee_id"`
	SolutionURL      string      `json:"solution_url"`
	Status           string      `json:"status"`
	SubmittedAt      time.Time   `json:"submitted_at"`
}

type SubmissionDetailResponse struct {
	SubmissionID     string `json:"submission_id"`
	SolutionURL      string `json:"solution_url"`
	Status           string `json:"status"`
	SubmittedAt      string `json:"submitted_at"`
	TaskID           string `json:"task_id"`
	QuestionTitle    string `json:"question_title"`
	QuestionDiff     string `json:"question_difficulty"`
	MenteeName       string `json:"mentee_name"`
	FeedbackID       string `json:"feedback_id"`
	FeedbackComment  string `json:"feedback_comment"`
	RevisionRequired bool   `json:"revision_required"`
}

type FeedbackResponse struct {
	ID               pgtype.UUID `json:"id"`
	SubmissionID     pgtype.UUID `json:"submission_id"`
	MentorID         pgtype.UUID `json:"mentor_id"`
	Comment          string      `json:"comment"`
	RevisionRequired bool        `json:"revision_required"`
	CreatedAt        time.Time   `json:"created_at"`
}

type RecentActivityItem struct {
	SubmissionID     string `json:"submission_id"`
	MenteeID         string `json:"mentee_id"`
	MenteeName       string `json:"mentee_name"`
	TaskID           string `json:"task_id"`
	QuestionTitle    string `json:"question_title"`
	SolutionURL      string `json:"solution_url"`
	SubmissionStatus string `json:"submission_status"`
	SubmittedAt      string `json:"submitted_at"`
}

type SubmissionService interface {
	CreateSubmission(ctx context.Context, req CreateSubmissionRequest) (*SubmissionResponse, error)
	GetSubmissionsForTask(ctx context.Context, taskID string) ([]SubmissionResponse, error)
	GetSubmissionsByAssignment(ctx context.Context, assignmentID string) ([]SubmissionDetailResponse, error)
	CreateFeedback(ctx context.Context, req CreateFeedbackRequest) (*FeedbackResponse, error)
	GetFeedbackForSubmission(ctx context.Context, submissionID string) (*FeedbackResponse, error)
	GetRecentActivity(ctx context.Context, limit int32) ([]RecentActivityItem, error)
}
