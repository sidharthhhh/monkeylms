package service

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/username/monkeylms/internal/domain"
	"github.com/username/monkeylms/internal/repository"
)

type questionService struct {
	repo *repository.Queries
}

func NewQuestionService(repo *repository.Queries) domain.QuestionService {
	return &questionService{
		repo: repo,
	}
}

func (s *questionService) CreateQuestion(ctx context.Context, req domain.CreateQuestionRequest) (*domain.QuestionResponse, error) {
	var extLink *string
	if req.ExternalLink != "" {
		extLink = &req.ExternalLink
	}

	var createdBy pgtype.UUID
	if err := createdBy.Scan(req.CreatedBy); err != nil {
		return nil, errors.New("invalid created_by uuid")
	}

	params := repository.CreateQuestionParams{
		Title:           req.Title,
		ContentMarkdown: req.ContentMarkdown,
		Difficulty:      repository.DifficultyLevel(req.Difficulty),
		Topic:           req.Topic,
		ExternalLink:    extLink,
		CreatedBy:       createdBy,
	}

	question, err := s.repo.CreateQuestion(ctx, params)
	if err != nil {
		return nil, err
	}

	res := &domain.QuestionResponse{
		ID:              question.ID,
		Title:           question.Title,
		ContentMarkdown: question.ContentMarkdown,
		Difficulty:      string(question.Difficulty),
		Topic:           question.Topic,
	}
	if question.ExternalLink != nil {
		res.ExternalLink = question.ExternalLink
	}

	return res, nil
}

func (s *questionService) GetQuestionByID(ctx context.Context, id string) (*domain.QuestionResponse, error) {
	var qID pgtype.UUID
	if err := qID.Scan(id); err != nil {
		return nil, errors.New("invalid uuid format")
	}

	question, err := s.repo.GetQuestionByID(ctx, qID)
	if err != nil {
		return nil, errors.New("question not found")
	}

	res := &domain.QuestionResponse{
		ID:              question.ID,
		Title:           question.Title,
		ContentMarkdown: question.ContentMarkdown,
		Difficulty:      string(question.Difficulty),
		Topic:           question.Topic,
	}
	if question.ExternalLink != nil {
		res.ExternalLink = question.ExternalLink
	}

	return res, nil
}

func (s *questionService) ListQuestions(ctx context.Context, limit, offset int32) ([]domain.QuestionResponse, error) {
	params := repository.ListQuestionsParams{
		Limit:  limit,
		Offset: offset,
	}

	questions, err := s.repo.ListQuestions(ctx, params)
	if err != nil {
		return nil, err
	}

	res := make([]domain.QuestionResponse, 0, len(questions))
	for _, q := range questions {
		item := domain.QuestionResponse{
			ID:              q.ID,
			Title:           q.Title,
			ContentMarkdown: q.ContentMarkdown,
			Difficulty:      string(q.Difficulty),
			Topic:           q.Topic,
		}
		if q.ExternalLink != nil {
			item.ExternalLink = q.ExternalLink
		}
		res = append(res, item)
	}

	return res, nil
}
