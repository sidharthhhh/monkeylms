-- name: CreateQuestion :one
INSERT INTO questions (
  title, content_markdown, difficulty, topic, external_link, created_by
) VALUES (
  $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetQuestionByID :one
SELECT * FROM questions
WHERE id = $1 AND deleted_at IS NULL LIMIT 1;

-- name: ListQuestions :many
SELECT * FROM questions
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: AddHint :one
INSERT INTO hints (
  question_id, content, display_order
) VALUES (
  $1, $2, $3
)
RETURNING *;

-- name: GetHintsForQuestion :many
SELECT * FROM hints
WHERE question_id = $1
ORDER BY display_order ASC;
