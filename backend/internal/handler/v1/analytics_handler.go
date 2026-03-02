package v1

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/username/monkeylms/internal/domain"
	appMiddleware "github.com/username/monkeylms/internal/middleware"
	"github.com/username/monkeylms/internal/pkg/response"
)

type AnalyticsHandler struct {
	analyticsService domain.AnalyticsService
	jwtSecret        string
}

func NewAnalyticsHandler(analyticsService domain.AnalyticsService, jwtSecret string) *AnalyticsHandler {
	return &AnalyticsHandler{
		analyticsService: analyticsService,
		jwtSecret:        jwtSecret,
	}
}

func (h *AnalyticsHandler) RegisterRoutes(router chi.Router) {
	router.Route("/analytics", func(r chi.Router) {
		r.Use(appMiddleware.RequireAuth(h.jwtSecret))

		r.Get("/leaderboard/global", h.GetGlobalLeaderboard)
		r.Get("/mentee/{menteeID}", h.GetMenteeAnalytics)
		r.Get("/leaderboard/{batchID}", h.GetLeaderboard)

		// Mentor only operations
		r.With(appMiddleware.RequireRole("mentor")).Post("/leaderboard", h.CreateLeaderboard)
		r.With(appMiddleware.RequireRole("mentor")).Post("/leaderboard/entry", h.UpsertLeaderboardEntry)
	})
}

func (h *AnalyticsHandler) GetMenteeAnalytics(w http.ResponseWriter, r *http.Request) {
	menteeID := chi.URLParam(r, "menteeID")
	if menteeID == "" {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Mentee ID is required")
		return
	}

	res, err := h.analyticsService.GetMenteeAnalytics(r.Context(), menteeID)
	if err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get analytics")
		return
	}

	response.JSONResponse(w, http.StatusOK, res, nil)
}

func (h *AnalyticsHandler) GetGlobalLeaderboard(w http.ResponseWriter, r *http.Request) {
	res, err := h.analyticsService.GetGlobalLeaderboard(r.Context())
	if err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get global leaderboard")
		return
	}

	response.JSONResponse(w, http.StatusOK, res, nil)
}

func (h *AnalyticsHandler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	batchID := chi.URLParam(r, "batchID")
	weekStartStr := r.URL.Query().Get("week_start")
	weekEndStr := r.URL.Query().Get("week_end")

	if batchID == "" || weekStartStr == "" || weekEndStr == "" {
		response.JSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "batchID, week_start, week_end are required")
		return
	}

	weekStart, err1 := time.Parse(time.RFC3339, weekStartStr)
	weekEnd, err2 := time.Parse(time.RFC3339, weekEndStr)

	if err1 != nil || err2 != nil {
		response.JSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid dates (use RFC3339)")
		return
	}

	res, err := h.analyticsService.GetLeaderboard(r.Context(), batchID, weekStart, weekEnd)
	if err != nil {
		response.JSONError(w, http.StatusNotFound, "NOT_FOUND", "Leaderboard not found")
		return
	}

	response.JSONResponse(w, http.StatusOK, res, nil)
}

func (h *AnalyticsHandler) CreateLeaderboard(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateLeaderboardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	res, err := h.analyticsService.CreateLeaderboard(r.Context(), req)
	if err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create leaderboard")
		return
	}

	response.JSONResponse(w, http.StatusCreated, res, nil)
}

func (h *AnalyticsHandler) UpsertLeaderboardEntry(w http.ResponseWriter, r *http.Request) {
	var req domain.UpsertEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if err := h.analyticsService.UpsertLeaderboardEntry(r.Context(), req); err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to upsert entry")
		return
	}

	response.JSONResponse(w, http.StatusOK, map[string]string{"message": "success"}, nil)
}
