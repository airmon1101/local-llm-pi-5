"""Custom domain exceptions for PiLLM."""


class PiLLMException(Exception):
    """Base exception for PiLLM application errors."""

    def __init__(self, message: str, status_code: int = 500, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class OllamaServiceUnavailableError(PiLLMException):
    """Raised when Ollama daemon is unreachable."""

    def __init__(self, message: str = "Ollama service is not running or unreachable on localhost:11434"):
        super().__init__(message=message, status_code=503)


class ModelNotFoundError(PiLLMException):
    """Raised when the specified model is not installed in Ollama."""

    def __init__(self, model_name: str):
        super().__init__(
            message=f"Model '{model_name}' is not installed in Ollama. Pull it with: ollama pull {model_name}",
            status_code=404,
            details={"model": model_name}
        )


class StorageCapacityCriticalError(PiLLMException):
    """Raised when MicroSD free storage is critically low."""

    def __init__(self, free_percent: float, free_gb: float):
        super().__init__(
            message=f"MicroSD storage is critically low ({free_percent:.1f}% / {free_gb:.2f}GB remaining). Halting writes to protect system stability.",
            status_code=507,
            details={"free_percent": free_percent, "free_gb": free_gb}
        )


class ConversationNotFoundError(PiLLMException):
    """Raised when conversation ID does not exist."""

    def __init__(self, chat_id: str):
        super().__init__(
            message=f"Conversation '{chat_id}' not found.",
            status_code=404,
            details={"chat_id": chat_id}
        )
