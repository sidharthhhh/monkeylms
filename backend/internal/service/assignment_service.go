package service

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/username/monkeylms/internal/domain"
	"github.com/username/monkeylms/internal/repository"
)

type assignmentService struct {
	repo *repository.Queries
}

func NewAssignmentService(repo *repository.Queries) domain.AssignmentService {
	return &assignmentService{repo: repo}
}

func (s *assignmentService) CreateAssignment(ctx context.Context, req domain.CreateAssignmentRequest) (*domain.AssignmentResponse, error) {
	var menteeID pgtype.UUID
	var assignedBy pgtype.UUID

	if err := menteeID.Scan(req.MenteeID); err != nil {
		return nil, errors.New("invalid mentee id")
	}
	if err := assignedBy.Scan(req.AssignedBy); err != nil {
		return nil, errors.New("invalid assigner id")
	}

	startDateT, err := time.Parse(time.RFC3339, req.StartDate)
	if err != nil {
		return nil, errors.New("invalid start date format")
	}
	deadlineT, err := time.Parse(time.RFC3339, req.Deadline)
	if err != nil {
		return nil, errors.New("invalid deadline date format")
	}

	startDate := pgtype.Timestamptz{Time: startDateT, Valid: true}
	deadline := pgtype.Timestamptz{Time: deadlineT, Valid: true}

	// Default status
	status := repository.NullAssignmentStatus{
		AssignmentStatus: repository.AssignmentStatusActive,
		Valid:            true,
	}

	assignParams := repository.CreateAssignmentParams{
		MenteeID:  menteeID,
		Title:     req.Title,
		StartDate: startDate,
		Deadline:  deadline,
		Status:    status,
	}

	assignment, err := s.repo.CreateAssignment(ctx, assignParams)
	if err != nil {
		return nil, err
	}

	// Assign Questions as Tasks sequentially
	for _, qIDStr := range req.QuestionIDs {
		var qID pgtype.UUID
		if err := qID.Scan(qIDStr); err == nil {
			s.repo.CreateAssignmentTask(ctx, repository.CreateAssignmentTaskParams{
				AssignmentID: assignment.ID,
				QuestionID:   qID,
				Status: repository.NullTaskStatus{
					TaskStatus: repository.TaskStatusPending,
					Valid:      true,
				},
				AssignedBy: assignedBy,
			})
		}
	}

	return &domain.AssignmentResponse{
		ID:        assignment.ID,
		MenteeID:  assignment.MenteeID,
		Title:     assignment.Title,
		Status:    string(assignment.Status.AssignmentStatus),
		StartDate: assignment.StartDate.Time.Format(time.RFC3339),
		Deadline:  assignment.Deadline.Time.Format(time.RFC3339),
	}, nil
}

func (s *assignmentService) GetAssignmentWithTasks(ctx context.Context, id string) (*domain.AssignmentDetailResponse, error) {
	var assignID pgtype.UUID
	if err := assignID.Scan(id); err != nil {
		return nil, errors.New("invalid assignment id")
	}

	assignment, err := s.repo.GetAssignmentByID(ctx, assignID)
	if err != nil {
		return nil, errors.New("assignment not found")
	}

	tasks, err := s.repo.GetTasksForAssignment(ctx, assignID)
	if err != nil {
		tasks = []repository.GetTasksForAssignmentRow{}
	}

	taskResponses := make([]domain.TaskResponse, 0, len(tasks))
	for _, t := range tasks {
		taskResponses = append(taskResponses, domain.TaskResponse{
			TaskID:             t.TaskID,
			AssignmentID:       t.AssignmentID,
			TaskStatus:         string(t.TaskStatus.TaskStatus),
			QuestionID:         t.QuestionID,
			QuestionTitle:      t.QuestionTitle,
			QuestionDifficulty: string(t.QuestionDifficulty),
		})
	}

	return &domain.AssignmentDetailResponse{
		Assignment: domain.AssignmentResponse{
			ID:        assignment.ID,
			MenteeID:  assignment.MenteeID,
			Title:     assignment.Title,
			Status:    string(assignment.Status.AssignmentStatus),
			StartDate: assignment.StartDate.Time.Format(time.RFC3339),
			Deadline:  assignment.Deadline.Time.Format(time.RFC3339),
		},
		Tasks: taskResponses,
	}, nil
}

func (s *assignmentService) ListMenteeAssignments(ctx context.Context, menteeID string, limit, offset int32) ([]domain.AssignmentResponse, error) {
	var mID pgtype.UUID
	if err := mID.Scan(menteeID); err != nil {
		return nil, errors.New("invalid mentee id")
	}

	params := repository.ListAssignmentsByMenteeParams{
		MenteeID: mID,
		Limit:    limit,
		Offset:   offset,
	}

	assignments, err := s.repo.ListAssignmentsByMentee(ctx, params)
	if err != nil {
		return nil, err
	}

	res := make([]domain.AssignmentResponse, 0, len(assignments))
	for _, a := range assignments {
		res = append(res, domain.AssignmentResponse{
			ID:        a.ID,
			MenteeID:  a.MenteeID,
			Title:     a.Title,
			Status:    string(a.Status.AssignmentStatus),
			StartDate: a.StartDate.Time.Format(time.RFC3339),
			Deadline:  a.Deadline.Time.Format(time.RFC3339),
		})
	}

	return res, nil
}
