package domain

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

type CreateAssignmentRequest struct {
	MenteeID    string   `json:"mentee_id"`
	Title       string   `json:"title"`
	StartDate   string   `json:"start_date"` // expected RFC3339
	Deadline    string   `json:"deadline"`
	QuestionIDs []string `json:"question_ids"`
	AssignedBy  string   `json:"-"`
}

type AssignmentResponse struct {
	ID        pgtype.UUID `json:"id"`
	MenteeID  pgtype.UUID `json:"mentee_id"`
	Title     string      `json:"title"`
	Status    string      `json:"status"`
	StartDate string      `json:"start_date"`
	Deadline  string      `json:"deadline"`
}

type TaskResponse struct {
	TaskID             pgtype.UUID `json:"task_id"`
	AssignmentID       pgtype.UUID `json:"assignment_id"`
	TaskStatus         string      `json:"task_status"`
	QuestionID         pgtype.UUID `json:"question_id"`
	QuestionTitle      string      `json:"question_title"`
	QuestionDifficulty string      `json:"question_difficulty"`
}

type AssignmentDetailResponse struct {
	Assignment AssignmentResponse `json:"assignment"`
	Tasks      []TaskResponse     `json:"tasks"`
}

type AssignmentService interface {
	CreateAssignment(ctx context.Context, req CreateAssignmentRequest) (*AssignmentResponse, error)
	GetAssignmentWithTasks(ctx context.Context, id string) (*AssignmentDetailResponse, error)
	ListMenteeAssignments(ctx context.Context, menteeID string, limit, offset int32) ([]AssignmentResponse, error)
}
