# Gangwon Business Portal - Backend

Backend API server for the Gangwon Business Portal built with FastAPI.

## Project Structure

```
backend/
├── src/
│   ├── common/
│   │   └── modules/
│   │       ├── config/      # Environment configuration
│   │       ├── db/          # Database session management
│   │       ├── logger/      # Logging configuration
│   │       ├── exception/   # Exception handlers
│   │       └── storage/    # File storage service
│   ├── modules/
│   │   ├── user/           # Authentication module
│   │   ├── member/         # Member management module
│   │   ├── performance/    # Performance module
│   │   ├── project/        # Project module
│   │   ├── content/        # Content management module
│   │   └── support/        # Support module (FAQ, inquiries)
│   └── main.py             # FastAPI application entry point
├── tests/                  # Test files
├── alembic/                # Database migrations
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Setup

### 1. Create Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update with your configuration:

```bash
cp .env.example .env
```

Required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase anon key
- `SECRET_KEY`: JWT secret key (generate a secure random string)

### 4. Database Setup

**Important:** Database setup requires configuring Supabase and environment variables first.

For detailed setup instructions, see: [DATABASE_SETUP.md](../docs/DATABASE_SETUP.md)

**Quick Start:**

```bash
# 1. Copy environment template
copy .env.example .env  # Windows
# or
cp .env.example .env    # Linux/Mac

# 2. Edit .env and configure:
#    - DATABASE_URL (from Supabase)
#    - SUPABASE_URL
#    - SUPABASE_KEY
#    - SECRET_KEY (generate with: openssl rand -hex 32)

# 3. Generate and apply migrations
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

See [DATABASE_SETUP.md](../docs/DATABASE_SETUP.md) for complete configuration guide.

### 5. Run Development Server

```bash
# Using uvicorn directly (without reload for production/testing)
uvicorn src.main:app --host 0.0.0.0 --port 8000

# Or using Python (reload is disabled in code)
python -m src.main
```

The API will be available at `http://localhost:8000`

API documentation:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Health Checks

- Health check: `GET /healthz`
- Readiness check: `GET /readyz`

## Development

### Code Style

- Follow PEP 8 style guide
- Use type hints for all functions
- Add docstrings for modules, classes, and functions

### Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html
```

## API Structure

The API follows RESTful conventions:

- `POST /api/auth/*` - Authentication endpoints
- `GET /api/member/*` - Member self-service endpoints
- `GET /api/admin/members/*` - Admin member management
- `GET /api/performance/*` - Performance data endpoints
- `GET /api/projects/*` - Project endpoints
- `GET /api/notices/*` - Notice endpoints
- `POST /api/upload/*` - File upload endpoints

## Database

The project uses PostgreSQL with SQLAlchemy ORM and Alembic for migrations.

### Creating Migrations

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description"

# Create empty migration
alembic revision -m "Description"
```

### Applying Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

## File Storage

File uploads are handled through Supabase Storage. The storage service supports:

- Public file uploads (banners, notices)
- Private file uploads (performance attachments, member certificates)
- File deletion

## Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation with Pydantic
- SQL injection protection (SQLAlchemy ORM)

## License

See LICENSE file in project root.
