from app.db.database import Base, engine
# Import models so metadata is registered before creating tables
import app.models.models  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
