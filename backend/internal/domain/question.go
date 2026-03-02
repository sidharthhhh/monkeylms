package domain

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

type CreateQuestionRequest struct {
	Title           string `json:"title"`
	ContentMarkdown string `json:"content_markdown"`
	Difficulty      string `json:"difficulty"`
	Topic           string `json:"topic"`
	ExternalLink    string `json:"external_link,omitempty"`
	CreatedBy       string `json:"-"` // Extracted from JWT token
}

type QuestionResponse struct {
	ID              pgtype.UUID `json:"id"`
	Title           string      `json:"title"`
	ContentMarkdown string      `json:"content_markdown"`
	Difficulty      string      `json:"difficulty"`
	Topic           string      `json:"topic"`
	ExternalLink    *string     `json:"external_link,omitempty"`
}

type QuestionService interface {
	CreateQuestion(ctx context.Context, req CreateQuestionRequest) (*QuestionResponse, error)
	GetQuestionByID(ctx context.Context, id string) (*QuestionResponse, error)
	ListQuestions(ctx context.Context, limit, offset int32) ([]QuestionResponse, error)
}
