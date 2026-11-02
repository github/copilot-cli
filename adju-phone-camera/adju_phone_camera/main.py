"""Command-line entry point."""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

from .app import run_app


def main() -> None:
    parser = argparse.ArgumentParser(description="Use an Android or iPhone camera as a local PC webcam preview.")
    parser.add_argument("--port", type=int, default=8765, help="Local web and signaling port (default: 8765)")
    parser.add_argument("--tls-cert", type=Path, help="PEM certificate for trusted local HTTPS")
    parser.add_argument("--tls-key", type=Path, help="PEM private key matching --tls-cert")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    args = parser.parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level), format="%(asctime)s %(levelname)s %(message)s")

    if not 1024 <= args.port <= 65535:
        parser.error("--port must be between 1024 and 65535.")
    if (args.tls_cert is None) != (args.tls_key is None):
        parser.error("--tls-cert and --tls-key must be supplied together.")
    for label, path in (("--tls-cert", args.tls_cert), ("--tls-key", args.tls_key)):
        if path is not None and not path.is_file():
            parser.error(f"{label} file does not exist: {path}")
    run_app(args.port, args.tls_cert, args.tls_key)


if __name__ == "__main__":
    main()
