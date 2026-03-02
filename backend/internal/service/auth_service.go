package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/username/monkeylms/internal/domain"
	"github.com/username/monkeylms/internal/pkg/auth"
	"github.com/username/monkeylms/internal/repository"
)

type userService struct {
	repo   *repository.Queries
	secret string
}

func NewUserService(repo *repository.Queries, secret string) domain.UserService {
	return &userService{
		repo:   repo,
		secret: secret,
	}
}

func (s *userService) Signup(ctx context.Context, req domain.SignupRequest) (*domain.AuthResponse, error) {
	// Check if user exists
	_, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err == nil {
		return nil, errors.New("user already exists")
	}

	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	// Create User
	userParams := repository.CreateUserParams{
		Email:        req.Email,
		PasswordHash: hashedPassword,
		Role:         repository.UserRole(req.Role),
	}

	user, err := s.repo.CreateUser(ctx, userParams)
	if err != nil {
		return nil, err
	}

	// Create Profile
	profileParams := repository.CreateUserProfileParams{
		UserID: user.ID,
		Name:   req.Name,
	}
	_, err = s.repo.CreateUserProfile(ctx, profileParams)
	if err != nil {
		return nil, err
	}

	// Generate JWT — format UUID as proper RFC-4122 hyphenated string
	b := user.ID.Bytes
	userIDStr := fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
	token, err := auth.GenerateToken(userIDStr, string(user.Role), s.secret)
	if err != nil {
		return nil, err
	}

	return &domain.AuthResponse{
		Token: token,
		User: domain.UserResponse{
			ID:    user.ID,
			Email: user.Email,
			Role:  string(user.Role),
		},
	}, nil
}

func (s *userService) Login(ctx context.Context, req domain.AuthRequest) (*domain.AuthResponse, error) {
	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if !auth.CheckPasswordHash(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid email or password")
	}

	b := user.ID.Bytes
	userIDStr := fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
	token, err := auth.GenerateToken(userIDStr, string(user.Role), s.secret)
	if err != nil {
		return nil, err
	}

	return &domain.AuthResponse{
		Token: token,
		User: domain.UserResponse{
			ID:    user.ID,
			Email: user.Email,
			Role:  string(user.Role),
		},
	}, nil
}

func (s *userService) GetUserByID(ctx context.Context, id pgtype.UUID) (*repository.User, error) {
	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *userService) ListMentees(ctx context.Context) ([]domain.MenteeListItem, error) {
	users, err := s.repo.ListUsersByRole(ctx, repository.UserRoleMentee)
	if err != nil {
		return nil, err
	}
	items := make([]domain.MenteeListItem, 0, len(users))
	for _, u := range users {
		b := u.ID.Bytes
		idStr := fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
			b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
		items = append(items, domain.MenteeListItem{
			ID:    idStr,
			Name:  u.Name,
			Email: u.Email,
		})
	}
	return items, nil
}
