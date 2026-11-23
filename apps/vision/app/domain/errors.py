class VisionError(Exception):
    reason_code = "INTERNAL_ERROR"


class CameraBusyError(VisionError):
    reason_code = "CAMERA_BUSY"


class CaptureTimeoutError(VisionError):
    reason_code = "SESSION_EXPIRED"


class InvalidReferenceError(VisionError):
    reason_code = "NO_FACE_PROFILE"


class IncompatibleReferenceError(VisionError):
    reason_code = "INTERNAL_ERROR"


class ModelUnavailableError(VisionError):
    reason_code = "INTERNAL_ERROR"
