import os
import sys

import pytest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.models import db as db_module


@pytest.fixture
def tmp_db(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test_orchestrator.db")
    monkeypatch.setattr(db_module, "DB_PATH", db_path)
    yield db_path
