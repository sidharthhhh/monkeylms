package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/username/monkeylms/internal/pkg/auth"
	"github.com/username/monkeylms/internal/pkg/response"
)

type contextKey string

const UserClaimsKey = contextKey("userClaims")

func RequireAuth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				response.JSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing Authorization header")
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				response.JSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid Authorization format")
				return
			}

			tokenString := parts[1]
			claims, err := auth.ValidateToken(tokenString, secret)
			if err != nil {
				response.JSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", err.Error())
				return
			}

			ctx := context.WithValue(r.Context(), UserClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(UserClaimsKey).(*auth.Claims)
			if !ok {
				response.JSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User claims not found")
				return
			}

			if claims.Role != role {
				response.JSONError(w, http.StatusForbidden, "FORBIDDEN", "You do not have permission to perform this action")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
