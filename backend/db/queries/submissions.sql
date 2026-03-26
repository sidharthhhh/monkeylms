-- name: CreateSubmission :one
INSERT INTO submissions (
  assignment_task_id, mentee_id, solution_url, status
) VALUES (
  $1, $2, $3, $4
)
RETURNING *;

-- name: GetSubmissionByID :one
SELECT * FROM submissions
WHERE id = $1 LIMIT 1;

-- name: GetSubmissionsForTask :many
SELECT * FROM submissions
WHERE assignment_task_id = $1
ORDER BY submitted_at DESC;

-- name: UpdateSubmissionStatus :exec
UPDATE submissions
SET status = $2
WHERE id = $1;

-- name: CreateFeedback :one
INSERT INTO mentor_feedbacks (
  submission_id, mentor_id, comment, revision_required
) VALUES (
  $1, $2, $3, $4
)
RETURNING *;

-- name: GetFeedbackBySubmission :one
SELECT * FROM mentor_feedbacks
WHERE submission_id = $1 LIMIT 1;

-- name: GetRecentActivity :many
SELECT 
  s.id as submission_id,
  s.mentee_id,
  COALESCE(u.name, users.email) as mentee_name,
  s.solution_url,
  s.status as submission_status,
  s.submitted_at,
  q.title as question_title,
  t.id as task_id
FROM submissions s
JOIN users ON s.mentee_id = users.id
LEFT JOIN user_profiles u ON s.mentee_id = u.user_id
JOIN assignment_tasks t ON s.assignment_task_id = t.id
JOIN questions q ON t.question_id = q.id
ORDER BY s.submitted_at DESC
LIMIT $1;
