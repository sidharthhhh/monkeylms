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

type QuestionHandler struct {
	questionService domain.QuestionService
	jwtSecret       string
}

func NewQuestionHandler(questionService domain.QuestionService, jwtSecret string) *QuestionHandler {
	return &QuestionHandler{
		questionService: questionService,
		jwtSecret:       jwtSecret,
	}
}

func (h *QuestionHandler) RegisterRoutes(router chi.Router) {
	router.Route("/questions", func(r chi.Router) {
		r.Use(appMiddleware.RequireAuth(h.jwtSecret))

		r.Get("/", h.ListQuestions)
		r.Get("/{id}", h.GetQuestionByID)

		// Mentor only
		r.With(appMiddleware.RequireRole("mentor")).Post("/", h.CreateQuestion)
	})
}

func (h *QuestionHandler) CreateQuestion(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(appMiddleware.UserClaimsKey).(*auth.Claims)
	if !ok {
		response.JSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing user claims")
		return
	}

	var req domain.CreateQuestionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}
	req.CreatedBy = claims.UserID

	if req.Title == "" {
		response.JSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	if req.Topic == "" {
		req.Topic = "General"
	}
	if req.Difficulty == "" {
		req.Difficulty = "medium"
	}

	res, err := h.questionService.CreateQuestion(r.Context(), req)
	if err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create question: "+err.Error())
		return
	}

	response.JSONResponse(w, http.StatusCreated, res, nil)
}

func (h *QuestionHandler) GetQuestionByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Question ID is required")
		return
	}

	res, err := h.questionService.GetQuestionByID(r.Context(), id)
	if err != nil {
		response.JSONError(w, http.StatusNotFound, "NOT_FOUND", "Question not found")
		return
	}

	response.JSONResponse(w, http.StatusOK, res, nil)
}

func (h *QuestionHandler) ListQuestions(w http.ResponseWriter, r *http.Request) {
	// Parse pagination
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit, err := strconv.ParseInt(limitStr, 10, 32)
	if err != nil || limit <= 0 {
		limit = 20 // Default limit
	}

	offset, err := strconv.ParseInt(offsetStr, 10, 32)
	if err != nil || offset < 0 {
		offset = 0 // Default offset
	}

	res, err := h.questionService.ListQuestions(r.Context(), int32(limit), int32(offset))
	if err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list questions")
		return
	}

	response.JSONResponse(w, http.StatusOK, res, map[string]interface{}{
		"limit":  limit,
		"offset": offset,
		"count":  len(res),
	})
}
