-- name: CreateUser :one
INSERT INTO users (
  email, password_hash, role
) VALUES (
  $1, $2, $3
)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 AND deleted_at IS NULL LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 AND deleted_at IS NULL LIMIT 1;

-- name: CreateUserProfile :one
INSERT INTO user_profiles (
  user_id, name, avatar_url, bio
) VALUES (
  $1, $2, $3, $4
)
RETURNING *;

-- name: GetUserProfile :one
SELECT * FROM user_profiles
WHERE user_id = $1 LIMIT 1;

-- name: CreateBatch :one
INSERT INTO batches (
  name, mentor_id
) VALUES (
  $1, $2
)
RETURNING *;

-- name: AddMenteeToBatch :exec
INSERT INTO batch_mentees (
  batch_id, mentee_id
) VALUES (
  $1, $2
);
