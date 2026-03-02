package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/username/monkeylms/internal/config"
	v1 "github.com/username/monkeylms/internal/handler/v1"
	"github.com/username/monkeylms/internal/pkg/db"
	"github.com/username/monkeylms/internal/repository"
	"github.com/username/monkeylms/internal/service"
)

func main() {
	cfg := config.LoadConfig()

	// Connect Database
	dbPool := db.ConnectDB(cfg.DatabaseURL)
	defer dbPool.Close()

	// Initialize SQLC Repository
	queries := repository.New(dbPool)

	// Initialize Services
	authService := service.NewUserService(queries, cfg.JWTSecret)
	questionService := service.NewQuestionService(queries)
	assignmentService := service.NewAssignmentService(queries)
	submissionService := service.NewSubmissionService(queries)
	analyticsService := service.NewAnalyticsService(queries)

	// Initialize Handlers
	authHandler := v1.NewAuthHandler(authService, cfg.JWTSecret)
	questionHandler := v1.NewQuestionHandler(questionService, cfg.JWTSecret)
	assignmentHandler := v1.NewAssignmentHandler(assignmentService, cfg.JWTSecret)
	submissionHandler := v1.NewSubmissionHandler(submissionService, cfg.JWTSecret)
	analyticsHandler := v1.NewAnalyticsHandler(analyticsService, cfg.JWTSecret)

	// Setup Router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:3001"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// API Routes
	r.Route("/api/v1", func(api chi.Router) {
		api.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("MentorFlow API is running"))
		})

		// Auth module
		authHandler.RegisterRoutes(api)

		// Question bank module
		questionHandler.RegisterRoutes(api)

		// Assignment module
		assignmentHandler.RegisterRoutes(api)

		// Submission module
		submissionHandler.RegisterRoutes(api)

		// Analytics module
		analyticsHandler.RegisterRoutes(api)
	})

	log.Printf("Starting backend server on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
