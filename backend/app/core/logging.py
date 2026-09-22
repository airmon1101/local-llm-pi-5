"""Logging configuration optimized for journald on Ubuntu Server 24.04."""

import logging
import sys


def setup_logging(debug: bool = False) -> logging.Logger:
    """Configure lightweight logging to standard output for journald capture."""
    level = logging.DEBUG if debug else logging.INFO

    # Custom compact formatter to avoid inflating log size on MicroSD
    log_format = "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    logging.basicConfig(
        level=level,
        format=log_format,
        datefmt=date_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

    logger = logging.getLogger("pillm")
    logger.setLevel(level)

    # Silence verbose third-party loggers
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)

    return logger


logger = setup_logging()
