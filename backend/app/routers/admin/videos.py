from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import Video
from ...schemas import ReorderIn, VideoIn, VideoOut
from .common import check_reorder_ids, get_or_404

router = APIRouter()


def _all_videos(db: Session) -> list[Video]:
    return list(db.scalars(select(Video).order_by(Video.sort_order, Video.id)))


@router.get("/videos", response_model=list[VideoOut])
def list_videos(db: Session = Depends(get_db)) -> list[Video]:
    return _all_videos(db)


@router.post("/videos", response_model=VideoOut, status_code=status.HTTP_201_CREATED)
def create_video(payload: VideoIn, db: Session = Depends(get_db)) -> Video:
    last = db.scalar(select(func.max(Video.sort_order)))
    video = Video(**payload.model_dump(), sort_order=(last if last is not None else -1) + 1)
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


@router.put("/videos/{video_id}", response_model=VideoOut)
def update_video(video_id: int, payload: VideoIn, db: Session = Depends(get_db)) -> Video:
    video = get_or_404(db, Video, video_id, "Video")
    video.title = payload.title
    video.url = payload.url
    db.commit()
    db.refresh(video)
    return video


@router.delete("/videos/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(video_id: int, db: Session = Depends(get_db)) -> Response:
    db.delete(get_or_404(db, Video, video_id, "Video"))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/videos/reorder", response_model=list[VideoOut])
def reorder_videos(payload: ReorderIn, db: Session = Depends(get_db)) -> list[Video]:
    videos = {video.id: video for video in _all_videos(db)}
    check_reorder_ids(payload.ids, set(videos))
    for position, video_id in enumerate(payload.ids):
        videos[video_id].sort_order = position
    db.commit()
    return _all_videos(db)
