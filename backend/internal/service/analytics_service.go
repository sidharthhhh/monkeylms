package service

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/username/monkeylms/internal/domain"
	"github.com/username/monkeylms/internal/repository"
)

type analyticsService struct {
	repo *repository.Queries
}

func NewAnalyticsService(repo *repository.Queries) domain.AnalyticsService {
	return &analyticsService{repo: repo}
}

func (s *analyticsService) GetLeaderboard(ctx context.Context, batchID string, weekStart, weekEnd time.Time) (*domain.LeaderboardResponse, error) {
	var bID pgtype.UUID
	if err := bID.Scan(batchID); err != nil {
		return nil, errors.New("invalid batch id")
	}

	ws := pgtype.Timestamptz{Time: weekStart, Valid: true}
	we := pgtype.Timestamptz{Time: weekEnd, Valid: true}

	lb, err := s.repo.GetLeaderboard(ctx, repository.GetLeaderboardParams{
		BatchID:   bID,
		WeekStart: ws,
		WeekEnd:   we,
	})
	if err != nil {
		return nil, errors.New("leaderboard not found")
	}

	entries, err := s.repo.GetLeaderboardEntries(ctx, lb.ID)
	if err != nil {
		entries = []repository.GetLeaderboardEntriesRow{}
	}

	resEntries := make([]domain.LeaderboardEntryResponse, 0, len(entries))
	for _, e := range entries {
		resE := domain.LeaderboardEntryResponse{
			MenteeID:   e.MenteeID,
			MenteeName: e.MenteeName,
			Score:      e.Score,
			Rank:       e.Rank,
		}
		if e.MenteeAvatar != nil {
			resE.AvatarURL = e.MenteeAvatar
		}
		resEntries = append(resEntries, resE)
	}

	return &domain.LeaderboardResponse{
		ID:        lb.ID,
		BatchID:   lb.BatchID,
		WeekStart: lb.WeekStart.Time.Format(time.RFC3339),
		WeekEnd:   lb.WeekEnd.Time.Format(time.RFC3339),
		Entries:   resEntries,
	}, nil
}

func (s *analyticsService) GetGlobalLeaderboard(ctx context.Context) ([]domain.GlobalLeaderboardEntryResponse, error) {
	entries, err := s.repo.GetGlobalLeaderboard(ctx)
	if err != nil {
		return nil, err
	}

	res := make([]domain.GlobalLeaderboardEntryResponse, 0, len(entries))
	for _, e := range entries {
		res = append(res, domain.GlobalLeaderboardEntryResponse{
			MenteeID:   e.MenteeID,
			MenteeName: e.MenteeName,
			Score:      e.Score,
			Rank:       e.Rank,
		})
	}
	return res, nil
}

func (s *analyticsService) CreateLeaderboard(ctx context.Context, req domain.CreateLeaderboardRequest) (*domain.LeaderboardResponse, error) {
	var bID pgtype.UUID
	if err := bID.Scan(req.BatchID); err != nil {
		return nil, errors.New("invalid batch id")
	}

	ws := pgtype.Timestamptz{Time: req.WeekStart, Valid: true}
	we := pgtype.Timestamptz{Time: req.WeekEnd, Valid: true}

	lb, err := s.repo.CreateLeaderboard(ctx, repository.CreateLeaderboardParams{
		BatchID:   bID,
		WeekStart: ws,
		WeekEnd:   we,
	})
	if err != nil {
		return nil, err
	}

	return &domain.LeaderboardResponse{
		ID:        lb.ID,
		BatchID:   lb.BatchID,
		WeekStart: lb.WeekStart.Time.Format(time.RFC3339),
		WeekEnd:   lb.WeekEnd.Time.Format(time.RFC3339),
		Entries:   []domain.LeaderboardEntryResponse{},
	}, nil
}

func (s *analyticsService) UpsertLeaderboardEntry(ctx context.Context, req domain.UpsertEntryRequest) error {
	var lID pgtype.UUID
	var mID pgtype.UUID

	if err := lID.Scan(req.LeaderboardID); err != nil {
		return errors.New("invalid leaderboard id")
	}
	if err := mID.Scan(req.MenteeID); err != nil {
		return errors.New("invalid mentee id")
	}

	err := s.repo.UpsertLeaderboardEntry(ctx, repository.UpsertLeaderboardEntryParams{
		LeaderboardID: lID,
		MenteeID:      mID,
		Score:         req.Score,
		Rank:          req.Rank,
	})
	return err
}

func (s *analyticsService) GetMenteeAnalytics(ctx context.Context, menteeID string) (*domain.MenteeAnalyticsResponse, error) {
	var mID pgtype.UUID
	if err := mID.Scan(menteeID); err != nil {
		return nil, errors.New("invalid mentee id")
	}

	analytics, err := s.repo.GetMenteeAnalytics(ctx, mID)
	if err != nil {
		return nil, err
	}

	var rate float64
	if analytics.TotalTasks > 0 {
		rate = (float64(analytics.CompletedTasks) / float64(analytics.TotalTasks)) * 100.0
	}

	return &domain.MenteeAnalyticsResponse{
		TotalTasks:     analytics.TotalTasks,
		CompletedTasks: analytics.CompletedTasks,
		DoubtTasks:     analytics.DoubtTasks,
		CompletionRate: rate,
	}, nil
}
