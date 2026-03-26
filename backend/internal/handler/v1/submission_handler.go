package v1

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/username/monkeylms/internal/domain"
	appMiddleware "github.com/username/monkeylms/internal/middleware"
	"github.com/username/monkeylms/internal/pkg/auth"
	"github.com/username/monkeylms/internal/pkg/response"
)

type SubmissionHandler struct {
	submissionService domain.SubmissionService
	jwtSecret         string
}

func NewSubmissionHandler(submissionService domain.SubmissionService, jwtSecret string) *SubmissionHandler {
	return &SubmissionHandler{
		submissionService: submissionService,
		jwtSecret:         jwtSecret,
	}
}

func (h *SubmissionHandler) RegisterRoutes(router chi.Router) {
	router.Route("/submissions", func(r chi.Router) {
		r.Use(appMiddleware.RequireAuth(h.jwtSecret))

		r.Get("/task/{taskID}", h.GetSubmissionsForTask)
		r.Get("/assignment/{assignmentID}", h.GetSubmissionsForAssignment)
		r.Get("/feedback/{submissionID}", h.GetFeedback)

		// Mentor only
		r.With(appMiddleware.RequireRole("mentor")).Get("/activity/recent", h.GetRecentActivity)

		// Mentee submits solution
		r.With(appMiddleware.RequireRole("mentee")).Post("/", h.CreateSubmission)

		// Mentor provides feedback
		r.With(appMiddleware.RequireRole("mentor")).Post("/feedback", h.CreateFeedback)
	})
}

func (h *SubmissionHandler) CreateSubmission(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(appMiddleware.UserClaimsKey).(*auth.Claims)
	if !ok {
		response.JSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing user claims")
		return
	}

	var req domain.CreateSubmissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}
	req.MenteeID = claims.UserID

	if req.AssignmentTaskID == "" {
		response.JSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Task ID is required")
		return
	}

	res, err := h.submissionService.CreateSubmission(r.Context(), req)
	if err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create submission: "+err.Error())
		return
	}

	response.JSONResponse(w, http.StatusCreated, res, nil)
}

func (h *SubmissionHandler) GetSubmissionsForTask(w http.ResponseWriter, r *http.Request) {
	taskID := chi.URLParam(r, "taskID")
	if taskID == "" {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Task ID is required")
		return
	}

	res, err := h.submissionService.GetSubmissionsForTask(r.Context(), taskID)
	if err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get submissions")
		return
	}

	response.JSONResponse(w, http.StatusOK, res, nil)
}

func (h *SubmissionHandler) GetSubmissionsForAssignment(w http.ResponseWriter, r *http.Request) {
	assignmentID := chi.URLParam(r, "assignmentID")
	if assignmentID == "" {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Assignment ID is required")
		return
	}

	res, err := h.submissionService.GetSubmissionsByAssignment(r.Context(), assignmentID)
	if err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get submissions")
		return
	}

	response.JSONResponse(w, http.StatusOK, res, nil)
}

func (h *SubmissionHandler) CreateFeedback(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(appMiddleware.UserClaimsKey).(*auth.Claims)
	if !ok {
		response.JSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing user claims")
		return
	}

	var req domain.CreateFeedbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}
	req.MentorID = claims.UserID

	if req.SubmissionID == "" || req.Comment == "" {
		response.JSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Submission ID and Comment are required")
		return
	}

	res, err := h.submissionService.CreateFeedback(r.Context(), req)
	if err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create feedback: "+err.Error())
		return
	}

	response.JSONResponse(w, http.StatusCreated, res, nil)
}

func (h *SubmissionHandler) GetFeedback(w http.ResponseWriter, r *http.Request) {
	submissionID := chi.URLParam(r, "submissionID")
	if submissionID == "" {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Submission ID is required")
		return
	}

	res, err := h.submissionService.GetFeedbackForSubmission(r.Context(), submissionID)
	if err != nil {
		response.JSONError(w, http.StatusNotFound, "NOT_FOUND", "Feedback not found")
		return
	}

	response.JSONResponse(w, http.StatusOK, res, nil)
}

func (h *SubmissionHandler) GetRecentActivity(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit, err := strconv.ParseInt(limitStr, 10, 32)
	if err != nil || limit <= 0 {
		limit = 20
	}

	res, err := h.submissionService.GetRecentActivity(r.Context(), int32(limit))
	if err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch recent activity")
		return
	}

	response.JSONResponse(w, http.StatusOK, res, nil)
}
