-- name: CreateLeaderboard :one
INSERT INTO leaderboards (
  batch_id, week_start, week_end
) VALUES (
  $1, $2, $3
)
RETURNING *;

-- name: GetLeaderboard :one
SELECT * FROM leaderboards
WHERE batch_id = $1 AND week_start = $2 AND week_end = $3 LIMIT 1;

-- name: UpsertLeaderboardEntry :exec
INSERT INTO leaderboard_entries (
  leaderboard_id, mentee_id, score, rank
) VALUES (
  $1, $2, $3, $4
) ON CONFLICT (leaderboard_id, mentee_id) DO UPDATE
SET score = EXCLUDED.score,
    rank = EXCLUDED.rank;

-- name: GetLeaderboardEntries :many
SELECT 
  e.id, e.leaderboard_id, e.mentee_id, e.score, e.rank,
  u.name as mentee_name,
  u.avatar_url as mentee_avatar
FROM leaderboard_entries e
JOIN user_profiles u ON e.mentee_id = u.user_id
WHERE e.leaderboard_id = $1
ORDER BY e.score DESC, e.rank ASC;

-- name: GetMenteeAnalytics :one
SELECT 
  COUNT(t.id) as total_tasks,
  SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
  SUM(CASE WHEN t.status = 'doubt' THEN 1 ELSE 0 END) as doubt_tasks
FROM assignment_tasks t
JOIN assignments a ON t.assignment_id = a.id
WHERE a.mentee_id = $1;
