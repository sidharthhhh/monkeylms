package domain

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/username/monkeylms/internal/repository"
)

type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type SignupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type UserResponse struct {
	ID    pgtype.UUID `json:"id"`
	Email string      `json:"email"`
	Role  string      `json:"role"`
}

type MenteeListItem struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type UserService interface {
	Signup(ctx context.Context, req SignupRequest) (*AuthResponse, error)
	Login(ctx context.Context, req AuthRequest) (*AuthResponse, error)
	GetUserByID(ctx context.Context, id pgtype.UUID) (*repository.User, error)
	ListMentees(ctx context.Context) ([]MenteeListItem, error)
}
