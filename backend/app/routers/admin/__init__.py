"""Admin dashboard endpoints. Every route here requires a signed-in admin."""

from fastapi import APIRouter, Depends

from ...security import get_current_admin
from . import content, dashboard, orders, products, settings, videos

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])
for module in (dashboard, products, orders, content, videos, settings):
    router.include_router(module.router)
