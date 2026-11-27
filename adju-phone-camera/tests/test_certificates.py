import ipaddress
from pathlib import Path

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives import serialization

from adju_phone_camera.certificates import create_local_certificate


def test_local_certificate_has_lan_ip_san_and_private_ca_download(tmp_path: Path):
    material = create_local_certificate(tmp_path, "192.168.1.25")
    certificate = x509.load_pem_x509_certificate(material.certificate_path.read_bytes())
    authority = x509.load_pem_x509_certificate(material.ca_certificate_path.read_bytes())
    downloaded_authority = x509.load_der_x509_certificate(material.ca_download_path.read_bytes())

    san = certificate.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    constraints = authority.extensions.get_extension_for_class(x509.BasicConstraints).value
    private_key = serialization.load_pem_private_key(material.private_key_path.read_bytes(), password=None)

    assert san.get_values_for_type(x509.IPAddress) == [
        ipaddress.ip_address("192.168.1.25"),
        ipaddress.ip_address("127.0.0.1"),
    ]
    assert san.get_values_for_type(x509.DNSName) == ["localhost"]
    assert constraints.ca
    assert downloaded_authority.fingerprint(hashes.SHA256()) == authority.fingerprint(hashes.SHA256())
    assert private_key.public_key().public_numbers() == certificate.public_key().public_numbers()
    assert len(material.fingerprint.split(":")) == 32


def test_existing_ca_is_reused_and_loopback_is_not_accepted(tmp_path: Path):
    first = create_local_certificate(tmp_path, "10.0.0.12")
    first_ca = first.ca_certificate_path.read_bytes()
    second = create_local_certificate(tmp_path, "10.0.0.15")
    second_server = x509.load_pem_x509_certificate(second.certificate_path.read_bytes())

    assert second.ca_certificate_path.read_bytes() == first_ca
    assert second.fingerprint == first.fingerprint
    assert second_server.extensions.get_extension_for_class(x509.SubjectAlternativeName).value.get_values_for_type(
        x509.IPAddress
    )[0] == ipaddress.ip_address("10.0.0.15")
    with pytest.raises(ValueError, match="private IPv4 address"):
        create_local_certificate(tmp_path, "127.0.0.1")


def test_incomplete_ca_files_are_reported(tmp_path: Path):
    (tmp_path / "local-ca-key.pem").write_bytes(b"partial")

    with pytest.raises(RuntimeError, match="incomplete"):
        create_local_certificate(tmp_path, "192.168.1.10")
