package repository

import (
	"context"
)

type UserWithProfileRow struct {
	User
	Name string
}

const listUsersByRole = `
SELECT u.id, u.email, u.password_hash, u.role, u.created_at, u.updated_at, u.deleted_at, 
       COALESCE(p.name, '') as name
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE u.role = $1 AND u.deleted_at IS NULL
ORDER BY u.created_at DESC
`

func (q *Queries) ListUsersByRole(ctx context.Context, role UserRole) ([]UserWithProfileRow, error) {
	rows, err := q.db.Query(ctx, listUsersByRole, role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []UserWithProfileRow
	for rows.Next() {
		var i UserWithProfileRow
		if err := rows.Scan(
			&i.ID,
			&i.Email,
			&i.PasswordHash,
			&i.Role,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.DeletedAt,
			&i.Name,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}
