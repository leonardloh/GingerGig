from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database (D-22)
    database_url: str = Field(..., description="postgresql+asyncpg://... DSN")
    database_ssl_mode: str = Field(default="require")

    # Auth (Phase 2 fills; Phase 1 just validates length)
    jwt_secret: str = Field(..., min_length=32)

    # CORS (FOUND-03 — allowlist, never "*")
    cors_origins_csv: str = Field(default="http://localhost:5173")
    enable_test_routes: bool = Field(default=False)

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_csv.split(",") if o.strip()]

    # AWS (Phase 4-5 use; Phase 1 declares so .env.example is complete)
    aws_region: str = Field(default="ap-southeast-1")
    aws_access_key_id: str = Field(default="")
    aws_secret_access_key: str = Field(default="")
    aws_session_token: str = Field(default="")
    s3_kyc_bucket: str = Field(default="")
    s3_audio_bucket: str = Field(default="")
    s3_transcribe_output_prefix: str = Field(default="transcribe-output")

    # DashScope / Qwen
    dashscope_api_key: str = Field(default="")
    dashscope_base_url: str = Field(
        default="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    )
    dashscope_chat_model: str = Field(default="qwen-max")

    # Alibaba OSS
    oss_region: str = Field(default="ap-southeast-3")
    oss_access_key_id: str = Field(default="")
    oss_access_key_secret: str = Field(default="")
    oss_bucket: str = Field(default="")
    oss_endpoint: str = Field(default="")


settings = Settings()  # module-level singleton
