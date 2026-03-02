package v1

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/username/monkeylms/internal/domain"
	appMiddleware "github.com/username/monkeylms/internal/middleware"
	"github.com/username/monkeylms/internal/pkg/auth"
	"github.com/username/monkeylms/internal/pkg/response"
)

type AssignmentHandler struct {
	assignmentService domain.AssignmentService
	jwtSecret         string
}

func NewAssignmentHandler(assignmentService domain.AssignmentService, jwtSecret string) *AssignmentHandler {
	return &AssignmentHandler{
		assignmentService: assignmentService,
		jwtSecret:         jwtSecret,
	}
}

func (h *AssignmentHandler) RegisterRoutes(router chi.Router) {
	router.Route("/assignments", func(r chi.Router) {
		r.Use(appMiddleware.RequireAuth(h.jwtSecret))

		r.Get("/{id}", h.GetAssignment)
		r.Get("/mentee/{menteeID}", h.ListMenteeAssignments)

		// Mentor only
		r.With(appMiddleware.RequireRole("mentor")).Post("/", h.CreateAssignment)
	})
}

func (h *AssignmentHandler) CreateAssignment(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(appMiddleware.UserClaimsKey).(*auth.Claims)
	if !ok {
		response.JSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing user claims")
		return
	}

	var req domain.CreateAssignmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}
	req.AssignedBy = claims.UserID

	if req.MenteeID == "" || req.Title == "" || req.StartDate == "" || req.Deadline == "" {
		response.JSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "MenteeID, Title, StartDate, and Deadline are required")
		return
	}

	res, err := h.assignmentService.CreateAssignment(r.Context(), req)
	if err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create assignment: "+err.Error())
		return
	}

	response.JSONResponse(w, http.StatusCreated, res, nil)
}

func (h *AssignmentHandler) GetAssignment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Assignment ID is required")
		return
	}

	res, err := h.assignmentService.GetAssignmentWithTasks(r.Context(), id)
	if err != nil {
		response.JSONError(w, http.StatusNotFound, "NOT_FOUND", "Assignment not found")
		return
	}

	// Data Isolation Check: If user is a mentee, they can only view their own assignments
	claims, ok := r.Context().Value(appMiddleware.UserClaimsKey).(*auth.Claims)
	if ok && claims.Role == "mentee" {
		b := res.Assignment.MenteeID.Bytes
		menteeStr := fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
		if menteeStr != claims.UserID {
			response.JSONError(w, http.StatusForbidden, "FORBIDDEN", "You are not authorized to view this assignment")
			return
		}
	}

	response.JSONResponse(w, http.StatusOK, res, nil)
}

func (h *AssignmentHandler) ListMenteeAssignments(w http.ResponseWriter, r *http.Request) {
	menteeID := chi.URLParam(r, "menteeID")

	// Data Isolation Check: Mentees can only list their own assignments
	claims, ok := r.Context().Value(appMiddleware.UserClaimsKey).(*auth.Claims)
	if ok && claims.Role == "mentee" {
		if menteeID != claims.UserID {
			response.JSONError(w, http.StatusForbidden, "FORBIDDEN", "You are not authorized to list assignments for another user")
			return
		}
	}

	// Parse pagination
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit, err := strconv.ParseInt(limitStr, 10, 32)
	if err != nil || limit <= 0 {
		limit = 20
	}

	offset, err := strconv.ParseInt(offsetStr, 10, 32)
	if err != nil || offset < 0 {
		offset = 0
	}

	res, err := h.assignmentService.ListMenteeAssignments(r.Context(), menteeID, int32(limit), int32(offset))
	if err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list assignments")
		return
	}

	response.JSONResponse(w, http.StatusOK, res, map[string]interface{}{
		"limit":  limit,
		"offset": offset,
		"count":  len(res),
	})
}
