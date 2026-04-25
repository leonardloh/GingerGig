from fastapi import APIRouter, HTTPException, Query, WebSocket

from app.db.session import get_sessionmaker
from app.deps.auth import get_current_user_ws
from app.services.persona_queries import require_role
from app.services.voice_service import STREAMING_CLOSE_AUTH, run_streaming_session

router = APIRouter(prefix="/voice-to-profile", tags=["voice"])


@router.websocket("/stream")
async def stream_voice_to_profile(
    websocket: WebSocket,
    token: str | None = Query(default=None),
) -> None:
    """Streaming voice endpoint documented for Phase 5 as `?token=<JWT>`."""
    await websocket.accept()

    sm = get_sessionmaker(websocket.app.state.engine)
    async with sm() as db:
        try:
            user = await get_current_user_ws(token, db)
            require_role(user, "elder")
        except HTTPException:
            await websocket.close(code=STREAMING_CLOSE_AUTH)
            return

        await run_streaming_session(websocket, user, db)
