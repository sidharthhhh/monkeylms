-- name: CreateAssignment :one
INSERT INTO assignments (
  mentee_id, title, start_date, deadline, status
) VALUES (
  $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetAssignmentByID :one
SELECT * FROM assignments
WHERE id = $1 LIMIT 1;

-- name: ListAssignmentsByMentee :many
SELECT * FROM assignments
WHERE mentee_id = $1
ORDER BY start_date DESC
LIMIT $2 OFFSET $3;

-- name: UpdateAssignmentStatus :exec
UPDATE assignments
SET status = $2
WHERE id = $1;

-- name: CreateAssignmentTask :one
INSERT INTO assignment_tasks (
  assignment_id, question_id, status, assigned_by
) VALUES (
  $1, $2, $3, $4
)
RETURNING *;

-- name: GetTasksForAssignment :many
SELECT 
  t.id as task_id,
  t.assignment_id,
  t.status as task_status,
  q.id as question_id,
  q.title as question_title,
  q.difficulty as question_difficulty
FROM assignment_tasks t
JOIN questions q ON t.question_id = q.id
WHERE t.assignment_id = $1
ORDER BY t.created_at ASC;

-- name: UpdateTaskStatus :exec
UPDATE assignment_tasks
SET status = $2
WHERE id = $1;
