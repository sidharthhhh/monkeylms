package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"
)

type GlobalLeaderboardEntry struct {
	MenteeID   string
	MenteeName string
	Score      int32
	Rank       int32
}

func (q *Queries) GetGlobalLeaderboard(ctx context.Context) ([]GlobalLeaderboardEntry, error) {
	query := `
		SELECT 
			u.id as mentee_id,
			p.name as mentee_name,
			COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 10 ELSE 0 END), 0)::int as score
		FROM users u
		JOIN user_profiles p ON u.id = p.user_id
		LEFT JOIN assignments a ON u.id = a.mentee_id
		LEFT JOIN assignment_tasks t ON a.id = t.assignment_id
		WHERE u.role = 'mentee'
		GROUP BY u.id, p.name
		ORDER BY score DESC, p.name ASC
	`
	rows, err := q.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []GlobalLeaderboardEntry
	rank := int32(1)
	for rows.Next() {
		var e GlobalLeaderboardEntry
		var menteeUUID pgtype.UUID
		err := rows.Scan(&menteeUUID, &e.MenteeName, &e.Score)
		if err != nil {
			return nil, err
		}

		b := menteeUUID.Bytes
		e.MenteeID = fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
		e.Rank = rank
		entries = append(entries, e)
		rank++
	}
	return entries, nil
}
