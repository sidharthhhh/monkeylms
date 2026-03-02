package v1

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/username/monkeylms/internal/domain"
	appMiddleware "github.com/username/monkeylms/internal/middleware"
	"github.com/username/monkeylms/internal/pkg/response"
)

type AuthHandler struct {
	authService domain.UserService
	jwtSecret   string
}

func NewAuthHandler(authService domain.UserService, jwtSecret string) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		jwtSecret:   jwtSecret,
	}
}

func (h *AuthHandler) RegisterRoutes(router chi.Router) {
	router.Post("/auth/signup", h.Signup)
	router.Post("/auth/login", h.Login)

	// Protected routes
	router.With(appMiddleware.RequireAuth(h.jwtSecret)).
		With(appMiddleware.RequireRole("mentor")).
		Get("/users/mentees", h.ListMentees)
}

func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req domain.SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" || req.Role == "" {
		response.JSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "All fields are required")
		return
	}

	res, err := h.authService.Signup(r.Context(), req)
	if err != nil {
		response.JSONError(w, http.StatusConflict, "USER_EXISTS", err.Error())
		return
	}

	response.JSONResponse(w, http.StatusCreated, res, nil)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		response.JSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Email and password are required")
		return
	}

	res, err := h.authService.Login(r.Context(), req)
	if err != nil {
		response.JSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", err.Error())
		return
	}

	response.JSONResponse(w, http.StatusOK, res, nil)
}

func (h *AuthHandler) ListMentees(w http.ResponseWriter, r *http.Request) {
	mentees, err := h.authService.ListMentees(r.Context())
	if err != nil {
		response.JSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list mentees")
		return
	}
	response.JSONResponse(w, http.StatusOK, mentees, nil)
}
