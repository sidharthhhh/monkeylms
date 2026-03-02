package domain

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

type LeaderboardEntryResponse struct {
	MenteeID   pgtype.UUID `json:"mentee_id"`
	MenteeName string      `json:"mentee_name"`
	AvatarURL  *string     `json:"avatar_url"`
	Score      int32       `json:"score"`
	Rank       *int32      `json:"rank"`
}

type GlobalLeaderboardEntryResponse struct {
	MenteeID   string `json:"mentee_id"`
	MenteeName string `json:"mentee_name"`
	Score      int32  `json:"score"`
	Rank       int32  `json:"rank"`
}

type LeaderboardResponse struct {
	ID        pgtype.UUID                `json:"id"`
	BatchID   pgtype.UUID                `json:"batch_id"`
	WeekStart string                     `json:"week_start"`
	WeekEnd   string                     `json:"week_end"`
	Entries   []LeaderboardEntryResponse `json:"entries"`
}

type MenteeAnalyticsResponse struct {
	TotalTasks     int64   `json:"total_tasks"`
	CompletedTasks int64   `json:"completed_tasks"`
	DoubtTasks     int64   `json:"doubt_tasks"`
	CompletionRate float64 `json:"completion_rate"`
}

type CreateLeaderboardRequest struct {
	BatchID   string    `json:"batch_id"`
	WeekStart time.Time `json:"week_start"`
	WeekEnd   time.Time `json:"week_end"`
}

type UpsertEntryRequest struct {
	LeaderboardID string `json:"leaderboard_id"`
	MenteeID      string `json:"mentee_id"`
	Score         int32  `json:"score"`
	Rank          *int32 `json:"rank,omitempty"`
}

type AnalyticsService interface {
	GetLeaderboard(ctx context.Context, batchID string, weekStart, weekEnd time.Time) (*LeaderboardResponse, error)
	GetGlobalLeaderboard(ctx context.Context) ([]GlobalLeaderboardEntryResponse, error)
	CreateLeaderboard(ctx context.Context, req CreateLeaderboardRequest) (*LeaderboardResponse, error)
	UpsertLeaderboardEntry(ctx context.Context, req UpsertEntryRequest) error
	GetMenteeAnalytics(ctx context.Context, menteeID string) (*MenteeAnalyticsResponse, error)
}
