package response

import (
	"encoding/json"
	"net/http"
)

type APIResponse struct {
	Data interface{} `json:"data,omitempty"`
	Meta interface{} `json:"meta,omitempty"`
}

type APIError struct {
	Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func JSONResponse(w http.ResponseWriter, status int, data interface{}, meta interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	response := APIResponse{
		Data: data,
		Meta: meta,
	}

	json.NewEncoder(w).Encode(response)
}

func JSONError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	response := APIError{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	}

	json.NewEncoder(w).Encode(response)
}
