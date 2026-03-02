package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/username/monkeylms/internal/domain"
	"github.com/username/monkeylms/internal/repository"
)

type submissionService struct {
	repo *repository.Queries
}

func NewSubmissionService(repo *repository.Queries) domain.SubmissionService {
	return &submissionService{repo: repo}
}

func (s *submissionService) CreateSubmission(ctx context.Context, req domain.CreateSubmissionRequest) (*domain.SubmissionResponse, error) {
	var taskID pgtype.UUID
	var menteeID pgtype.UUID

	if err := taskID.Scan(req.AssignmentTaskID); err != nil {
		return nil, errors.New("invalid task id")
	}
	if err := menteeID.Scan(req.MenteeID); err != nil {
		return nil, errors.New("invalid mentee id")
	}

	params := repository.CreateSubmissionParams{
		AssignmentTaskID: taskID,
		MenteeID:         menteeID,
		SolutionUrl:      req.SolutionURL,
		Status: repository.NullSubmissionStatus{
			SubmissionStatus: repository.SubmissionStatusSubmitted,
			Valid:            true,
		},
	}

	submission, err := s.repo.CreateSubmission(ctx, params)
	if err != nil {
		return nil, err
	}

	// Also update the task status to completed
	s.repo.UpdateTaskStatus(ctx, repository.UpdateTaskStatusParams{
		ID: taskID,
		Status: repository.NullTaskStatus{
			TaskStatus: repository.TaskStatusCompleted,
			Valid:      true,
		},
	})

	return &domain.SubmissionResponse{
		ID:               submission.ID,
		AssignmentTaskID: submission.AssignmentTaskID,
		MenteeID:         submission.MenteeID,
		SolutionURL:      submission.SolutionUrl,
		Status:           string(submission.Status.SubmissionStatus),
		SubmittedAt:      submission.SubmittedAt.Time,
	}, nil
}

func (s *submissionService) GetSubmissionsForTask(ctx context.Context, taskID string) ([]domain.SubmissionResponse, error) {
	var tID pgtype.UUID
	if err := tID.Scan(taskID); err != nil {
		return nil, errors.New("invalid task id")
	}

	submissions, err := s.repo.GetSubmissionsForTask(ctx, tID)
	if err != nil {
		return nil, err
	}

	res := make([]domain.SubmissionResponse, 0, len(submissions))
	for _, sub := range submissions {
		res = append(res, domain.SubmissionResponse{
			ID:               sub.ID,
			AssignmentTaskID: sub.AssignmentTaskID,
			MenteeID:         sub.MenteeID,
			SolutionURL:      sub.SolutionUrl,
			Status:           string(sub.Status.SubmissionStatus),
			SubmittedAt:      sub.SubmittedAt.Time,
		})
	}

	return res, nil
}

func (s *submissionService) CreateFeedback(ctx context.Context, req domain.CreateFeedbackRequest) (*domain.FeedbackResponse, error) {
	var subID pgtype.UUID
	var mentorID pgtype.UUID

	if err := subID.Scan(req.SubmissionID); err != nil {
		return nil, errors.New("invalid submission id")
	}
	if err := mentorID.Scan(req.MentorID); err != nil {
		return nil, errors.New("invalid mentor id")
	}

	revReq := &req.RevisionRequired

	params := repository.CreateFeedbackParams{
		SubmissionID:     subID,
		MentorID:         mentorID,
		Comment:          req.Comment,
		RevisionRequired: revReq,
	}

	feedback, err := s.repo.CreateFeedback(ctx, params)
	if err != nil {
		return nil, err
	}

	// Update Submission status based on revision request
	newStatus := repository.SubmissionStatusReviewed
	if req.RevisionRequired {
		newStatus = repository.SubmissionStatusRevisionNeeded
	}

	s.repo.UpdateSubmissionStatus(ctx, repository.UpdateSubmissionStatusParams{
		ID: subID,
		Status: repository.NullSubmissionStatus{
			SubmissionStatus: newStatus,
			Valid:            true,
		},
	})

	return &domain.FeedbackResponse{
		ID:               feedback.ID,
		SubmissionID:     feedback.SubmissionID,
		MentorID:         feedback.MentorID,
		Comment:          feedback.Comment,
		RevisionRequired: *feedback.RevisionRequired,
		CreatedAt:        feedback.CreatedAt.Time,
	}, nil
}

func (s *submissionService) GetFeedbackForSubmission(ctx context.Context, submissionID string) (*domain.FeedbackResponse, error) {
	var subID pgtype.UUID
	if err := subID.Scan(submissionID); err != nil {
		return nil, errors.New("invalid submission id")
	}

	feedback, err := s.repo.GetFeedbackBySubmission(ctx, subID)
	if err != nil {
		return nil, err
	}

	return &domain.FeedbackResponse{
		ID:               feedback.ID,
		SubmissionID:     feedback.SubmissionID,
		MentorID:         feedback.MentorID,
		Comment:          feedback.Comment,
		RevisionRequired: *feedback.RevisionRequired,
		CreatedAt:        feedback.CreatedAt.Time,
	}, nil
}

func (s *submissionService) GetSubmissionsByAssignment(ctx context.Context, assignmentID string) ([]domain.SubmissionDetailResponse, error) {
	var aID pgtype.UUID
	if err := aID.Scan(assignmentID); err != nil {
		return nil, errors.New("invalid assignment id")
	}

	rows, err := s.repo.ListSubmissionsWithDetailsByAssignment(ctx, aID)
	if err != nil {
		return nil, err
	}

	uuidStr := func(u pgtype.UUID) string {
		b := u.Bytes
		if !u.Valid {
			return ""
		}
		return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
	}

	res := make([]domain.SubmissionDetailResponse, 0, len(rows))
	for _, r := range rows {
		res = append(res, domain.SubmissionDetailResponse{
			SubmissionID:     uuidStr(r.SubmissionID),
			SolutionURL:      r.SolutionURL,
			Status:           string(r.SubmissionStatus.SubmissionStatus),
			SubmittedAt:      r.SubmittedAt.Time.Format(time.RFC3339),
			TaskID:           uuidStr(r.TaskID),
			QuestionTitle:    r.QuestionTitle,
			QuestionDiff:     r.QuestionDiff,
			MenteeName:       r.MenteeName,
			FeedbackID:       uuidStr(r.FeedbackID),
			FeedbackComment:  r.FeedbackComment,
			RevisionRequired: r.RevisionRequired,
		})
	}
	return res, nil
}

func (s *submissionService) GetRecentActivity(ctx context.Context, limit int32) ([]domain.RecentActivityItem, error) {
	activities, err := s.repo.GetRecentActivity(ctx, limit)
	if err != nil {
		return nil, err
	}

	res := make([]domain.RecentActivityItem, 0, len(activities))
	for _, a := range activities {
		menteeBytes := a.MenteeID.Bytes
		menteeStr := fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", menteeBytes[0:4], menteeBytes[4:6], menteeBytes[6:8], menteeBytes[8:10], menteeBytes[10:16])

		taskBytes := a.TaskID.Bytes
		taskStr := fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", taskBytes[0:4], taskBytes[4:6], taskBytes[6:8], taskBytes[8:10], taskBytes[10:16])

		submissionBytes := a.SubmissionID.Bytes
		submissionStr := fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", submissionBytes[0:4], submissionBytes[4:6], submissionBytes[6:8], submissionBytes[8:10], submissionBytes[10:16])

		url := ""
		if a.SolutionUrl != "" {
			url = a.SolutionUrl
		}

		res = append(res, domain.RecentActivityItem{
			SubmissionID:     submissionStr,
			MenteeID:         menteeStr,
			MenteeName:       a.MenteeName,
			TaskID:           taskStr,
			QuestionTitle:    a.QuestionTitle,
			SolutionURL:      url,
			SubmissionStatus: string(a.SubmissionStatus.SubmissionStatus),
			SubmittedAt:      a.SubmittedAt.Time.Format(time.RFC3339),
		})
	}
	return res, nil
}
