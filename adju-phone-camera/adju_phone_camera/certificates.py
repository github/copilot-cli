"""Generate and persist a private local certificate authority for LAN HTTPS."""

from __future__ import annotations

import ipaddress
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID


@dataclass(frozen=True)
class LocalCertificate:
    certificate_path: Path
    private_key_path: Path
    ca_certificate_path: Path
    ca_download_path: Path
    fingerprint: str


def default_certificate_directory() -> Path:
    local_app_data = os.environ.get("LOCALAPPDATA")
    root = Path(local_app_data) if local_app_data else Path.home() / "AppData" / "Local"
    return root / "ADJU PHONE CAMERA" / "certificates"


def _write_private_key(path: Path, key: ec.EllipticCurvePrivateKey) -> None:
    path.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    if os.name != "nt":
        path.chmod(0o600)


def _load_or_create_ca(directory: Path) -> tuple[ec.EllipticCurvePrivateKey, x509.Certificate]:
    key_path = directory / "local-ca-key.pem"
    cert_path = directory / "local-ca-cert.pem"
    if key_path.exists() != cert_path.exists():
        raise RuntimeError(
            f"Local certificate files are incomplete in {directory}; keep or restore both CA files together."
        )

    if key_path.exists():
        key = serialization.load_pem_private_key(key_path.read_bytes(), password=None)
        certificate = x509.load_pem_x509_certificate(cert_path.read_bytes())
        if not isinstance(key, ec.EllipticCurvePrivateKey):
            raise RuntimeError("The saved local certificate authority key has an unsupported type.")
        if key.public_key().public_numbers() != certificate.public_key().public_numbers():
            raise RuntimeError("The saved local certificate authority key does not match its certificate.")
        return key, certificate

    key = ec.generate_private_key(ec.SECP256R1())
    subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "ADJU PHONE CAMERA Local CA")])
    now = datetime.now(timezone.utc)
    certificate = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=5))
        .not_valid_after(now + timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False)
        .add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(key.public_key()),
            critical=False,
        )
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=True,
                crl_sign=True,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .sign(key, hashes.SHA256())
    )
    _write_private_key(key_path, key)
    cert_path.write_bytes(certificate.public_bytes(serialization.Encoding.PEM))
    return key, certificate


def create_local_certificate(directory: Path, lan_ip: str) -> LocalCertificate:
    """Create/load a local CA and issue a TLS certificate for the current LAN IP."""
    address = ipaddress.ip_address(lan_ip)
    if not isinstance(address, ipaddress.IPv4Address) or address.is_loopback or address.is_unspecified:
        raise ValueError(f"A reachable private IPv4 address is required for phone HTTPS: {lan_ip}")
    directory.mkdir(parents=True, exist_ok=True)
    ca_key, ca_certificate = _load_or_create_ca(directory)

    server_key = ec.generate_private_key(ec.SECP256R1())
    now = datetime.now(timezone.utc)
    subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, str(address))])
    certificate = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(ca_certificate.subject)
        .public_key(server_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=5))
        .not_valid_after(now + timedelta(days=90))
        .add_extension(
            x509.SubjectAlternativeName(
                [
                    x509.IPAddress(address),
                    x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
                    x509.DNSName("localhost"),
                ]
            ),
            critical=False,
        )
        .add_extension(
            x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]),
            critical=False,
        )
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(server_key.public_key()), critical=False)
        .add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()),
            critical=False,
        )
        .sign(ca_key, hashes.SHA256())
    )
    cert_path = directory / "server-cert.pem"
    key_path = directory / "server-key.pem"
    _write_private_key(key_path, server_key)
    cert_path.write_bytes(certificate.public_bytes(serialization.Encoding.PEM))

    ca_download = directory / "phone-trust.cer"
    ca_download.write_bytes(ca_certificate.public_bytes(serialization.Encoding.DER))
    fingerprint = ca_certificate.fingerprint(hashes.SHA256()).hex().upper()
    fingerprint = ":".join(fingerprint[index : index + 2] for index in range(0, len(fingerprint), 2))
    return LocalCertificate(
        certificate_path=cert_path,
        private_key_path=key_path,
        ca_certificate_path=directory / "local-ca-cert.pem",
        ca_download_path=ca_download,
        fingerprint=fingerprint,
    )
